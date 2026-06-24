/**
 * pages/admin/AdminStatMotifs.tsx — Allocation reason (motif) breakdown for the admin.
 *
 * Fetches all token transactions, filters to employer-to-employee allocation entries, and
 * computes a frequency table grouped by the transaction type/reason field. Results are sorted
 * by count descending and displayed as a ranked list with percentage contribution. Transactions
 * with no reason are labelled 'Sans motif'.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../services/token.service';
import type { TokenTransaction } from '../../types';
import { fmtShort } from '../../utils/date';

interface MotifRow {
  motif: string;
  count: number;
  pct: number;
}

export default function AdminStatMotifs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MotifRow[]>([]);
  const [totalAllocations, setTotalAllocations] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<TokenTransaction[]>([]);

  useEffect(() => {
    tokenService.getTransactions()
      .then((transactions: TokenTransaction[]) => {
        // Garde uniquement les allocations employeur (sender ET receiver présents)
        const allocs = transactions.filter(
          tx => tx.sender_id !== null && tx.receiver_id !== null
        );

        const counts: Record<string, number> = {};
        for (const tx of allocs) {
          const motif = tx.reason || (tx.type === 'allocation' ? 'Sans motif' : tx.type || 'Sans motif');
          counts[motif] = (counts[motif] ?? 0) + 1;
        }

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([motif, count]) => ({ motif, count, pct: 0 }));

        const totalCount = sorted.reduce((s, r) => s + r.count, 0);
        const sumTokens = allocs.reduce((sum, tx) => sum + tx.amount, 0);
        sorted.forEach(r => { r.pct = totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0; });

        setRows(sorted);
        setTotalAllocations(totalCount);
        setTotalTokens(sumTokens);
        setAllocations(allocs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

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
      <div className="page-header page-header--clean">
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1>Statistiques motifs de don</h1>
          <p>{totalAllocations} allocation{totalAllocations !== 1 ? 's' : ''} analysée{totalAllocations !== 1 ? 's' : ''}</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 700, paddingBottom: 48, margin: '0 auto' }}>

        <div className="grid-2">
          <div className="stat-card">
            <p className="stat-label">Allocations totales</p>
            <p className="stat-value">{totalTokens}</p>
            <p className="stat-sub">{totalAllocations} don{totalAllocations !== 1 ? 's' : ''} de tokens effectué{totalAllocations !== 1 ? 's' : ''}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Motifs distincts</p>
            <p className="stat-value">{rows.filter(r => r.motif !== 'Sans motif').length}</p>
            <p className="stat-sub">raisons uniques renseignées</p>
          </div>
        </div>

        <div>
          <h2 className="faq-section-title">Historique des tokens alloués</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {allocations.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune allocation enregistrée.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {allocations.map((tx, i) => {
                  const motif = tx.reason || (tx.type === 'allocation' ? 'Sans motif' : tx.type || 'Sans motif');
                  const companyName = tx.company?.name || '—';
                  const dateStr = fmtShort(tx.createdAt || tx.created_at);
                  return (
                    <li
                      key={tx.id}
                      style={{
                        padding: '14px 20px',
                        borderBottom: i < allocations.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                          <span className="token-badge" style={{ marginRight: 8 }}>+{tx.amount}</span>
                          {motif}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Entreprise : <strong>{companyName}</strong>
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {dateStr}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
