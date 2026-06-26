/**
 * pages/admin/AdminStats.tsx — Platform-wide statistics dashboard for the admin.
 *
 * Fetches three data sets in parallel (all companies, all vouchers, full redemption history)
 * and derives four KPIs: total companies, total vouchers, total redemptions, and currently
 * available vouchers. Each stat card is clickable and navigates to the corresponding detail
 * list page (AdminDashboard for companies, AdminBons for vouchers/redemptions).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../../services/company.service';
import { marketplaceService } from '../../services/marketplace.service';

interface Stats {
  companies: number;
  vouchers: number;
  redeemed: number;
  available: number;
}

const cardClickStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'transform 0.12s, box-shadow 0.12s',
};

export default function AdminStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      companyService.getAll(),
      marketplaceService.adminGetVouchers(),
      marketplaceService.adminGetHistory(),
    ])
      .then(([companies, vouchers, history]) => {
        setStats({
          companies: companies.length,
          vouchers: vouchers.length,
          redeemed: history.length,
          available: vouchers.filter(v => v.available).length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  return (
    <div>
      <div className="page-header page-header--clean" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Statistiques</h1>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="stat-card" style={cardClickStyle}
          onClick={() => navigate('/admin/stat-rachats')}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
        >
          <p className="stat-label">Statistiques rachats</p>
          <p className="stat-value">{stats?.redeemed ?? 0}</p>
          <p className="stat-sub">
            {stats && stats.vouchers > 0
              ? `${Math.round((stats.redeemed / stats.vouchers) * 100)}% de taux de rachat`
              : 'bons échangés'}
          </p>
        </div>
        <div className="stat-card" style={cardClickStyle}
          onClick={() => navigate('/admin/stat-motifs')}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
        >
          <p className="stat-label">Statistiques motifs de don</p>
          <p className="stat-value">→</p>
          <p className="stat-sub">motifs d'attribution de tokens</p>
        </div>
      </div>
    </div>
  );
}
