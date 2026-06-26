/**
 * pages/admin/AdminTauxRachat.tsx — Partner redemption rate page for the admin.
 *
 * Computes per-partner redemption rates by dividing the number of redemptions by the number
 * of vouchers for each partner. Sorted by rate descending. The global rate is also displayed.
 * Intended to help the admin identify which partners' offers are most attractive to employees.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplace.service';
import type { AdminVoucher, AdminRedemption } from '../../types';

export default function AdminTauxRachat() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [history, setHistory] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      marketplaceService.adminGetVouchers(),
      marketplaceService.adminGetHistory(),
    ])
      .then(([v, h]) => { setVouchers(v); setHistory(h); })
      .finally(() => setLoading(false));
  }, []);

  const partners = Array.from(new Set(vouchers.map(v => v.partner)));
  const partnerStats = partners.map(partner => {
    const pVouchers = vouchers.filter(v => v.partner === partner).length;
    const pRedemptions = history.filter(r => r.voucher?.partner === partner).length;
    const rate = pVouchers > 0 ? Math.round((pRedemptions / pVouchers) * 100) : 0;
    return { partner, vouchers: pVouchers, redemptions: pRedemptions, rate };
  }).sort((a, b) => b.rate - a.rate);

  const globalRate = vouchers.length > 0 ? Math.round((history.length / vouchers.length) * 100) : 0;

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    fontWeight: 700,
  };

  function rateColor(rate: number): string {
    if (rate >= 50) return '#16a34a';
    if (rate >= 20) return 'var(--primary)';
    return 'var(--text-muted)';
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Taux de rachat</h1>
          <p>Performance par partenaire</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 640, paddingBottom: 48 }}>

        <div className="grid-2">
          <div className="stat-card">
            <p className="stat-label">Taux global</p>
            <p className="stat-value">{globalRate}%</p>
            <p className="stat-sub">{history.length} rachats / {vouchers.length} bons</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Partenaires</p>
            <p className="stat-value">{partnerStats.length}</p>
            <p className="stat-sub">avec des bons créés</p>
          </div>
        </div>

        <div>
          <h2 className="faq-section-title">Taux de rachat par partenaire</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {partnerStats.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune donnée disponible.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Partenaire</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Bons créés</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rachats</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerStats.map(({ partner, vouchers: v, redemptions, rate }) => (
                    <tr key={partner} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>{partner}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{v}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{redemptions}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: rateColor(rate) }}>{rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
