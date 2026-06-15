import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import type { TokenTransaction } from '../../types';
import { fmtShort } from '../../utils/date';

export default function Profil() {
  const { user, company, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [history, setHistory] = useState<TokenTransaction[]>([]);

  useEffect(() => {
    if (user?.id) {
      userService.getHistory(user.id).then(setHistory).catch(() => {});
    }
  }, [user?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await userService.update(user.id, { name });
      await refreshUser();
      setSaveMsg('Nom mis à jour.');
    } catch {
      setSaveMsg('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  const isError = saveMsg.startsWith('Erreur');

  return (
    <div>
      <div className="page-header">
        <h1>Profil</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 600 }}>
            Informations
          </h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Nom
              </label>
              <input
                id="name"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={user?.email ?? ''}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rôle</label>
              <input
                className="form-input"
                type="text"
                value={user?.role ?? ''}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label">Solde tokens</label>
              <input
                className="form-input"
                type="text"
                value={user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0)}
                disabled
              />
            </div>

            {saveMsg && (
              <p className={isError ? 'form-error' : 'form-success'}>{saveMsg}</p>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>
            Historique des tokens
          </h2>
          {history.length === 0 ? (
            <p className="empty-state">Aucune transaction.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Montant</th>
                    <th>Motif</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="token-badge">{tx.amount}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {tx.reason}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {fmtShort(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
