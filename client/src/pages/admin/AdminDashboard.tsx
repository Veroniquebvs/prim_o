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
import { userService } from '../../services/user.service';
import { tokenService } from '../../services/token.service';
import type { Company, User } from '../../types';
import UserSelectionModal from '../../components/UserSelectionModal';
import CompanySelectionModal from '../../components/CompanySelectionModal';

const EMPTY_COMPANY_FORM = {
  name: '',
  street: '',
  zip_code: '',
  city: '',
  siret: '',
  employer_name: '',
  employer_first_name: '',
  employer_email: '',
  password: '',
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

  /* Déduction de tokens */
  type DeductTarget = 'company' | 'employee';
  const [deductTarget, setDeductTarget] = useState<DeductTarget>('company');
  const [deductCompanyId, setDeductCompanyId] = useState('');
  const [deductUserId, setDeductUserId] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [deductPending, setDeductPending] = useState(false);
  const [deductConfirm, setDeductConfirm] = useState(false);
  const [deductMsg, setDeductMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deductCompanyUsers, setDeductCompanyUsers] = useState<User[]>([]);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showDeductCompanyModal, setShowDeductCompanyModal] = useState(false);
  const [showGrantCompanyModal, setShowGrantCompanyModal] = useState(false);

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

  useEffect(() => {
    if (!deductCompanyId) {
      setDeductCompanyUsers([]);
      setDeductUserId('');
      return;
    }
    userService.getAll({ companyId: deductCompanyId }).then(res => {
      setDeductCompanyUsers((res as any).data?.data || []);
    });
  }, [deductCompanyId]);

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

  function handleDeductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDeductMsg(null);
    setDeductConfirm(true);
  }

  async function handleDeductConfirm() {
    if (!deductCompanyId) return;
    setDeductPending(true);
    try {
      await tokenService.adminDeduct({
        target: deductTarget,
        company_id: deductCompanyId,
        user_id: deductTarget === 'employee' ? deductUserId : undefined,
        amount: Number(deductAmount),
        reason: deductReason || undefined,
      });
      // Rafraîchit les entreprises
      const freshCompanies = await companyService.getAll();
      setCompanies(freshCompanies);
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

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const payload = {
        name: createForm.name,
        street: createForm.street,
        zip_code: createForm.zip_code,
        city: createForm.city,
        siret: createForm.siret,
        employer_name: createForm.employer_name,
        employer_first_name: createForm.employer_first_name,
        employer_email: createForm.employer_email,
        password: createForm.password || undefined,
      };
      const res = await companyService.adminCreate(payload);
      setCompanies(prev => [res.company, ...prev]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_COMPANY_FORM);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || err?.response?.data?.message || "Erreur lors de la création de l'entreprise.");
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
      <div className="page-header page-header--clean">
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1>Entreprises</h1>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Entreprises</p>
          <p className="stat-value">{companies.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Tokens en circulation</p>
          <p className="stat-value">{totalTokens}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Entreprises
          </h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setCreateForm(EMPTY_COMPANY_FORM); setCreateError(''); setShowCreateModal(true); }}
          >
            + Créer une entreprise
          </button>
        </div>
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

      {/* Donner des tokens */}
      <div className="card" style={{ marginBottom: 20, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>🪙 Donner des tokens</h2>
        <form onSubmit={handleGrantTokens}>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Entreprise</label>
              <button
                type="button"
                className="form-input"
                style={{ textAlign: 'left', background: 'var(--bg)', color: grantCompanyId ? 'var(--text)' : 'var(--text-muted)' }}
                onClick={() => setShowGrantCompanyModal(true)}
              >
                {grantCompanyId ? (() => {
                  const c = companies.find(x => x.id === grantCompanyId);
                  return c ? `${c.name} — solde : ${c.token_balance} tokens` : 'Sélectionner une entreprise...';
                })() : 'Sélectionner une entreprise...'}
              </button>
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

      {/* Déduction de tokens */}
      <div className="card" style={{ marginBottom: 20, background: '#fff1f1', borderColor: '#fecaca' }}>
        <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>🔻 Déduire des tokens</h2>
        
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
              {t === 'company' ? '🏢 Entreprise' : '👤 Individuel'}
            </button>
          ))}
        </div>

        {!deductConfirm ? (
          <form onSubmit={handleDeductSubmit}>
            <div className="form-group">
              <label className="form-label">Entreprise</label>
              <button
                type="button"
                className="form-input"
                style={{ textAlign: 'left', background: 'var(--bg)', color: deductCompanyId ? 'var(--text)' : 'var(--text-muted)' }}
                onClick={() => setShowDeductCompanyModal(true)}
              >
                {deductCompanyId ? (() => {
                  const c = companies.find(x => x.id === deductCompanyId);
                  return c ? `${c.name} — solde : ${c.token_balance} tokens` : 'Sélectionner une entreprise...';
                })() : 'Sélectionner une entreprise...'}
              </button>
            </div>

            {deductTarget === 'employee' && (
              <div className="form-group">
                <label className="form-label">Employé</label>
                <button
                  type="button"
                  className="form-input"
                  style={{ textAlign: 'left', background: 'var(--bg)', color: deductUserId ? 'var(--text)' : 'var(--text-muted)' }}
                  onClick={() => {
                    if (!deductCompanyId) {
                      setDeductMsg({ ok: false, text: 'Veuillez d\'abord sélectionner une entreprise.' });
                      return;
                    }
                    setShowDeductModal(true);
                  }}
                >
                  {deductUserId ? (() => {
                    const u = deductCompanyUsers.find(x => x.id === deductUserId);
                    return u ? `${u.first_name} ${u.name} — ${u.token_balance} tokens` : 'Sélectionner un utilisateur...';
                  })() : 'Sélectionner un utilisateur...'}
                </button>
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

            <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>
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
                    ? companies.find(c => c.id === deductCompanyId)?.name || '—'
                    : (() => { const u = deductCompanyUsers.find(u => String(u.id) === deductUserId); return u ? `${u.first_name} ${u.name}` : '—'; })()
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

      {showCreateModal && (
        <div className="emp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', width: '100%', maxWidth: '500px' }}>
            <h2 className="emp-modal-title" style={{ marginBottom: 20 }}>Créer une entreprise</h2>

            <form onSubmit={handleCreateCompany} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Section Entreprise */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', margin: 0, letterSpacing: '0.5px' }}>
                  🏢 Informations de l'entreprise
                </h3>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Numéro SIRET (14 chiffres) *</label>
                  <input
                    className="form-input"
                    type="text"
                    maxLength={14}
                    placeholder="ex : 12345678901234"
                    value={createForm.siret}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCreateForm({ ...createForm, siret: val });
                    }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Adresse de l'entreprise *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Rue, avenue..."
                    value={createForm.street}
                    onChange={(e) => setCreateForm({ ...createForm, street: e.target.value })}
                    style={{ marginBottom: 10 }}
                    required
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                    <input
                      className="form-input"
                      type="text"
                      maxLength={5}
                      placeholder="Code Postal"
                      value={createForm.zip_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCreateForm({ ...createForm, zip_code: val });
                      }}
                      required
                    />
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Ville"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section Employeur */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', margin: 0, letterSpacing: '0.5px' }}>
                  👤 Informations de l'employeur
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Prénom *</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Jean"
                      value={createForm.employer_first_name}
                      onChange={(e) => setCreateForm({ ...createForm, employer_first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nom *</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Dupont"
                      value={createForm.employer_name}
                      onChange={(e) => setCreateForm({ ...createForm, employer_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email de l'employeur *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="jean.dupont@acme.com"
                    value={createForm.employer_email}
                    onChange={(e) => setCreateForm({ ...createForm, employer_email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mot de passe de l'employeur (min. 8 car.) *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Saisir le mot de passe"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              {createError && <p className="form-error" style={{ margin: 0 }}>{createError}</p>}

              <div className="emp-modal-actions" style={{ marginTop: 8 }}>
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

      {showDeductModal && (
        <UserSelectionModal
          users={deductCompanyUsers.filter(u => u.role === 'manager' || u.role === 'employee')}
          title="Sélectionner un utilisateur"
          onSelect={(id) => { setDeductUserId(id); setShowDeductModal(false); }}
          onClose={() => setShowDeductModal(false)}
        />
      )}

      {showDeductCompanyModal && (
        <CompanySelectionModal
          companies={companies}
          title="Sélectionner une entreprise"
          onSelect={(id) => { setDeductCompanyId(id); setDeductUserId(''); setShowDeductCompanyModal(false); }}
          onClose={() => setShowDeductCompanyModal(false)}
        />
      )}

      {showGrantCompanyModal && (
        <CompanySelectionModal
          companies={companies}
          title="Sélectionner une entreprise"
          onSelect={(id) => { setGrantCompanyId(id); setGrantSuccess(''); setShowGrantCompanyModal(false); }}
          onClose={() => setShowGrantCompanyModal(false)}
        />
      )}

    </div>
  );
}
