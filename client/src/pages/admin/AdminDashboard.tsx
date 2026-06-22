/**
 * pages/admin/AdminDashboard.tsx — Company management hub for the admin role.
 *
 * Lists all registered companies with their current token balance. Clicking a company row
 * navigates to AdminCompanyDetail. Also provides an admin-level "grant tokens" form that
 * credits tokens directly to a company's token_balance outside the normal Stripe subscription
 * flow (for manual adjustments or corrections). The company list is updated in-place after
 * a successful grant without a full re-fetch.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { companyService } from '../../services/company.service';
import type { Company } from '../../types';

const EMPTY_COMPANY_FORM = {
  name: '',
  email: '',
  street: '',
  zip_code: '',
  city: '',
  siret: '',
};


export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* Donner des tokens */
  const [grantCompanyId, setGrantCompanyId] = useState('');
  const [grantAmount, setGrantAmount]       = useState('');
  const [granting, setGranting]             = useState(false);
  const [grantError, setGrantError]         = useState('');
  const [grantSuccess, setGrantSuccess]     = useState('');

  /* Créer une entreprise */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_COMPANY_FORM);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);


  useEffect(() => {
    companyService
      .getAll()
      .then(setCompanies)
      .catch(() => setError('Impossible de charger les entreprises.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGrantTokens(e: React.FormEvent) {
    e.preventDefault();
    if (!grantCompanyId || !grantAmount) return;
    setGrantError(''); setGrantSuccess('');
    setGranting(true);
    try {
      const res = await companyService.grantTokens(grantCompanyId, Number(grantAmount));
      const company = companies.find(c => c.id === grantCompanyId);
      setGrantSuccess(`${res.amount} tokens ajoutés à ${company?.name ?? '—'}. Nouveau solde : ${res.new_balance} tokens.`);
      setGrantAmount('');
      setGrantCompanyId('');
      /* Rafraîchit les soldes dans la liste */
      setCompanies(prev => prev.map(c =>
        c.id === grantCompanyId ? { ...c, token_balance: res.new_balance } : c
      ));
    } catch {
      setGrantError('Erreur lors de l\'attribution des tokens.');
    } finally {
      setGranting(false);
    }
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email || undefined,
        street: createForm.street,
        zip_code: createForm.zip_code,
        city: createForm.city,
        siret: createForm.siret,
      };
      const newCompany = await companyService.create(payload);
      setCompanies(prev => [newCompany, ...prev]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_COMPANY_FORM);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? "Erreur lors de la création de l'entreprise.");
    } finally {
      setCreateLoading(false);
    }
  }


  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const totalTokens = companies.reduce((sum, c) => sum + c.token_balance, 0);

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
          <h1>Liste des entreprises</h1>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Entreprises</p>
          <p className="stat-value">{companies.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Tokens en circulation</p>
          <p className="stat-value">{totalTokens}</p>
        </div>
        <div
          className="stat-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed var(--primary)',
            background: 'rgba(0, 161, 154, 0.03)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => {
            setCreateForm(EMPTY_COMPANY_FORM);
            setCreateError('');
            setShowCreateModal(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 161, 154, 0.08)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 161, 154, 0.03)';
            e.currentTarget.style.transform = '';
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 26, height: 26, color: 'var(--primary)', marginBottom: 6 }}
            >
              {/* Building outline */}
              <path d="M3 21h18" />
              <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
              {/* Windows */}
              <path d="M9 7h1" />
              <path d="M9 11h1" />
              <path d="M9 15h1" />
              {/* Plus badge on side */}
              <path d="M18 10h4" />
              <path d="M20 8v4" />
            </svg>
            <p className="stat-label" style={{ margin: 0, fontWeight: 600, color: 'var(--primary)' }}>
              Créer une entreprise
            </p>
          </div>
        </div>
      </div>


      {/* Donner des tokens */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>🪙 Donner des tokens</h2>
        <form onSubmit={handleGrantTokens}>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Entreprise</label>
              <select
                className="form-input"
                value={grantCompanyId}
                onChange={e => { setGrantCompanyId(e.target.value); setGrantSuccess(''); }}
                required
              >
                <option value="">— Choisir une entreprise —</option>
                {companies.map(c => {
                  const addr = [c.street, c.zip_code, c.city].filter(Boolean).join(', ');
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}{addr ? ` — ${addr}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Montant de tokens</label>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="ex : 500"
                value={grantAmount}
                onChange={e => { setGrantAmount(e.target.value); setGrantSuccess(''); }}
                required
              />
            </div>
          </div>
          {grantError   && <p className="form-error"   style={{ marginBottom: 10 }}>{grantError}</p>}
          {grantSuccess && <p className="form-success" style={{ marginBottom: 10 }}>{grantSuccess}</p>}
          <button type="submit" className="btn btn-primary" disabled={granting}>
            {granting ? 'Attribution…' : 'Attribuer les tokens'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>
          Entreprises
        </h2>
        {companies.length === 0 ? (
          <p className="empty-state">Aucune entreprise enregistrée.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {companies.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/admin/companies/${c.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {[c.street, c.city].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="emp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">Créer une entreprise</h2>

            <form onSubmit={handleCreateCompany} noValidate>
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="ex : Acme Corp"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email de contact (optionnel)</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="contact@acme.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">SIRET (14 chiffres, optionnel)</label>
                <input
                  className="form-input"
                  type="text"
                  maxLength={14}
                  placeholder="12345678901234"
                  value={createForm.siret}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setCreateForm({ ...createForm, siret: val });
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse (optionnelle)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Rue, avenue..."
                  value={createForm.street}
                  onChange={(e) => setCreateForm({ ...createForm, street: e.target.value })}
                  style={{ marginBottom: 12 }}
                />
                <div className="emp-modal-row">
                  <div>
                    <input
                      className="form-input"
                      type="text"
                      maxLength={5}
                      placeholder="CP (5 chiffres)"
                      value={createForm.zip_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCreateForm({ ...createForm, zip_code: val });
                      }}
                    />
                  </div>
                  <div>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Ville"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {createError && <p className="form-error">{createError}</p>}

              <div className="emp-modal-actions">
                <button
                  type="button"
                  style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Retour
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
