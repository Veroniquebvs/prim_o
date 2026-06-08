import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { companyService } from "../services/company.service";

type Role = "employer" | "employee";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("employee");
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
  const [companyId, setCompanyId] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;

  if (isAuthenticated && user) {
    if (user.role === "employer")
      return <Navigate to="/employer/dashboard" replace />;
    if (user.role === "admin")
      return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/catalogue" replace />;
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
        navigate("/catalogue", { replace: true });
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
        <div className="auth-logo">PRIM'O</div>
        <h1 className="auth-title">Créer un compte</h1>

        <form onSubmit={handleSubmit}>
          {/* Rôle */}
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
              <option value="employee">Employé</option>
              <option value="employer">Employeur</option>
            </select>
          </div>

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
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
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
              <label className="form-label" htmlFor="companyId">
                ID de votre entreprise
              </label>
              <input
                id="companyId"
                className="form-input"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
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
