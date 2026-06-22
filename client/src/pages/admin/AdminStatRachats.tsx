/**
 * pages/admin/AdminStatRachats.tsx — Redemption analytics page for the admin.
 *
 * Loads all vouchers and all redemption records, then derives per-voucher redemption rates
 * and time-series counts for three selectable periods (30 days, 90 days, all-time). Shows:
 * - A period selector (30j / 90j / tout)
 * - An SVG bar chart of redemptions over time (one bar per day/week)
 * - A top-10 most-redeemed vouchers table with redemption counts and colour-coded rate indicators
 * rateColor uses green ≥50%, primary colour ≥20%, and muted for lower rates.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplace.service';
import type { AdminVoucher, AdminRedemption } from '../../types';
import { fmtShort as fmt } from '../../utils/date';

type Period = '30j' | '90j' | 'tout';

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

/* ── SVG Bar Chart ───────────────────────────────────────── */
function BarChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length === 0) {
    return <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune donnée sur la période.</p>;
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const chartH = 90;
  const labelH = 22;
  const totalW = 600;
  const n = data.length;
  const gap = Math.max(2, Math.min(6, Math.floor(12 / n)));
  const barW = Math.min(40, (totalW - gap * (n + 1)) / n);
  const usedW = n * barW + gap * (n + 1);
  const offsetX = (totalW - usedW) / 2;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${chartH + labelH}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Évolution des rachats"
    >
      {data.map((d, i) => {
        const x = offsetX + gap + i * (barW + gap);
        const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 3 : 0);
        const y = chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="var(--primary)" rx={Math.min(3, barW / 3)} opacity={0.85} />
            {d.count > 0 && barH > 14 && (
              <text x={x + barW / 2} y={y + 11} textAnchor="middle" fontSize="9" fill="#fff" fontWeight={700}>
                {d.count}
              </text>
            )}
            {d.count > 0 && barH <= 14 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                {d.count}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={chartH + 15}
              textAnchor="middle"
              fontSize={n > 16 ? '7' : '8'}
              fill="var(--text-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Time bucketing ─────────────────────────────────────── */
function getTimeBuckets(history: AdminRedemption[], period: Period): { label: string; count: number }[] {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  if (period === 'tout') {
    const map: Record<string, number> = {};
    history.forEach(r => {
      const d = new Date(r.createdAt || r.redeemed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        return { label: `${months[parseInt(month) - 1]} ${year.slice(2)}`, count };
      });
  }

  // 30j ou 90j → par semaine (lundi au dimanche)
  const map: Record<string, number> = {};
  history.forEach(r => {
    const d = new Date(r.createdAt || r.redeemed_at);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const key = monday.toISOString().slice(0, 10);
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const d = new Date(key);
      return { label: `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`, count };
    });
}

/* ── Page ───────────────────────────────────────────────── */
export default function AdminStatRachats() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [history, setHistory] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30j');

  useEffect(() => {
    Promise.all([
      marketplaceService.adminGetVouchers(),
      marketplaceService.adminGetHistory(),
    ])
      .then(([v, h]) => { setVouchers(v); setHistory(h); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  // Filtrage par période
  const now = new Date();
  const cutoff = period === '30j'
    ? new Date(now.getTime() - 30 * 86_400_000)
    : period === '90j'
    ? new Date(now.getTime() - 90 * 86_400_000)
    : null;

  const filtered = cutoff
    ? history.filter(r => new Date(r.createdAt || r.redeemed_at) >= cutoff)
    : history;

  // KPIs (période filtrée)
  const globalRate = vouchers.length > 0 ? Math.round((filtered.length / vouchers.length) * 100) : 0;

  // Par partenaire (période filtrée)
  const partners = Array.from(new Set(vouchers.map(v => v.partner)));
  const partnerStats = partners.map(partner => {
    const pVouchers = vouchers.filter(v => v.partner === partner).length;
    const pRedemptions = filtered.filter(r => r.voucher?.partner === partner).length;
    const rate = pVouchers > 0 ? Math.round((pRedemptions / pVouchers) * 100) : 0;
    return { partner, vouchers: pVouchers, redemptions: pRedemptions, rate };
  }).filter(p => p.redemptions > 0).sort((a, b) => b.redemptions - a.redemptions);

  // Top bons (période filtrée)
  const byVoucher: Record<string, { title: string; partner: string; count: number }> = {};
  for (const r of filtered) {
    const key = r.voucher?.id ?? '';
    if (!byVoucher[key]) byVoucher[key] = { title: r.voucher?.title ?? '', partner: r.voucher?.partner ?? '', count: 0 };
    byVoucher[key].count++;
  }
  const topVouchers = Object.values(byVoucher).sort((a, b) => b.count - a.count).slice(0, 10);

  // Évolution temporelle (période filtrée)
  const timeBuckets = getTimeBuckets(filtered, period);

  // Bons jamais rachetés (all-time — propriété du bon, indépendant de la période)
  const neverRedeemed = vouchers.filter(v => v.redemptions.length === 0 && v.available);

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Statistiques rachats</h1>
          <p>{filtered.length} échange{filtered.length !== 1 ? 's' : ''}{period !== 'tout' ? ` sur les ${period}` : ' au total'}</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 700, paddingBottom: 48, margin: '0 auto' }}>

        {/* Filtre période */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['30j', '90j', 'tout'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: period === p ? 'var(--primary)' : 'var(--border)',
                background: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-muted)',
                fontWeight: period === p ? 700 : 400,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p === 'tout' ? 'Tout' : `${p}`}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid-3">
          <div className="stat-card">
            <p className="stat-label">Rachats</p>
            <p className="stat-value">{filtered.length}</p>
            <p className="stat-sub">bons échangés</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Taux de rachat</p>
            <p className="stat-value" style={{ color: rateColor(globalRate) }}>{globalRate}%</p>
            <p className="stat-sub">{filtered.length} / {vouchers.length} bons</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Partenaires actifs</p>
            <p className="stat-value">{partnerStats.length}</p>
            <p className="stat-sub">avec rachats sur la période</p>
          </div>
        </div>

        {/* Évolution temporelle */}
        <div>
          <h2 className="faq-section-title">
            Évolution — {period === '30j' ? 'par semaine (30 derniers jours)' : period === '90j' ? 'par semaine (90 derniers jours)' : 'par mois'}
          </h2>
          <div className="card" style={{ padding: '20px 16px 12px' }}>
            <BarChart data={timeBuckets} />
          </div>
        </div>

        {/* Par partenaire */}
        <div>
          <h2 className="faq-section-title">Taux de rachat par partenaire</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {partnerStats.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun rachat sur la période.</p>
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
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{redemptions}</td>
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


        {/* Bons jamais rachetés */}
        <div>
          <h2 className="faq-section-title">
            Bons jamais rachetés
            {neverRedeemed.length > 0 && (
              <span style={{
                marginLeft: 8, background: '#fef3c7', color: '#b45309',
                fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                borderRadius: 10, verticalAlign: 'middle',
              }}>
                {neverRedeemed.length}
              </span>
            )}
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {neverRedeemed.length === 0 ? (
              <p style={{ padding: 16, color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                Tous les bons disponibles ont été rachetés au moins une fois.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Bon d'achat</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Partenaire</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Coût</th>
                  </tr>
                </thead>
                <tbody>
                  {neverRedeemed.map(v => (
                    <tr
                      key={v.id}
                      onClick={() => navigate(`/admin/bons/${v.id}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>{v.title}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{v.partner}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span className="token-badge">{v.token_cost}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top ventes */}
        <div>
          <h2 className="faq-section-title">Top ventes{period !== 'tout' ? ` — ${period}` : ''}</h2>
          {topVouchers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun rachat sur la période.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topVouchers.map((v, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem',
                    color: i < 3 ? '#fff' : 'var(--primary)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.partner}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{v.title}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{v.count}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>rachat{v.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des achats */}
        <div>
          <h2 className="faq-section-title">Historique des achats{period !== 'tout' ? ` — ${period}` : ''}</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun rachat sur la période.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Utilisateur</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Bon</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Tokens</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Code</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => new Date(b.createdAt || b.redeemed_at || b.created_at).getTime() - new Date(a.createdAt || a.redeemed_at || a.created_at).getTime()).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.user?.first_name || r.user?.name || '—'}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{r.user?.email}</p>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.voucher?.partner}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{r.voucher?.title}</p>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span className="token-badge">{r.voucher?.token_cost}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span className="promo-code">{r.promo_code}</span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {fmt(r.createdAt || r.redeemed_at || r.created_at)}
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
