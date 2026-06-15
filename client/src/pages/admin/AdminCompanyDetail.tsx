import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyService } from '../../services/company.service';
import { userService } from '../../services/user.service';
import { tokenService } from '../../services/token.service';
import type { Company, User } from '../../types';
import { fmt } from '../../utils/date';

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  // Déduction admin
  type DeductTarget = 'company' | 'employee';
  const [deductTarget, setDeductTarget] = useState<DeductTarget>('company');
  const [deductUserId, setDeductUserId] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [deductPending, setDeductPending] = useState(false);
  const [deductConfirm, setDeductConfirm] = useState(false);
  const [deductMsg, setDeductMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      companyService.getById(id),
      userService.getAll({ companyId: id, role: 'employee' }),
    ])
      .then(([c, u]) => { setCompany(c); setEmployees((u as any).data?.data || []); })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleDeductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDeductMsg(null);
    setDeductConfirm(true);
  }

  async function handleDeductConfirm() {
    if (!id || !company) return;
    setDeductPending(true);
    try {
      await tokenService.adminDeduct({
        target: deductTarget,
        company_id: id,
        user_id: deductTarget === 'employee' ? deductUserId : undefined,
        amount: Number(deductAmount),
        reason: deductReason || undefined,
      });
      const [freshCompany, freshUsers] = await Promise.all([
        companyService.getById(id),
        userService.getAll({ companyId: id, role: 'employee' }),
      ]);
      setCompany(freshCompany);
      setEmployees((freshUsers as any).data?.data || []);
      setDeductMsg({ ok: true, text: `${deductAmount} tokens déduits avec succès.` });
      setDeductAmount('');
      setDeductReason('');
      setDeductUserId('');
      setDeductConfirm(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setDeductMsg({ ok: false, text: axiosErr.response?.data?.error ?? 'Erreur lors de la déduction.' });
      setDeductConfirm(false);
    } finally {
      setDeductPending(false);
    }
  }

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

        {/* Déduction admin */}
        <div>
          <h2 className="faq-section-title">Déduire des tokens</h2>
          <div className="card">
            {/* Tabs cible */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['company', 'employee'] as DeductTarget[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setDeductTarget(t); setDeductUserId(''); setDeductMsg(null); setDeductConfirm(false); }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 'var(--radius)',
                    border: '1.5px solid', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                    background: deductTarget === t ? 'var(--primary)' : 'transparent',
                    borderColor: deductTarget === t ? 'var(--primary)' : 'var(--border)',
                    color: deductTarget === t ? '#fff' : 'var(--text)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'company' ? '🏢 Entreprise' : '👤 Employé'}
                </button>
              ))}
            </div>

            {!deductConfirm ? (
              <form onSubmit={handleDeductSubmit}>
                {deductTarget === 'company' && (
                  <div className="form-group">
                    <label className="form-label">Entreprise</label>
                    <div className="form-input" style={{ background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'default' }}>
                      {company.name} — solde actuel : {company.token_balance} tokens
                    </div>
                  </div>
                )}

                {deductTarget === 'employee' && (
                  <div className="form-group">
                    <label className="form-label">Employé</label>
                    <select
                      className="form-select"
                      value={deductUserId}
                      onChange={(e) => setDeductUserId(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner un employé…</option>
                      {[...employers, ...empList].map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.name} — {u.token_balance} tokens
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Montant à déduire</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="ex. 50"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Motif (facultatif)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                    placeholder="ex. Correction d'erreur"
                  />
                </div>

                {deductMsg && (
                  <p className={deductMsg.ok ? 'form-success' : 'form-error'} style={{ marginBottom: 12 }}>
                    {deductMsg.text}
                  </p>
                )}

                <button type="submit" className="btn btn-primary">
                  Déduire
                </button>
              </form>
            ) : (
              <div>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cible</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {deductTarget === 'company'
                        ? company.name
                        : (() => { const u = [...employers, ...empList].find(u => String(u.id) === deductUserId); return u ? `${u.first_name} ${u.name}` : '—'; })()
                      }
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tokens à déduire</span>
                    <span className="token-badge" style={{ fontSize: '1rem', background: '#fee2e2', color: '#dc2626' }}>−{deductAmount}</span>
                  </div>
                  {deductReason && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Motif</span>
                      <span style={{ fontSize: '0.85rem', textAlign: 'right' }}>{deductReason}</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Cette action est irréversible. Confirmez-vous la déduction ?
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-outline" onClick={() => setDeductConfirm(false)} disabled={deductPending}>
                    Annuler
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#dc2626', borderColor: '#dc2626' }}
                    onClick={handleDeductConfirm}
                    disabled={deductPending}
                  >
                    {deductPending ? 'Déduction…' : 'Confirmer la déduction'}
                  </button>
                </div>
              </div>
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
