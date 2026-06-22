/**
 * pages/employee/Parameters.tsx — App preferences and account deletion page.
 *
 * Stores three preferences in localStorage (email offers toggle, notifications toggle, language).
 * These are client-side only and not synced to the server in the current implementation.
 * The useLocalBool hook is a local helper that reads/writes a boolean localStorage key and
 * keeps React state in sync.
 *
 * Account deletion requires a two-step confirmation: clicking "Supprimer mon compte" reveals
 * a confirmation message, and only a second explicit click triggers the API call. On success,
 * the session is logged out and the user is redirected to /login.
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { userService } from '../../services/user.service';

function useLocalBool(key: string, defaultValue = false) {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === 'true' : defaultValue;
  });
  function toggle() {
    setValue((v) => {
      localStorage.setItem(key, String(!v));
      return !v;
    });
  }
  return [value, toggle] as const;
}

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`param-toggle ${checked ? 'param-toggle--on' : ''}`}
    />
  );
}

export default function Parameters() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [emailOffers, toggleEmailOffers] = useLocalBool('pref_email_offers', true);
  const [notifications, toggleNotifications] = useLocalBool('pref_notifications', true);
  const [lang, setLang] = useState<'fr' | 'en'>(() =>
    (localStorage.getItem('pref_lang') as 'fr' | 'en') || 'fr'
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function handleLang(l: 'fr' | 'en') {
    setLang(l);
    localStorage.setItem('pref_lang', l);
  }

  async function handleDelete() {
    if (!user?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await userService.delete(user.id);
      await logout();
      navigate('/login');
    } catch {
      setDeleteError('Impossible de supprimer le compte. Réessayez.');
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Paramètres</h1>
          <p>Préférences et compte</p>
        </div>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div className="param-list">

        {/* Email offers */}
        <div className="param-card">
          <div className="param-row">
            <div className="param-info">
              <span className="param-label">Recevoir les nouvelles offres par e-mail</span>
              <span className="param-desc">Soyez alerté des bons du moment</span>
            </div>
            <Toggle checked={emailOffers} onToggle={toggleEmailOffers} />
          </div>
        </div>

        {/* Notifications */}
        <div className="param-card">
          <div className="param-row">
            <div className="param-info">
              <span className="param-label">Notifications</span>
              <span className="param-desc">Alertes de réception de tokens</span>
            </div>
            <Toggle checked={notifications} onToggle={toggleNotifications} />
          </div>
        </div>

        {/* Language */}
        <div className="param-card">
          <div className="param-row">
            <div className="param-info">
              <span className="param-label">Langue</span>
              <span className="param-desc">Langue d'affichage de l'application</span>
            </div>
            <div className="param-lang-group">
              <button
                className={`param-lang-btn ${lang === 'fr' ? 'param-lang-btn--active' : ''}`}
                onClick={() => handleLang('fr')}
              >
                Français
              </button>
              <button
                className={`param-lang-btn ${lang === 'en' ? 'param-lang-btn--active' : ''}`}
                onClick={() => handleLang('en')}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Delete account */}
        <div className="param-card param-card--danger">
          {!confirmDelete ? (
            <button className="param-delete-btn" onClick={() => setConfirmDelete(true)}>
              Supprimer mon compte
            </button>
          ) : (
            <div className="param-delete-confirm">
              <p className="param-delete-warning">
                Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement.
              </p>
              {deleteError && <p className="form-error" style={{ marginBottom: 12 }}>{deleteError}</p>}
              <div className="param-delete-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
