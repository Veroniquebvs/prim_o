/**
 * pages/admin/AdminRachats.tsx — Platform-wide redemption history page for the admin.
 *
 * Fetches all redemption records across all companies. Derives two aggregate views:
 * a by-partner summary (total redemptions per partner, sorted descending) and a top-10
 * most-redeemed vouchers table. The full chronological redemption log is shown below.
 * Navigates back to AdminBons on the back button.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplace.service';
import type { AdminRedemption } from '../../types';

export default function AdminRachats() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceService.adminGetHistory()
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  const byPartner: Record<string, number> = {};
  for (const r of history) {
    const p = r.voucher?.partner ?? 'Inconnu';
    byPartner[p] = (byPartner[p] ?? 0) + 1;
  }
  const partnerRows = Object.entries(byPartner).sort((a, b) => b[1] - a[1]);

  const byVoucher: Record<string, { title: string; partner: string; count: number }> = {};
  for (const r of history) {
    const key = r.voucher?.id ?? '';
    if (!byVoucher[key]) byVoucher[key] = { title: r.voucher?.title ?? '', partner: r.voucher?.partner ?? '', count: 0 };
    byVoucher[key].count++;
  }
  const topVouchers = Object.values(byVoucher).sort((a, b) => b.count - a.count).slice(0, 10);

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    fontWeight: 700,
  };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Rachats totaux</h1>
          <p>{history.length} échange{history.length !== 1 ? 's' : ''} effectué{history.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 640, paddingBottom: 48 }}>

        <div>
          <h2 className="faq-section-title">Rachats par partenaire</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {partnerRows.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun rachat enregistré.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Partenaire</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rachats</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Part</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRows.map(([partner, count]) => (
                    <tr key={partner} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>{partner}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {Math.round((count / history.length) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="faq-section-title">Top bons rachetés</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {topVouchers.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun rachat enregistré.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Bon d'achat</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Partenaire</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rachats</th>
                  </tr>
                </thead>
                <tbody>
                  {topVouchers.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>{v.title}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{v.partner}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{v.count}</td>
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
