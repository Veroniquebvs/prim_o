import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { companyService } from '../../services/company.service';
import type { Company } from '../../types';

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

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const totalTokens = companies.reduce((sum, c) => sum + c.token_balance, 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Entreprises</h1>
          <p>Bienvenue, {user?.name}</p>
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
    </div>
  );
}
