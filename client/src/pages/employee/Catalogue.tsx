/**
 * pages/employee/Catalogue.tsx — Main marketplace page for browsing and redeeming vouchers.
 *
 * Default view shows a "Populaires" carousel (up to 20 items ranked by favorite_count then
 * recency) followed by one carousel per category present in the catalogue. Each category row
 * links to a CategorieDetail page for the full paginated list.
 *
 * When a search query or category filter is active, the carousels are replaced by a flat grid
 * of matching vouchers. The search input displays partner name auto-completion suggestions
 * (up to 6, filtered by prefix). Suggestions are dismissed on outside click or Escape.
 *
 * Admins see a "Modifier" button on each card that navigates to the admin voucher detail editor.
 * All other users see favorite and cart toggles. On redemption, the user/company balance is
 * refreshed via AuthContext.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { marketplaceService } from '../../services/marketplace.service';
import { useFavorites } from '../../hooks/useFavorites';
import { useCart } from '../../hooks/useCart';
import { resolveImageUrl } from '../../utils/imageUrl';
import { VOUCHER_CATEGORIES } from '../../types';
import type { Voucher } from '../../types';
import { getCategory, getCategoryColor } from '../../utils/category';

/* ── Icons ── */
function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/* ── Voucher card ── */
function VoucherCard({
  voucher, onRedeem, redeeming, promoCode, canAfford, saved, onToggle, inCart, onCartToggle, onEdit,
}: {
  voucher: Voucher;
  onRedeem: (v: Voucher) => void;
  redeeming: boolean;
  promoCode?: string;
  canAfford: boolean;
  saved: boolean;
  onToggle: (id: string) => void;
  inCart: boolean;
  onCartToggle: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const imgSrc = resolveImageUrl(voucher.images?.[0]);

  function openDetail() {
    if (onEdit) navigate(`/admin/bons/${voucher.id}`);
    else navigate(`/catalogue/offre/${voucher.id}`);
  }

  const catColor = getCategoryColor(getCategory(voucher));

  return (
    <div
      className="voucher-card-carousel"
      style={{ cursor: 'pointer', backgroundColor: catColor.light }}
      onClick={openDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') openDetail(); }}
    >
      {imgSrc ? (
        <div className="voucher-card-image">
          <img src={imgSrc} alt={voucher.partner} />
        </div>
      ) : (
        <div className="voucher-card-image voucher-card-image--placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
      <div className="voucher-card-carousel-top">
        <div className="voucher-card-partner">{voucher.partner}</div>
        {!onEdit && (
          <button
            className={`btn-bookmark ${saved ? 'btn-bookmark--saved' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(voucher.id); }}
            aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <IconHeart filled={saved} />
          </button>
        )}
      </div>
      <p className="voucher-card-carousel-title">{voucher.title}</p>
      <div className="voucher-card-carousel-footer" style={{ justifyContent: 'flex-end' }}>
        {onEdit ? (
          <button className="btn btn-outline btn-sm" style={{ marginRight: 'auto' }} onClick={(e) => { e.stopPropagation(); onEdit(voucher.id); }}>
            Modifier
          </button>
        ) : promoCode ? (
          <span className="promo-code" style={{ fontSize: '0.72rem', marginRight: 'auto' }}>{promoCode}</span>
        ) : !voucher.available ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto' }}>Indisponible</span>
        ) : null}
        <span className="token-badge">{voucher.token_cost}</span>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function Catalogue() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'employee' || user?.role === 'employer';
  const handleEdit = isAdmin ? (id: string) => navigate(`/admin/bons/${id}`) : undefined;
  
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  type SortOption = 'populaires' | 'recent' | 'prix-croissant' | 'prix-decroissant';
  const [sortBy, setSortBy] = useState<SortOption>('populaires');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const sortWrapperRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    marketplaceService.getItems()
      .then((items) => setVouchers(Array.isArray(items) ? items : []))
      .catch((err) => {
        console.error(err);
        setVouchers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  /* Ferme les dropdowns si clic en dehors */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (sortWrapperRef.current && !sortWrapperRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Réinitialise la page lors d'un changement de filtre */
  useEffect(() => {
    setPage(1);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [search, activeCategory]);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    if (!width) return; // Évite la division par zéro / NaN
    // Ajoute une petite tolérance pour éviter les sauts au début
    const newPage = Math.round(scrollLeft / width) + 1;
    if (!isNaN(newPage) && newPage !== page) setPage(newPage);
  };

  const scrollToPage = (p: number) => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({ left: (p - 1) * width, behavior: 'smooth' });
  };

  const applySuggestion = useCallback((partner: string) => {
    setSearch(partner);
    setShowSuggestions(false);
  }, []);

  async function handleRedeem(voucher: Voucher) {
    setError('');
    setRedeeming(voucher.id);
    try {
      const { promo_code } = await marketplaceService.redeem(voucher.id);
      setPromoCodes((prev) => ({ ...prev, [voucher.id]: promo_code }));
      setVouchers((prev) => prev.map((v) => v.id === voucher.id ? { ...v, available: false } : v));
      if (user?.role === 'employer') {
        await refreshCompany();
      } else {
        await refreshUser();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erreur lors du rachat.');
    } finally {
      setRedeeming(null);
    }
  }

  const userBalance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);

  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  const presentCategories = Array.from(new Set(safeVouchers.map((v) => getCategory(v))));
  const orderedCategories = [
    ...VOUCHER_CATEGORIES
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .filter((c) => presentCategories.includes(c)),
    ...presentCategories.filter(
      (c) => !VOUCHER_CATEGORIES.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).includes(c)
    ),
  ];

  const searchLower = search.toLowerCase();

  /* Suggestions : partenaires dont le nom commence par le texte saisi */
  const partnerSuggestions = search.trim().length > 0
    ? Array.from(new Set(safeVouchers.map((v) => v.partner)))
        .filter((p) => p && p.toLowerCase().startsWith(searchLower))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6)
    : [];

  const showSearch = !!search || !!activeCategory;

  const itemsToDisplay = useMemo(() => {
    const filtered = safeVouchers.filter((v) => {
      const matchSearch = !search ||
        (v.partner || '').toLowerCase().includes(searchLower) ||
        (v.title || '').toLowerCase().includes(searchLower);
      const matchCat = !activeCategory || getCategory(v) === activeCategory;
      return matchSearch && matchCat;
    });

    const baseItems = showSearch ? filtered : safeVouchers.filter((v) => v.available);

    return [...baseItems].sort((a, b) => {
      if (sortBy === 'populaires') {
        const heartsA = a.favorite_count ?? 0;
        const heartsB = b.favorite_count ?? 0;
        if (heartsB !== heartsA) return heartsB - heartsA;
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'recent') {
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'prix-croissant') {
        return a.token_cost - b.token_cost;
      }
      if (sortBy === 'prix-decroissant') {
        return b.token_cost - a.token_cost;
      }
      return 0;
    });
  }, [vouchers, search, searchLower, activeCategory, sortBy]);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(itemsToDisplay.length / PAGE_SIZE) || 1;
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(itemsToDisplay.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  return (
    <div>
      <div className={`page-header page-header--clean page-header--centered ${isManager ? 'page-header--manager' : ''}`}>
        <h1>Échangez vos tokens contre des bons d'achat</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div ref={searchWrapperRef} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            className="form-input"
            style={{ borderRadius: '999px', paddingLeft: '20px' }}
            type="search"
            placeholder="Rechercher un bon ou un partenaire…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
            autoComplete="off"
          />
          {showSearch && showSuggestions && search.trim().length > 0 && (
            <ul className="search-suggestions">
              {partnerSuggestions.length > 0 ? (
                partnerSuggestions.map((partner) => (
                  <li
                    key={partner}
                    className="search-suggestion-item"
                    onMouseDown={(e) => { e.preventDefault(); applySuggestion(partner); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--text-muted)' }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {partner}
                  </li>
                ))
              ) : (
                <li className="search-suggestion-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                  Aucun partenaire trouvé
                </li>
              )}
            </ul>
          )}
        </div>
        <div ref={sortWrapperRef} className="sort-dropdown-container">
          <button
            type="button"
            className="sort-dropdown-btn"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            <span>
              {sortBy === 'populaires' && 'Trier par : Populaires'}
              {sortBy === 'recent' && 'Trier par : Nouveautés'}
              {sortBy === 'prix-croissant' && 'Trier par : Du moins cher au plus cher'}
              {sortBy === 'prix-decroissant' && 'Trier par : Du plus cher au moins cher'}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: 14,
                height: 14,
                marginLeft: 8,
                transition: 'transform 0.2s',
                transform: showSortDropdown ? 'rotate(180deg)' : 'none',
                color: 'var(--text-muted)'
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showSortDropdown && (
            <ul className="sort-dropdown-list">
              {[
                { value: 'populaires', label: 'Trier par : Populaires' },
                { value: 'recent', label: 'Trier par : Nouveautés' },
                { value: 'prix-croissant', label: 'Trier par : Du moins cher au plus cher' },
                { value: 'prix-decroissant', label: 'Trier par : Du plus cher au moins cher' }
              ].map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`sort-dropdown-item ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy(opt.value as SortOption);
                      setShowSortDropdown(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="category-chips">
        <button
          style={{
            '--cat-light': getCategoryColor('Tous').light,
            '--cat-dark': getCategoryColor('Tous').dark,
          } as React.CSSProperties}
          className={`category-chip-colored ${!activeCategory ? 'active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          Populaires
        </button>
        {orderedCategories.map((cat) => (
          <button
            key={cat}
            style={{
              '--cat-light': getCategoryColor(cat).light,
              '--cat-dark': getCategoryColor(cat).dark,
            } as React.CSSProperties}
            className={`category-chip-colored ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      {itemsToDisplay.length === 0 ? (
        <p className="empty-state">Aucun bon trouvé.</p>
      ) : (
        <>
          <div className="pages-carousel" ref={carouselRef} onScroll={handleScroll}>
            {pages.map((pageVouchers, index) => {
              const pageNum = index + 1;
              // On affiche uniquement la page courante, la précédente et la suivante
              const isVisible = Math.abs(pageNum - page) <= 1;

              return (
                <div className="page-slide" key={index}>
                  {isVisible ? (
                    pageVouchers.map((v) => (
                      <VoucherCard
                        key={v.id}
                        voucher={v}
                        onRedeem={handleRedeem}
                        redeeming={redeeming === v.id}
                        promoCode={promoCodes[v.id]}
                        canAfford={userBalance >= v.token_cost}
                        saved={isFavorite(v.id)}
                        onToggle={toggle}
                        inCart={isInCart(v.id)}
                        onCartToggle={cartToggle}
                        onEdit={handleEdit}
                      />
                    ))
                  ) : (
                    // Placeholder pour maintenir la hauteur et la largeur
                    <div style={{ minHeight: '100vh', width: '100%' }} />
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28, paddingBottom: 28 }}>
              <button
                className="scroll-arrow scroll-arrow--left"
                disabled={page === 1}
                onClick={() => scrollToPage(page - 1)}
                aria-label="Page précédente"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <div className="page-indicator">
                {page} / {totalPages}
              </div>

              <button
                className="scroll-arrow scroll-arrow--right"
                disabled={page === totalPages}
                onClick={() => scrollToPage(page + 1)}
                aria-label="Page suivante"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
