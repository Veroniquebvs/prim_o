import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Voucher } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import { getCategory, getCategoryColor } from '../utils/category';

export function IconHeart({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function VoucherCard({
  voucher, onRedeem, redeeming, promoCode, canAfford, saved, onToggle, inCart, onCartToggle,
}: {
  voucher: Voucher;
  onRedeem?: (v: Voucher) => void;
  redeeming?: boolean;
  promoCode?: string;
  canAfford?: boolean;
  saved: boolean;
  onToggle: (id: string) => void;
  inCart?: boolean;
  onCartToggle?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const imgSrc = resolveImageUrl(voucher.images?.[0]);
  const catColor = getCategoryColor(getCategory(voucher));

  return (
    <div
      className="voucher-card-carousel"
      style={{ cursor: 'pointer', backgroundColor: catColor.light }}
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

export function CarouselRow({
  title, vouchers, onRedeem, redeeming, promoCodes = {}, userBalance, isFavorite, onToggle, isInCart, onCartToggle,
}: {
  title: string;
  vouchers: Voucher[];
  onRedeem?: (v: Voucher) => void;
  redeeming?: string | null;
  promoCodes?: Record<string, string>;
  userBalance?: number;
  isFavorite: (id: string) => boolean;
  onToggle: (id: string) => void;
  isInCart?: (id: string) => boolean;
  onCartToggle?: (id: string) => void;
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
            canAfford={userBalance !== undefined ? userBalance >= v.token_cost : undefined}
            saved={isFavorite(v.id)}
            onToggle={onToggle}
            inCart={isInCart ? isInCart(v.id) : undefined}
            onCartToggle={onCartToggle}
          />
        ))}
      </div>
    </div>
  );
}
