import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function PasswordField({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd-field-card">
      <label className="info-field-label" htmlFor={id}>{label}</label>
      <div className="pwd-input-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="pwd-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className="pwd-eye-btn"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          <EyeIcon visible={show} />
        </button>
      </div>
    </div>
  );
}

export default function MotDePasse() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [current, setCurrent]     = useState('');
  const [next, setNext]           = useState('');
  const [repeat, setRepeat]       = useState('');
  const [showRepeat, setShowRepeat] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [isError, setIsError]     = useState(false);

  const rules = [
    { label: '8 caractères minimum',    ok: next.length >= 8 },
    { label: '1 chiffre',               ok: /\d/.test(next) },
    { label: '1 majuscule',             ok: /[A-Z]/.test(next) },
    { label: '1 minuscule',             ok: /[a-z]/.test(next) },
    { label: '1 caractère spécial',     ok: /[^A-Za-z0-9]/.test(next) },
  ];

  const allRulesOk  = rules.every((r) => r.ok);
  const passwordsMatch = next === repeat && repeat.length > 0;
  const canSubmit   = current.length > 0 && allRulesOk && passwordsMatch && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setSaving(true);
    setMsg('');
    try {
      await userService.update(user.id, { current_password: current, password: next });
      setMsg('Mot de passe modifié avec succès.');
      setIsError(false);
      setCurrent('');
      setNext('');
      setRepeat('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMsg(axiosErr.response?.data?.error ?? 'Mot de passe actuel incorrect.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Mot de passe</h1>
          <p>Sécurisez votre compte</p>
        </div>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="info-card-list">

          <PasswordField
            id="current"
            label="Ancien mot de passe"
            value={current}
            onChange={(v) => { setCurrent(v); setMsg(''); }}
          />

          <PasswordField
            id="next"
            label="Nouveau mot de passe"
            value={next}
            onChange={(v) => { setNext(v); setMsg(''); }}
          />

          {/* Prerequisites */}
          {next.length > 0 && (
            <div className="pwd-rules-card">
              <p className="pwd-rules-title">Prérequis du mot de passe</p>
              <ul className="pwd-rules-list">
                {rules.map((r) => (
                  <li key={r.label} className={`pwd-rule ${r.ok ? 'pwd-rule--ok' : ''}`}>
                    <CheckIcon ok={r.ok} />
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pwd-field-card">
            <label className="info-field-label" htmlFor="repeat">Répéter le mot de passe</label>
            <div className="pwd-input-wrap">
              <input
                id="repeat"
                type={showRepeat ? 'text' : 'password'}
                className="pwd-input"
                value={repeat}
                onChange={(e) => { setRepeat(e.target.value); setMsg(''); }}
                autoComplete="off"
              />
              {repeat.length > 0 && (
                <span style={{ color: passwordsMatch ? 'var(--primary)' : 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  {passwordsMatch ? '✓' : '✗'}
                </span>
              )}
              <button
                type="button"
                className="pwd-eye-btn"
                onClick={() => setShowRepeat((v) => !v)}
                aria-label={showRepeat ? 'Masquer' : 'Afficher'}
              >
                <EyeIcon visible={showRepeat} />
              </button>
            </div>
          </div>

        </div>

        {msg && (
          <p className={isError ? 'form-error' : 'form-success'} style={{ marginTop: 12 }}>{msg}</p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            marginTop: 20,
            width: '100%',
            opacity: canSubmit ? 1 : 0.45,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
          disabled={!canSubmit}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
