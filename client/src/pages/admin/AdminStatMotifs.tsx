import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../services/token.service';
import type { TokenTransaction } from '../../types';

interface MotifRow {
  motif: string;
  count: number;
  pct: number;
}

export default function AdminStatMotifs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MotifRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tokenService.getTransactions()
      .then((transactions: TokenTransaction[]) => {
        // Garde uniquement les allocations employeur (sender ET receiver présents)
        const allocations = transactions.filter(
          tx => tx.sender_id !== null && tx.receiver_id !== null
        );

        const counts: Record<string, number> = {};
        for (const tx of allocations) {
          const motif = tx.type === 'allocation' ? 'Sans motif' : (tx.type || 'Sans motif');
          counts[motif] = (counts[motif] ?? 0) + 1;
        }

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([motif, count]) => ({ motif, count, pct: 0 }));

        const totalCount = sorted.reduce((s, r) => s + r.count, 0);
        sorted.forEach(r => { r.pct = totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0; });

        setRows(sorted);
        setTotal(totalCount);
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
      <div className="page-header">
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1>Statistiques motifs de don</h1>
          <p>{total} allocation{total !== 1 ? 's' : ''} analysée{total !== 1 ? 's' : ''}</p>
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
            <p className="stat-value">{total}</p>
            <p className="stat-sub">dons de tokens effectués</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Motifs distincts</p>
            <p className="stat-value">{rows.filter(r => r.motif !== 'Sans motif').length}</p>
            <p className="stat-sub">raisons uniques renseignées</p>
          </div>
        </div>

        <div>
          <h2 className="faq-section-title">Motifs — du plus au moins utilisé</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {rows.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune allocation enregistrée.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {rows.map(({ motif, count, pct }, i) => (
                  <li
                    key={motif}
                    style={{
                      padding: '14px 20px',
                      borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <span style={{
                        minWidth: 24, height: 24,
                        borderRadius: '50%',
                        background: motif === 'Sans motif' ? 'var(--border)' : 'var(--primary-light)',
                        color: motif === 'Sans motif' ? 'var(--text-muted)' : 'var(--primary)',
                        fontSize: '0.72rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{
                        flex: 1,
                        fontWeight: motif === 'Sans motif' ? 400 : 600,
                        fontSize: '0.9rem',
                        color: motif === 'Sans motif' ? 'var(--text-muted)' : 'inherit',
                        fontStyle: motif === 'Sans motif' ? 'italic' : 'normal',
                      }}>
                        {motif}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', flexShrink: 0 }}>
                        {count}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
                        {pct}%
                      </span>
                    </div>
                    {/* Barre de proportion */}
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 36 }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: motif === 'Sans motif' ? 'var(--text-muted)' : 'var(--primary)',
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
