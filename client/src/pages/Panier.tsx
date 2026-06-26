/**
 * pages/Panier.tsx — Shopping cart page where users review and redeem saved vouchers.
 *
 * Cart contents are sourced from useCart (localStorage) and cross-referenced with the live
 * voucher list from the API to get current availability and token cost. Each voucher can be
 * redeemed individually or all redeemable items can be redeemed at once via handleRedeemAll.
 *
 * The "Valider le panier" button in the desktop TopNav dispatches a custom 'panier:validate'
 * browser event; this page listens for that event and triggers handleRedeemAll, allowing the
 * checkout action to be triggered from outside the component tree.
 *
 * On successful redemption the promo code is displayed in-page, the item is removed from the
 * cart, and the user/company balance is refreshed via AuthContext.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { marketplaceService } from '../services/marketplace.service';
import { useCart } from '../hooks/useCart';
import { useFavorites } from '../hooks/useFavorites';
import { CarouselRow } from '../components/CarouselRow';
import type { Voucher } from '../types';
import { fmtShort } from '../utils/date';

export default function Panier() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const { remove, isInCart, addedAt, toggle: toggleCart } = useCart();
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, { code: string; redeemed_at: string }>>({});
  const [error, setError] = useState('');
  const isManager = user?.role === 'manager' || user?.role === 'employer' || user?.role === 'employee';

  useEffect(() => {
    marketplaceService.getItems().then(setAllVouchers).finally(() => setLoading(false));
  }, []);

  const cartVouchers = allVouchers.filter((v) => isInCart(v.id));
  const weeklyOffers = allVouchers.filter((v) => v.available && v.is_weekly);
  const balance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);

  const handleRedeemAll = useCallback(async () => {
    const balanceVal = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);
    const redeemable = allVouchers
      .filter((v) => isInCart(v.id) && v.available && balanceVal >= v.token_cost);
    for (const v of redeemable) await handleRedeem(v);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVouchers, user?.token_balance, company?.token_balance]);

  useEffect(() => {
    const handler = () => { handleRedeemAll(); };
    window.addEventListener('panier:validate', handler);
    return () => window.removeEventListener('panier:validate', handler);
  }, [handleRedeemAll]);

  async function handleRedeem(voucher: Voucher) {
    setError('');
    setRedeeming(voucher.id);
    try {
      const { promo_code } = await marketplaceService.redeem(voucher.id);
      setPromoCodes((prev) => ({ ...prev, [voucher.id]: { code: promo_code, redeemed_at: new Date().toISOString() } }));
      remove(voucher.id);
      setAllVouchers((prev) =>
        prev.map((v) => (v.id === voucher.id ? { ...v, available: false } : v)),
      );
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

  return (
    <div>
      <div className={`page-header page-header--centered ${isManager ? 'page-header--manager' : ''}`}>
        <h1>Vos bons d'achat sauvegardés</h1>
      </div>

      {error &&<p className="form-error">{error}</p>}

      {/* Codes déjà obtenus dans cette session */}
      {Object.keys(promoCodes).length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#f0fdf4', borderColor: 'var(--success)' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--success)', marginBottom: 12 }}>
            Codes obtenus
          </p>
          {Object.entries(promoCodes).map(([id, { code, redeemed_at }]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="promo-code">{code}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtShort(redeemed_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Offres de la semaine (Carousel) */}
      {weeklyOffers.length > 0 && (
        <div style={{ marginBottom: 24, margin: '0 calc(-1 * var(--page-px)) 24px', padding: '0 var(--page-px)' }}>
          <CarouselRow
            title="Offres de la semaine"
            vouchers={weeklyOffers}
            userBalance={balance}
            isFavorite={isFavorite}
            onToggle={toggleFav}
            isInCart={isInCart}
            onCartToggle={toggleCart}
          />
        </div>
      )}

      {cartVouchers.length === 0 ? (
        <div className="card" style={{ background: '#fefce8', borderColor: '#fef08a' }}>
          <p className="empty-state">
            Votre panier est vide.
            <br />
            <span style={{ fontSize: '0.82rem' }}>
              Sauvegardez des bons dans le Catalogue pour les retrouver ici.
            </span>
          </p>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#fefce8', borderColor: '#fef08a' }}>
          {cartVouchers.map((v) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{v.partner}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v.title}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 2 }}>
                  Ajouté le {fmtShort(addedAt(v.id))}
                </p>
              </div>
              <span className="token-badge">{v.token_cost}</span>
              {!v.available ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>Indisponible</span>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={redeeming === v.id || balance < v.token_cost}
                  onClick={() => handleRedeem(v)}
                >
                  {redeeming === v.id ? '…' : 'Acheter'}
                </button>
              )}
              <button
                onClick={() => remove(v.id)}
                style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                aria-label="Retirer"
              >
                ×
              </button>
            </div>
          ))}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {cartVouchers.length} bon{cartVouchers.length > 1 ? 's' : ''}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Total :{' '}
              <span style={{ color: 'var(--primary)' }}>
                {cartVouchers.reduce((s, v) => s + v.token_cost, 0)} tokens
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Valider le panier — masqué sur desktop (affiché dans la TopNav) */}
      {(() => {
        const hasItems = cartVouchers.length > 0;
        const canBuy = hasItems && !redeeming && cartVouchers.some(
          v => v.available && balance >= v.token_cost
        );
        return (
          <button
            className="btn btn-primary btn-full"
            style={{
              marginTop: 16,
              opacity: canBuy ? 1 : 0.45,
              cursor: canBuy ? 'pointer' : 'not-allowed',
              borderRadius: '999px',
            }}
            disabled={!canBuy}
            onClick={handleRedeemAll}
          >
            Valider le panier
          </button>
        );
      })()}
    </div>
  );
}
