import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { marketplaceService } from '../../services/marketplace.service';
import { useFavorites } from '../../hooks/useFavorites';
import { useCart } from '../../hooks/useCart';
import { VOUCHER_CATEGORIES } from '../../types';
import type { Voucher } from '../../types';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const CAROUSEL_MAX = 20;

function getCategory(v: Voucher): string {
  return v.category
    ? v.category.charAt(0).toUpperCase() + v.category.slice(1)
    : 'Autres';
}

/* Sélectionne jusqu'à `max` offres : d'abord les plus aimées, puis les plus récentes */
function pickCarouselItems(items: Voucher[], max = CAROUSEL_MAX): Voucher[] {
  const withHearts = items
    .filter((v) => (v.favorite_count ?? 0) > 0)
    .sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0));

  if (withHearts.length >= max) return withHearts.slice(0, max);

  const usedIds = new Set(withHearts.map((v) => v.id));
  const recentFill = items
    .filter((v) => !usedIds.has(v.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, max - withHearts.length);

  return [...withHearts, ...recentFill];
}

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
function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/* ── Voucher card ── */
function VoucherCard({
  voucher, onRedeem, redeeming, promoCode, canAfford, saved, onToggle, inCart, onCartToggle,
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
}) {
  return (
    <div className="voucher-card-carousel">
      {voucher.images?.[0] ? (
        <div className="voucher-card-image">
          <img src={`${API_URL}${voucher.images[0]}`} alt={voucher.partner} />
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
        <button
          className={`btn-bookmark ${saved ? 'btn-bookmark--saved' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(voucher.id); }}
          aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <IconHeart filled={saved} />
        </button>
      </div>
      <p className="voucher-card-carousel-title">{voucher.title}</p>
      <div className="voucher-card-carousel-footer">
        <span className="token-badge">{voucher.token_cost}</span>
        {promoCode ? (
          <span className="promo-code" style={{ fontSize: '0.72rem' }}>{promoCode}</span>
        ) : !voucher.available ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Indisponible</span>
        ) : canAfford ? (
          <button className="btn btn-primary btn-sm" disabled={redeeming} onClick={() => onRedeem(voucher)}>
            {redeeming ? '…' : 'Racheter'}
          </button>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            style={inCart ? { background: 'var(--primary-light)', fontWeight: 700 } : {}}
            onClick={(e) => { e.stopPropagation(); onCartToggle(voucher.id); }}
          >
            {inCart ? '✓ Sauvé' : '+ Panier'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Carousel row ── */
function CarouselRow({
  title, vouchers, onRedeem, redeeming, promoCodes, userBalance, isFavorite, onToggle, categorySlug, isInCart, onCartToggle,
}: {
  title: string;
  vouchers: Voucher[];
  onRedeem: (v: Voucher) => void;
  redeeming: string | null;
  promoCodes: Record<string, string>;
  userBalance: number;
  isFavorite: (id: string) => boolean;
  onToggle: (id: string) => void;
  categorySlug?: string;
  isInCart: (id: string) => boolean;
  onCartToggle: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  }

  if (vouchers.length === 0) return null;

  return (
    <div className="carousel-section">
      <div className="carousel-header">
        <h2 className="carousel-title">{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {categorySlug && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/catalogue/categorie/${encodeURIComponent(categorySlug)}`)}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              Plus d'offres
            </button>
          )}
          <div className="carousel-controls">
            <button className="carousel-btn" onClick={() => scroll('left')} aria-label="Précédent">
              <IconChevronLeft />
            </button>
            <button className="carousel-btn" onClick={() => scroll('right')} aria-label="Suivant">
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>
      <div className="carousel-track" ref={scrollRef}>
        {vouchers.map((v) => (
          <VoucherCard
            key={v.id}
            voucher={v}
            onRedeem={onRedeem}
            redeeming={redeeming === v.id}
            promoCode={promoCodes[v.id]}
            canAfford={userBalance >= v.token_cost}
            saved={isFavorite(v.id)}
            onToggle={onToggle}
            inCart={isInCart(v.id)}
            onCartToggle={onCartToggle}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function Catalogue() {
  const { user, refreshUser } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    marketplaceService.getItems().then(setVouchers).finally(() => setLoading(false));
  }, []);

  /* Ferme le dropdown si clic en dehors */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      await refreshUser();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erreur lors du rachat.');
    } finally {
      setRedeeming(null);
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const userBalance = user?.token_balance ?? 0;

  const presentCategories = Array.from(new Set(vouchers.map((v) => getCategory(v))));
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
    ? Array.from(new Set(vouchers.map((v) => v.partner)))
        .filter((p) => p.toLowerCase().startsWith(searchLower))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6)
    : [];

  const filtered = vouchers.filter((v) => {
    const matchSearch = !search ||
      v.partner.toLowerCase().includes(searchLower) ||
      v.title.toLowerCase().includes(searchLower);
    const matchCat = !activeCategory || getCategory(v) === activeCategory;
    return matchSearch && matchCat;
  });

  /* "Populaires" : 20 offres max, sélectionnées par cœurs puis récence */
  const populaires = pickCarouselItems(
    vouchers.filter((v) => v.available),
    CAROUSEL_MAX
  );

  const showSearch = !!search || !!activeCategory;

  return (
    <div>
      <div className="page-header">
        <h1>Catalogue</h1>
        <p>Échangez vos tokens contre des bons d'achat</p>
      </div>

      <div ref={searchWrapperRef} style={{ marginBottom: 14, position: 'relative' }}>
        <input
          className="form-input"
          type="search"
          placeholder="Rechercher un bon ou un partenaire…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
          autoComplete="off"
        />
        {showSuggestions && partnerSuggestions.length > 0 && (
          <ul className="search-suggestions">
            {partnerSuggestions.map((partner) => (
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
            ))}
          </ul>
        )}
      </div>

      <div className="category-chips">
        <button
          className={`category-chip ${!activeCategory ? 'category-chip--active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          Tous
        </button>
        {orderedCategories.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${activeCategory === cat ? 'category-chip--active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      {showSearch ? (
        filtered.length === 0 ? (
          <p className="empty-state">Aucun bon trouvé.</p>
        ) : (
          <div className="grid-3">
            {filtered.map((v) => (
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
              />
            ))}
          </div>
        )
      ) : (
        <>
          <CarouselRow
            title="⭐ Populaires"
            vouchers={populaires}
            onRedeem={handleRedeem}
            redeeming={redeeming}
            promoCodes={promoCodes}
            userBalance={userBalance}
            isFavorite={isFavorite}
            onToggle={toggle}
            isInCart={isInCart}
            onCartToggle={cartToggle}
          />
          {orderedCategories.map((cat) => {
            const catVouchers = vouchers.filter((v) => getCategory(v) === cat && v.available);
            const slug = cat.toLowerCase();
            return (
              <CarouselRow
                key={cat}
                title={cat}
                vouchers={pickCarouselItems(catVouchers, CAROUSEL_MAX)}
                onRedeem={handleRedeem}
                redeeming={redeeming}
                promoCodes={promoCodes}
                userBalance={userBalance}
                isFavorite={isFavorite}
                onToggle={toggle}
                categorySlug={slug}
                isInCart={isInCart}
                onCartToggle={cartToggle}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
