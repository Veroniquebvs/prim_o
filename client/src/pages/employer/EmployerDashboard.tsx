import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { userService } from "../../services/user.service";
import { companyService } from "../../services/company.service";
import TransferForm from "../../components/TransferForm";
import type { User, Company } from "../../types";
import { PrintableQRCode } from "../../components/PrintableQRCode";

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<User[]>([]);
  const [entryDates, setEntryDates] = useState<Record<string, string>>({});
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
      await userService.activate(id, entryDates[id]);

      fetchData();
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
      <div className="page-header page-header--centered">
        <h1>
          Tableau de bord
          <br />
          {company?.name || "Chargement..."}
        </h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Budget tokens</p>
          <p className="stat-value">{company?.token_balance ?? 0}</p>
          <p className="stat-sub">tokens à distribuer</p>
        </div>
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
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <input
                type="date"
                value={entryDates[emp.id] || ""}
                onChange={(e) =>
                  setEntryDates({
                    ...entryDates,
                    [emp.id]: e.target.value,
                  })
                }
                style={{
                  padding: "6px",
                  borderRadius: "8px",
                }}
              />
              <span style={{ minWidth: 0, flex: 1 }}>
                {emp.first_name} {emp.name}
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.82rem",
                    marginLeft: 4,
                  }}
                >
                  ({emp.email})
                </span>
              </span>

              <button
                onClick={() => handleActivate(emp.id)}
                className="btn btn-primary btn-sm"
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
            <div
              className="table-wrap"
              style={{ maxHeight: 320, overflowY: "auto" }}
            >
              <table className="table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "7px 10px" }}>Nom</th>
                    <th style={{ padding: "7px 10px" }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(employees) &&
                    employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() =>
                          navigate(`/employer/employees/${emp.id}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: 500, padding: "8px 10px" }}>
                          {emp.first_name} {emp.name}
                        </td>
                        <td
                          style={{
                            color: "var(--text-muted)",
                            padding: "8px 10px",
                            fontSize: "0.82rem",
                          }}
                        >
                          {emp.email}
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
