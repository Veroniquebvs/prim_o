/**
 * pages/RegisterPage.tsx — Account creation page for both employers and employees.
 *
 * Supports two registration paths:
 * 1. Direct registration: the user picks their role (employer or employee) and fills in the
 *    corresponding fields. Employers must supply company details (name, SIRET, address); a new
 *    company record is created before the user account.
 * 2. QR-code registration: if a `?companyId=<id>` query param is present (scanned from the
 *    PrintableQRCode poster), the role is locked to employee, the company is pre-resolved
 *    (name fetched via the public endpoint), and the company ID field is non-editable.
 *
 * On successful registration, navigates to the role-appropriate dashboard.
 */
import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { companyService } from "../services/company.service";

type Role = "employer" | "employee";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qrCompanyId = searchParams.get("companyId") ?? "";

  const [role, setRole] = useState<Role>(qrCompanyId ? "employee" : "employee");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Champs entreprise
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [companyId, setCompanyId] = useState(qrCompanyId);
  const [qrCompanyName, setQrCompanyName] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!qrCompanyId) return;
    companyService.getPublicById(qrCompanyId)
      .then((c) => setQrCompanyName(c.name))
      .catch(() => {});
  }, [qrCompanyId]);

  if (isLoading) return null;

  // Si déjà connecté ET pas de QR code → rediriger vers le dashboard
  if (isAuthenticated && user && !qrCompanyId) {
    if (user.role === "employer")
      return <Navigate to="/employer/dashboard" replace />;
    if (user.role === "admin")
      return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/pour-toi" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let cId = companyId;

      if (role === "employer") {
        // Submitting updated company details
        const company = await companyService.create({
          name: companyName,
          siret,
          street,
          zip_code: zipCode,
          city,
        });
        cId = company.id;
      }

      await register({
        first_name: firstName,
        name: lastName,
        email,
        password,
        role,
        company_id: cId || undefined,
      });

      if (role === "employer") {
        navigate("/employer/dashboard", { replace: true });
      } else {
        navigate("/pour-toi", { replace: true });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ??
          "Erreur lors de la création du compte.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/assets/logo_1.png" alt="prim'o" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
        </div>

        {qrCompanyId ? (
          <>
            <h1 className="auth-title">Créer votre compte collaborateur</h1>
            <p className="auth-subtitle">
              Vous rejoignez{' '}
              <strong>{qrCompanyName || '…'}</strong>
            </p>
          </>
        ) : (
          <h1 className="auth-title">Créer un compte</h1>
        )}

        <form onSubmit={handleSubmit}>
          {/* Rôle — masqué si l'inscription vient d'un QR code (rôle forcé à employé) */}
          {!qrCompanyId && (
            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Je suis
              </label>
              <select
                id="role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="employee">Collaborateur</option>
                <option value="employer">Employeur</option>
              </select>
            </div>
          )}

          {/* Name and Lastname */}
          <div className="form-group">
            <label className="form-label" htmlFor="firstName">
              Prénom
            </label>
            <input
              id="firstName"
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="lastName">
              Nom de famille
            </label>
            <input
              id="lastName"
              className="form-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Employer-specific fields */}
          {role === "employer" && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="companyName">
                  Nom de l'entreprise
                </label>
                <input
                  id="companyName"
                  className="form-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="siret">
                  SIRET (14 chiffres)
                </label>
                <input
                  id="siret"
                  className="form-input"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  required
                  maxLength={14}
                  pattern="\d{14}"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="street">
                  Adresse
                </label>
                <input
                  id="street"
                  className="form-input"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="zipCode">
                    Code Postal
                  </label>
                  <input
                    id="zipCode"
                    className="form-input"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    maxLength={5}
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label" htmlFor="city">
                    Ville
                  </label>
                  <input
                    id="city"
                    className="form-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Employee-specific fields */}
          {role === "employee" && (
            <div className="form-group">
              <label className="form-label">Entreprise</label>
              {qrCompanyId ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--primary)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {qrCompanyName || '…'}
                </div>
              ) : (
                <input
                  id="companyId"
                  className="form-input"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="ID de votre entreprise"
                />
              )}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? "Création…" : "Créer le compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
