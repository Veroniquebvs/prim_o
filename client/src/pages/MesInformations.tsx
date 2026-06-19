import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { companyService } from '../services/company.service';

export default function MesInformations() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [name, setName]           = useState(user?.name ?? '');
  const [email, setEmail]         = useState(user?.email ?? '');
  const [company, setCompany]     = useState('');
  const [siret, setSiret]         = useState('');

  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const isDirty =
    firstName !== (user?.first_name ?? '') ||
    name      !== (user?.name ?? '')       ||
    email     !== (user?.email ?? '');

  useEffect(() => {
    if (user?.company_id) {
      companyService.getById(user.company_id).then((c) => { setCompany(c.name); setSiret(c.siret ?? ''); }).catch(() => {});
    }
  }, [user?.company_id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !isDirty) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await userService.update(user.id, { first_name: firstName, name, email });
      await refreshUser();
      setSaveMsg('Informations enregistrées.');
    } catch {
      setSaveMsg('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  const isError = saveMsg.startsWith('Erreur');

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Mes informations</h1>
          <p>Vos informations personnelles</p>
        </div>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="info-card-list">

          <div className="info-field-card">
            <label className="info-field-label" htmlFor="firstName">Prénom</label>
            <input
              id="firstName"
              className="info-field-input"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setSaveMsg(''); }}
            />
          </div>

          <div className="info-field-card">
            <label className="info-field-label" htmlFor="name">Nom</label>
            <input
              id="name"
              className="info-field-input"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaveMsg(''); }}
            />
          </div>

          <div className="info-field-card">
            <span className="info-field-label">Entreprise</span>
            <span className="info-field-value">{company || '—'}</span>
          </div>

          {user?.role === 'employer' && (
            <div className="info-field-card">
              <span className="info-field-label">SIRET</span>
              <span className="info-field-value">{siret || '—'}</span>
            </div>
          )}

          <div className="info-field-card">
            <label className="info-field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="info-field-input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaveMsg(''); }}
            />
          </div>

        </div>

        {saveMsg && (
          <p className={isError ? 'form-error' : 'form-success'} style={{ marginTop: 12 }}>{saveMsg}</p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: 20, width: '100%', opacity: isDirty ? 1 : 0.45, cursor: isDirty ? 'pointer' : 'not-allowed' }}
          disabled={!isDirty || saving}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
