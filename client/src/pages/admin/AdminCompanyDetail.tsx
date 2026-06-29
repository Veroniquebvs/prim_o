/**
 * pages/admin/AdminCompanyDetail.tsx — Detailed view of a single company, for the admin.
 *
 * Fetches the company record and its employee list. Displays company info, token balance,
 * employee table (with a role-change dropdown that lets the admin promote/demote between
 * employee and manager roles), and a two-step admin token deduction form. The deduction
 * targets either the company token pool or an individual employee; a confirmation step
 * shows the recap before committing the write. Company deletion requires a second click
 * on the confirmation button and removes the company and all associated users.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyService } from '../../services/company.service';
import { userService } from '../../services/user.service';
import { tokenService } from '../../services/token.service';
import type { Company, User } from '../../types';
import { fmt } from '../../utils/date';
import UserSelectionModal from '../../components/UserSelectionModal';

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  const [showManagersModal, setShowManagersModal] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      companyService.getById(id),
      userService.getAll({ companyId: id }),
    ])
      .then(([c, u]) => { setCompany(c); setEmployees((u as any).data?.data || []); })
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
  const managers   = employees.filter(u => u.role === 'manager');
  const collaborateurs = employees.filter(u => u.role === 'employee');
  const staff = [...managers, ...collaborateurs];
  const totalTokens = employees.reduce((sum, u) => sum + u.token_balance, 0);

  const rowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)' };
  const tdMuted: React.CSSProperties  = { padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;
  if (!company) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Entreprise introuvable.</div>;

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640, paddingBottom: 48, margin: '0 auto' }}>

        {/* Stats */}
        <div className="grid-3">
          <div className="stat-card">
            <p className="stat-label">Employés</p>
            <p className="stat-value">{staff.length}</p>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#fefce8', borderColor: '#fef08a' }}>
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
                <td style={{ padding: '10px 16px', fontSize: '0.875rem' }}>{fmt(company.createdAt || company.created_at)}</td>
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
                    <tr 
                      key={u.id} 
                      style={{...rowStyle, cursor: 'pointer', transition: 'background 0.2s'}}
                      onClick={() => navigate(`/employer/employees/${u.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
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
          <h2 className="faq-section-title">Employés ({staff.length})</h2>
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowManagersModal(true)}
              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', cursor: 'pointer' }}
            >
              <span style={{ fontWeight: 600 }}>Managers</span>
              <span className="token-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}>{managers.length}</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowCollaboratorsModal(true)}
              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', cursor: 'pointer' }}
            >
              <span style={{ fontWeight: 600 }}>Collaborateurs</span>
              <span className="token-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}>{collaborateurs.length}</span>
            </button>
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

      {showManagersModal && (
        <div className="emp-modal-overlay" onClick={() => setShowManagersModal(false)} style={{ zIndex: 1000 }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', width: '90%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="emp-modal-title" style={{ margin: 0 }}>Managers</h2>
              <button onClick={() => setShowManagersModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {managers.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucun manager.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {managers.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')).map(u => (
                      <tr 
                        key={u.id} 
                        style={{...rowStyle, cursor: 'pointer', transition: 'background 0.2s'}}
                        onClick={() => navigate(`/employer/employees/${u.id}`)}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 0', fontWeight: 600, fontSize: '0.875rem' }}>{u.first_name} {u.name}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}><span className="token-badge">{u.token_balance}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showCollaboratorsModal && (
        <div className="emp-modal-overlay" onClick={() => setShowCollaboratorsModal(false)} style={{ zIndex: 1000 }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', width: '90%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="emp-modal-title" style={{ margin: 0 }}>Collaborateurs</h2>
              <button onClick={() => setShowCollaboratorsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {collaborateurs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucun collaborateur.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {collaborateurs.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')).map(u => (
                      <tr 
                        key={u.id} 
                        style={{...rowStyle, cursor: 'pointer', transition: 'background 0.2s'}}
                        onClick={() => navigate(`/employer/employees/${u.id}`)}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 0', fontWeight: 600, fontSize: '0.875rem' }}>{u.first_name} {u.name}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}><span className="token-badge">{u.token_balance}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
