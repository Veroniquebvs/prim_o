import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { marketplaceService } from '../services/marketplace.service';
import { useFavorites } from '../hooks/useFavorites';
import { useCart } from '../hooks/useCart';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Voucher, Redemption } from '../types';
import { fmtShort } from '../utils/date';

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

/* ── Voucher card (carousel) ── */
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
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

/* ── Carousel row ── */
function CarouselRow({
  title, vouchers, onRedeem, redeeming, promoCodes, userBalance, isFavorite, onToggle, isInCart, onCartToggle,
}: {
  title: string;
  vouchers: Voucher[];
  onRedeem: (v: Voucher) => void;
  redeeming: string | null;
  promoCodes: Record<string, string>;
  userBalance: number;
  isFavorite: (id: string) => boolean;
  onToggle: (id: string) => void;
  isInCart: (id: string) => boolean;
  onCartToggle: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  }
  if (vouchers.length === 0) return null;
  return (
    <div className="carousel-section">
      <div className="carousel-header">
        {title ? <h2 className="carousel-title">{title}</h2> : <span />}
        <div className="carousel-controls">
          <button className="carousel-btn" onClick={() => scroll('left')} aria-label="Précédent"><IconChevronLeft /></button>
          <button className="carousel-btn" onClick={() => scroll('right')} aria-label="Suivant"><IconChevronRight /></button>
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
export default function PourToi() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const [vouchers, setVouchers]     = useState<Voucher[]>([]);
  const [orders, setOrders]         = useState<Redemption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [redeeming, setRedeeming]   = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();

  useEffect(() => {
    Promise.all([
      marketplaceService.getItems().then(setVouchers).catch(() => {}),
      marketplaceService.getOrders().then(setOrders).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleRedeem(voucher: Voucher) {
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
    } catch {
      // balance error handled by disabled state
    } finally {
      setRedeeming(null);
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const balance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);

  const available = vouchers.filter((v) => v.available);

  /* Offres du moment : plus favorisées d'abord, puis plus récentes */
  const populaires = [...available]
    .sort((a, b) =>
      (b.favorite_count ?? 0) - (a.favorite_count ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  /* Favoris : featured admin d'abord, puis les plus aimés pour compléter jusqu'à 50 */
  const featured = available.filter((v) => v.is_featured);
  const featuredIds = new Set(featured.map((v) => v.id));
  const heartedFill = available
    .filter((v) => !featuredIds.has(v.id) && (v.favorite_count ?? 0) > 0)
    .sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0));
  const topFavoris = [...featured, ...heartedFill].slice(0, 50);

  /* Offres de la semaine : marquées is_weekly par l'admin, ou ajoutées il y a moins de 7 jours */
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPinned = available.filter((v) => v.is_weekly);
  const weeklyPinnedIds = new Set(weeklyPinned.map((v) => v.id));
  const recentFill = available.filter((v) => !weeklyPinnedIds.has(v.id) && new Date(v.created_at) > sevenDaysAgo);
  const newThisWeek = [
    ...weeklyPinned,
    ...recentFill.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  ];

  const fmt = fmtShort;

  return (
    <div>
      <div className="page-header page-header--centered">
        <h1>Tes offres et tes bons d'achat</h1>
      </div>

      {/* Carousel offres du moment */}
      <CarouselRow
        title="Offres du moment"
        vouchers={populaires}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Favoris globaux */}
      <CarouselRow
        title="❤️ Favoris"
        vouchers={topFavoris}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Offres de la semaine */}
      <CarouselRow
        title="🆕 Les offres de la semaine"
        vouchers={newThisWeek}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Bons déjà achetés */}
      <div style={{ marginTop: 28 }}>
        <h2 className="carousel-title" style={{ marginBottom: 12 }}>Mes bons d'achat</h2>
        {orders.length === 0 ? (
          <div className="card">
            <p className="empty-state">Tu n'as pas encore racheté de bon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((order) => (
              <div key={order.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>
                    {order.voucher?.partner ?? '—'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {order.voucher?.title ?? '—'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {fmt(order.redeemed_at)}
                  </p>
                </div>
                <span className="promo-code" style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                  {order.promo_code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
