import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { marketplaceService } from '../../services/marketplace.service';
import { useFavorites } from '../../hooks/useFavorites';
import { useCart } from '../../hooks/useCart';
import { resolveImageUrl } from '../../utils/imageUrl';
import type { Voucher } from '../../types';

const PAGE_SIZE = 30;

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

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
  const navigate = useNavigate();
  const imgSrc = resolveImageUrl(voucher.images?.[0]);

  return (
    <div
      className="voucher-card-carousel"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/catalogue/offre/${voucher.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/catalogue/offre/${voucher.id}`); }}
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
        <button
          className={`btn-bookmark ${saved ? 'btn-bookmark--saved' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(voucher.id); }}
          aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <IconHeart filled={saved} />
        </button>
      </div>
      <p className="voucher-card-carousel-title">{voucher.title}</p>
      <div className="voucher-card-carousel-footer" style={{ justifyContent: 'flex-end' }}>
        {promoCode ? (
          <span className="promo-code" style={{ fontSize: '0.72rem', marginRight: 'auto' }}>{promoCode}</span>
        ) : !voucher.available ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto' }}>Indisponible</span>
        ) : null}
        <span className="token-badge">{voucher.token_cost}</span>
      </div>
    </div>
  );
}

export default function CategorieDetail() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();

  const backBtnRef = useRef<HTMLButtonElement>(null);
  const [backBtnHovered, setBackBtnHovered] = useState(false);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const decodedCategory = category ? decodeURIComponent(category) : '';

  useEffect(() => {
    if (backBtnRef.current) {
      backBtnRef.current.style.setProperty('background-color', backBtnHovered ? 'rgba(255, 255, 255, 0.15)' : 'transparent', 'important');
      backBtnRef.current.style.setProperty('color', '#ffffff', 'important');
      backBtnRef.current.style.setProperty('border-color', '#ffffff', 'important');
      backBtnRef.current.style.setProperty('margin-left', 'auto', 'important');
    }
  }, [backBtnHovered, loading]);

  const displayName = decodedCategory.charAt(0).toUpperCase() + decodedCategory.slice(1);

  useEffect(() => {
    marketplaceService.getItems()
      .then((all) => {
        const filtered = all
          .filter((v) => v.category === decodedCategory)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setVouchers(filtered);
      })
      .finally(() => setLoading(false));
    setPage(1);
  }, [decodedCategory]);

  async function handleRedeem(voucher: Voucher) {
    setError('');
    setRedeeming(voucher.id);
    try {
      const { promo_code } = await marketplaceService.redeem(voucher.id);
      setPromoCodes((p) => ({ ...p, [voucher.id]: promo_code }));
      setVouchers((vs) => vs.map((v) => v.id === voucher.id ? { ...v, available: false } : v));
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

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const balance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);
  const totalPages = Math.max(1, Math.ceil(vouchers.length / PAGE_SIZE));
  const pageVouchers = vouchers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>{displayName}</h1>
          <p style={{ margin: 0 }}>{vouchers.length} offre{vouchers.length !== 1 ? 's' : ''} disponible{vouchers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          ref={backBtnRef}
          className="back-btn"
          onClick={() => navigate('/catalogue')}
          onMouseEnter={() => setBackBtnHovered(true)}
          onMouseLeave={() => setBackBtnHovered(false)}
        >
          <IconChevronLeft /> Retour
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      {pageVouchers.length === 0 ? (
        <p className="empty-state">Aucune offre dans cette catégorie.</p>
      ) : (
        <div className="grid-3">
          {pageVouchers.map((v) => (
            <VoucherCard
              key={v.id}
              voucher={v}
              onRedeem={handleRedeem}
              redeeming={redeeming === v.id}
              promoCode={promoCodes[v.id]}
              canAfford={balance >= v.token_cost}
              saved={isFavorite(v.id)}
              onToggle={toggle}
              inCart={isInCart(v.id)}
              onCartToggle={cartToggle}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === 1}
            onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Page {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === totalPages}
            onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
