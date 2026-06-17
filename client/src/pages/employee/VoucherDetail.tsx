/**
 * pages/employee/VoucherDetail.tsx — Full-page detail view for a single voucher.
 *
 * Fetches the voucher by the :id route param. If not found, shows a 404-style message.
 * Displays the partner image (if available), title, category chip, token cost, user balance,
 * and availability status. Authenticated users can redeem directly on this page or toggle the
 * item in/out of their cart. Favorite toggle is also available.
 *
 * After redemption the promo code is displayed in a highlighted block, the voucher's available
 * flag is set to false, and the balance is refreshed via AuthContext.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { marketplaceService } from '../../services/marketplace.service';
import { useFavorites } from '../../hooks/useFavorites';
import { useCart } from '../../hooks/useCart';
import { resolveImageUrl } from '../../utils/imageUrl';
import type { Voucher } from '../../types';

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 18, height: 18 }}>
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

export default function VoucherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    marketplaceService.getItemById(id)
      .then(setVoucher)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRedeem() {
    if (!voucher) return;
    setError('');
    setRedeeming(true);
    try {
      const { promo_code } = await marketplaceService.redeem(voucher.id);
      setPromoCode(promo_code);
      setVoucher((v) => (v ? { ...v, available: false } : v));
      if (user?.role === 'employer') {
        await refreshCompany();
      } else {
        await refreshUser();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erreur lors du rachat.');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  if (notFound || !voucher) {
    return (
      <div>
        <style>{`
          .page-header .back-btn {
            position: absolute !important;
            right: 24px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background-color: transparent !important;
            color: white !important;
            border-color: white !important;
          }
          @media (min-width: 768px) {
            .page-header .back-btn {
              right: 32px !important;
            }
          }
          @media (min-width: 1024px) {
            .page-header .back-btn {
              right: 40px !important;
            }
          }
          .page-header .back-btn:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
          }
        `}</style>
        <div className="page-header">
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h1>Offre introuvable</h1>
          </div>
          <button className="back-btn" onClick={() => navigate('/catalogue')}>
            <IconChevronLeft /> Retour
          </button>
        </div>
        <p className="empty-state">Ce bon d'achat n'existe plus.</p>
      </div>
    );
  }

  const balance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);
  const canAfford = balance >= voucher.token_cost;
  const saved = isFavorite(voucher.id);
  const inCart = isInCart(voucher.id);
  const imgSrc = resolveImageUrl(voucher.images?.[0]);
  const category = voucher.category
    ? voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1)
    : null;

  return (
    <div>
      <style>{`
        .page-header .back-btn {
          position: absolute !important;
          right: 24px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background-color: transparent !important;
          color: white !important;
          border-color: white !important;
        }
        @media (min-width: 768px) {
          .page-header .back-btn {
            right: 32px !important;
          }
        }
        @media (min-width: 1024px) {
          .page-header .back-btn {
            right: 40px !important;
          }
        }
        .page-header .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <div className="page-header">
        <h1>Détail de l'offre</h1>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IconChevronLeft /> Retour
        </button>
      </div>

      <div className="card" style={{ maxWidth: 560, margin: '0 auto', overflow: 'hidden' }}>
        {/* Image */}
        <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: 'var(--bg)' }}>
          {imgSrc ? (
            <img src={imgSrc} alt={voucher.partner}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ width: 40, height: 40, color: 'var(--text-muted)' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Header : partenaire + favoris */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700 }}>{voucher.partner}</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{voucher.title}</h2>
          </div>
          <button
            className={`btn-bookmark ${saved ? 'btn-bookmark--saved' : ''}`}
            onClick={() => toggle(voucher.id)}
            aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <IconHeart filled={saved} />
          </button>
        </div>

        {category && (
          <span className="category-chip" style={{ display: 'inline-block', marginTop: 12, pointerEvents: 'none' }}>
            {category}
          </span>
        )}

        {/* Coût */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Coût :</span>
          <span className="token-badge" style={{ fontSize: '1rem' }}>{voucher.token_cost} tokens</span>
        </div>
        <div style={{ marginTop: 6, fontSize: '0.85rem', color: canAfford ? 'var(--text-muted)' : 'var(--danger, #c0392b)', textAlign: 'right' }}>
          Votre solde : {balance} tokens
          {!canAfford && !promoCode && ' — solde insuffisant'}
        </div>

        {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}

        {/* Code promo obtenu après achat */}
        {promoCode && (
          <div style={{ marginTop: 18, padding: 14, background: 'var(--primary-light)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Votre code promo</div>
            <span className="promo-code" style={{ fontSize: '1.1rem' }}>{promoCode}</span>
          </div>
        )}

        {/* Actions */}
        {!promoCode && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {!voucher.available ? (
              <span style={{ color: 'var(--text-muted)' }}>Cette offre n'est plus disponible.</span>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: 140 }}
                  disabled={redeeming || !canAfford}
                  onClick={handleRedeem}
                >
                  {redeeming ? '…' : 'Acheter'}
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, minWidth: 140, ...(inCart ? { background: 'var(--primary-light)', fontWeight: 700 } : {}) }}
                  onClick={() => cartToggle(voucher.id)}
                >
                  {inCart ? '✓ Dans le panier' : '+ Ajouter au panier'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
