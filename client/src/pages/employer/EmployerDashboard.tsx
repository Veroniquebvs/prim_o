import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { userService } from "../../services/user.service";
import { companyService } from "../../services/company.service";
import TransferForm from "../../components/TransferForm";
import type { User, Company } from "../../types";
import { Link } from "react-router-dom";
import { PrintableQRCode } from "../../components/PrintableQRCode";

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const results = await Promise.all([
        userService.getAll({ companyId: user.company_id, role: "employee" }),
        companyService.getById(user.company_id),
        userService.getPending(user.company_id),
      ]);

      // results[0] est la réponse axios pour getAll
      // results[0].data contient { success: true, data: [...] }
      setEmployees(results[0].data.data || []);

      // results[1] est la réponse axios pour getById (compagnie)
      setCompany(results[1].data || results[1]);

      // results[2] est la réponse axios pour getPending
      // results[2].data contient directement le tableau [...]
      setPendingEmployees(results[2].data || []);
    } catch (err) {
      console.error("Erreur :", err);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  const handleActivate = async (id: string) => {
    try {
      await userService.activate(id);
      fetchData(); // Rafraîchit tout après activation
    } catch {
      alert("Erreur lors de la validation");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>Chargement…</div>
    );

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          className="page-header"
          style={{
            textAlign: "center",
            marginBottom: "32px",
            marginTop: "16px",
          }}
        >
          <h1
            style={{ fontSize: "1.2rem", fontWeight: 500, marginBottom: "8px" }}
          >
            Tableau de bord
          </h1>

          {/* Prénom + Première lettre du nom de famille avec un point */}
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            {user?.first_name} {user?.name ? user.name.charAt(0) + "." : ""}
          </p>

          {/* Nom de l'entreprise : Plus gros et en majuscules */}
          <h2
            style={{
              fontSize: "2.5rem",
              textTransform: "uppercase",
              fontWeight: "800",
              color: "#ffffff",
            }}
          >
            {company?.name || "Chargement..."}
          </h2>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Équipe</p>
          <p className="stat-value">{employees.length}</p>
          <p className="stat-sub">employé{employees.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {/* QRCode */}
      {company && (
        <PrintableQRCode companyId={company.id} companyName={company.name} />
      )}

      {/* SECTION FOR EMPLOYEES ON WAITING LIST */}
      {pendingEmployees.length > 0 && (
        <div
          className="card"
          style={{ marginBottom: "32px", borderColor: "var(--primary)" }}
        >
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>
            Salariés en attente de validation
          </h2>
          {pendingEmployees.map((emp) => (
            <div
              key={emp.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {emp.first_name} {emp.name} ({emp.email})
              </span>
              <button
                onClick={() => handleActivate(emp.id)}
                className="btn btn-primary"
              >
                Valider
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2">
        <TransferForm employees={employees} onSuccess={fetchData} />

        <div className="card">
          <h2 style={{ marginBottom: 16, fontSize: "1rem", fontWeight: 600 }}>
            Employés
          </h2>
          {employees.length === 0 ? (
            <p className="empty-state">Aucun employé dans votre équipe.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(employees) &&
                    employees.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 500 }}>{emp.name}</td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {emp.email}
                        </td>
                        <td>
                          <span className="token-badge">
                            {emp.token_balance}
                          </span>
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
