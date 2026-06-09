import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyService } from '../../services/company.service';
import { userService } from '../../services/user.service';
import type { Company, User } from '../../types';

function fmt(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      companyService.getById(id),
      userService.getAll({ companyId: id }),
    ])
      .then(([c, u]) => { setCompany(c); setEmployees(u); })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await companyService.delete(id);
      navigate('/admin/dashboard');
    } catch {
      setError('Erreur lors de la suppression.');
      setDeleting(false);
      setConfirm(false);
    }
  }

  const employers  = employees.filter(u => u.role === 'employer');
  const empList    = employees.filter(u => u.role === 'employee');
  const totalTokens = employees.reduce((sum, u) => sum + u.token_balance, 0);

  const rowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)' };
  const tdMuted: React.CSSProperties  = { padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;
  if (!company) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Entreprise introuvable.</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>{company.name}</h1>
          <p>{company.city ?? ''}</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640, paddingBottom: 48 }}>

        {/* Stats */}
        <div className="grid-3">
          <div className="stat-card">
            <p className="stat-label">Employés</p>
            <p className="stat-value">{empList.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Tokens distribués</p>
            <p className="stat-value">{totalTokens}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Solde entreprise</p>
            <p className="stat-value">{company.token_balance}</p>
          </div>
        </div>

        {/* Infos */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={rowStyle}>
                <td style={{ ...tdMuted, fontWeight: 700, width: '40%' }}>Adresse</td>
                <td style={{ padding: '10px 16px', fontSize: '0.875rem' }}>
                  {[company.street, company.zip_code, company.city].filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
              <tr style={rowStyle}>
                <td style={{ ...tdMuted, fontWeight: 700 }}>Email</td>
                <td style={{ padding: '10px 16px', fontSize: '0.875rem' }}>{company.email || '—'}</td>
              </tr>
              <tr style={rowStyle}>
                <td style={{ ...tdMuted, fontWeight: 700 }}>SIRET</td>
                <td style={{ padding: '10px 16px', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  {(company as any).siret || '—'}
                </td>
              </tr>
              <tr>
                <td style={{ ...tdMuted, fontWeight: 700 }}>Inscrite le</td>
                <td style={{ padding: '10px 16px', fontSize: '0.875rem' }}>{fmt(company.created_at)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Employers */}
        {employers.length > 0 && (
          <div>
            <h2 className="faq-section-title">Administrateurs ({employers.length})</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {employers.map(u => (
                    <tr key={u.id} style={rowStyle}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.875rem' }}>
                        {u.first_name} {u.name}
                      </td>
                      <td style={tdMuted}>{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employees */}
        <div>
          <h2 className="faq-section-title">Employés ({empList.length})</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {empList.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun employé enregistré.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Nom</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {empList.map(u => (
                    <tr key={u.id} style={rowStyle}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.875rem' }}>
                        {u.first_name} {u.name}
                      </td>
                      <td style={tdMuted}>{u.email}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span className="token-badge">{u.token_balance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Delete */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          {!confirm ? (
            <button
              className="btn btn-danger"
              onClick={() => setConfirm(true)}
              style={{ background: '#dc2626', color: '#fff', border: 'none' }}
            >
              Supprimer l'entreprise
            </button>
          ) : (
            <div className="card" style={{ borderColor: '#dc2626', borderWidth: 1 }}>
              <p style={{ marginBottom: 16, fontWeight: 600 }}>
                Supprimer <strong>{company.name}</strong> ? Cette action est irréversible — tous les utilisateurs et leurs données seront effacés.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
