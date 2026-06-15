import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { marketplaceService } from '../services/marketplace.service';
import { useCart } from '../hooks/useCart';
import type { Voucher } from '../types';
import { fmtShort } from '../utils/date';

export default function Panier() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const { remove, isInCart, addedAt } = useCart();
  const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, { code: string; redeemed_at: string }>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    marketplaceService.getItems().then(setAllVouchers).finally(() => setLoading(false));
  }, []);

  const cartVouchers = allVouchers.filter((v) => isInCart(v.id));
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
      <div className="page-header page-header--centered">
        <h1>Vos bons d'achat sauvegardés</h1>
      </div>

      {/* Solde — masqué sur desktop (affiché dans la TopNav) */}
      <div className="stat-card panier-desktop-hidden" style={{ marginBottom: 24, display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
         <p className="stat-label">Solde disponible</p>
        <p className="stat-value">{balance}</p>
        <p className="stat-sub">tokens</p>
      </div>

      {error && <p className="form-error">{error}</p>}

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

      {cartVouchers.length === 0 ? (
        <div className="card">
          <p className="empty-state">
            Votre panier est vide.
            <br />
            <span style={{ fontSize: '0.82rem' }}>
              Sauvegardez des bons dans le Catalogue pour les retrouver ici.
            </span>
          </p>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  {redeeming === v.id ? '…' : 'Racheter'}
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
            className="btn btn-primary btn-full panier-desktop-hidden"
            style={{
              marginTop: 16,
              opacity: canBuy ? 1 : 0.45,
              cursor: canBuy ? 'pointer' : 'not-allowed',
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
