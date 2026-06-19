import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../services/user.service";
import { managerService } from "../../services/manager.service";
import { useAuth } from "../../context/AuthContext";
import type { User, TokenTransaction } from "../../types";
import { fmt } from "../../utils/date";

function IconArrowLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState<User | null>(null);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [savingManager, setSavingManager] = useState(false);

  async function handlePromote() {
    if (!id) return;
    setPromoting(true);
    try {
      await managerService.promoteToManager(id);
      navigate("/employer/dashboard");
    } catch {
      setError("Erreur lors de la promotion.");
      setPromoting(false);
      setConfirmPromote(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    const promises = [
      userService.getById(id),
      userService.getHistory(id),
      currentUser?.company_id
        ? userService.getAll({ companyId: currentUser.company_id, role: "manager" })
        : Promise.resolve({ data: { data: [] } })
    ] as const;

    Promise.all(promises)
      .then(([emp, hist, mgrsResult]) => {
        setEmployee(emp);
        setHistory(hist);
        setEntryDate(emp.entry_date || "");
        const mgrList = (mgrsResult as any)?.data?.data || [];
        setManagers(mgrList);
        const activeMgrId = emp.team_memberships?.[0]?.team?.manager?.id || "";
        setSelectedManagerId(activeMgrId);
      })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [id, currentUser?.company_id]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await userService.delete(id);
      navigate("/employer/dashboard");
    } catch {
      setError("Erreur lors de la suppression.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>Chargement…</div>
    );
  if (!employee)
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>
        Employé introuvable.
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {employee.first_name} {employee.name}
          </h1>
          <p>{employee.email}</p>
        </div>
        <button
          className="back-btn"
          onClick={() => navigate("/employer/dashboard")}
        >
          <IconArrowLeft /> Retour
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Tokens</p>
          <p className="stat-value">{employee.token_balance}</p>
          <p className="stat-sub">solde actuel</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Membre depuis</p>
          <p className="stat-value" style={{ fontSize: "1.1rem" }}>
            {employee.entry_date ? fmt(employee.entry_date) : fmt(employee.created_at)}
          </p>
        </div>
      </div>

      {/* Informations */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
          Informations
        </h2>
        <div className="info-card-list">
          {[
            { label: "Prénom", value: employee.first_name },
            { label: "Nom", value: employee.name },
            { label: "Email", value: employee.email },
            { label: "Rôle", value: employee.role === "employee" ? "Collaborateur" : employee.role === "manager" ? "Manager" : employee.role },
          ].map(({ label, value }) => (
            <div key={label} className="info-field-card">
              <span className="info-field-label">{label}</span>
              <span className="info-field-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date d'entrée*/}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
          Date d'entrée
        </h2>

        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="form-input"
          style={{ width: 200 }}
        />

        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 10 }}
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);

              await userService.updateEntryDate(id!, entryDate);

              const updated = await userService.getById(id!);
              setEmployee(updated);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Sauvegarde..." : "Mettre à jour"}
        </button>
      </div>

      {/* Manager associé */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
          Manager associé
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="form-select"
            style={{ width: 250, minWidth: 150 }}
          >
            <option value="">Aucun manager (Non assigné)</option>
            {managers.map((mgr) => (
              <option key={mgr.id} value={mgr.id}>
                {mgr.first_name} {mgr.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            disabled={savingManager || selectedManagerId === (employee.team_memberships?.[0]?.team?.manager?.id || "")}
            onClick={async () => {
              try {
                setSavingManager(true);
                await userService.assignManager(id!, selectedManagerId || null);
                const updated = await userService.getById(id!);
                setEmployee(updated);
                const activeMgrId = updated.team_memberships?.[0]?.team?.manager?.id || "";
                setSelectedManagerId(activeMgrId);
              } catch (err) {
                setError("Erreur lors de l'attribution du manager.");
              } finally {
                setSavingManager(false);
              }
            }}
          >
            {savingManager ? "Enregistrement..." : "Valider l'attribution"}
          </button>
        </div>
      </div>

      {/* Historique des transactions */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
          Historique des tokens
        </h2>
        {history.length === 0 ? (
          <p className="empty-state">Aucune transaction.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id}>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(tx.created_at)}
                    </td>
                    <td>
                      <span
                        className="token-badge"
                        style={
                          tx.receiver_id === id
                            ? { background: "#f0fdf4", color: "var(--success)" }
                            : {
                                background: "var(--danger-light)",
                                color: "var(--danger)",
                              }
                        }
                      >
                        {tx.receiver_id === id ? "+" : "−"}
                        {tx.amount}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {tx.type ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          marginBottom: 20,
          borderColor: "rgba(79, 70, 229, 0.3)",
          background: "rgba(79, 70, 229, 0.02)",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--primary)",
          }}
        >
          Promouvoir en manager
        </h2>
        {!confirmPromote ? (
          <>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              Ce collaborateur pourra allouer des tokens aux autres salariés,
              accéder à l'historique et créer des collaborateurs. Une équipe sera
              automatiquement créée pour lui.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setConfirmPromote(true)}
            >
              Promouvoir en manager
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Confirmer la promotion de{" "}
              <strong>
                {employee.first_name} {employee.name}
              </strong>{" "}
              en tant que manager ?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePromote}
                disabled={promoting}
              >
                {promoting ? "Promotion…" : "Oui, promouvoir"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmPromote(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone suppression */}
      <div
        className="card"
        style={{
          borderColor: "rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.02)",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--danger)",
          }}
        >
          Supprimer l'employé
        </h2>
        {!confirmDelete ? (
          <>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              Cette action est irréversible. L'employé sera retiré de l'équipe
              et son compte supprimé.
            </p>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Confirmer la suppression de{" "}
              <strong>
                {employee.first_name} {employee.name}
              </strong>{" "}
              ?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Suppression…" : "Oui, supprimer"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
