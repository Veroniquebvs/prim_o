import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { managerService } from "../../services/manager.service";
import { userService } from "../../services/user.service";
import type { User, Team, TokenTransaction } from "../../types";
import { fmt } from "../../utils/date";

function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function ManagerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [manager, setManager] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [promoting, setPromoting] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [demoting, setDemoting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      managerService.getManagerTeam(id),
      userService.getHistory(id),
    ])
      .then(([teamData, hist]) => {
        setManager(teamData.manager);
        setTeam(teamData.team);
        setHistory(hist);
      })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDemote() {
    if (!id) return;
    setDemoting(true);
    try {
      await managerService.demoteToEmployee(id);
      navigate("/employer/dashboard");
    } catch {
      setError("Erreur lors de la rétrogradation.");
      setDemoting(false);
      setConfirmDemote(false);
    }
  }

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Chargement…</div>;
  if (!manager) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Manager introuvable.</div>;

  const tokensReceived = history
    .filter((tx) => tx.receiver_id === id && tx.type === "employer_to_manager")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const tokensGiven = history
    .filter((tx) => tx.sender_id === id && tx.type === "manager_to_employee")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const teamMembers = team?.members ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{manager.first_name} {manager.name}</h1>
          <p>{manager.email}</p>
        </div>
        <button className="back-btn" onClick={() => navigate("/employer/dashboard")}>
          <IconArrowLeft /> Retour
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Solde tokens</p>
          <p className="stat-value">{manager.token_balance}</p>
          <p className="stat-sub">tokens disponibles</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Équipe</p>
          <p className="stat-value">{teamMembers.length}</p>
          <p className="stat-sub">membre{teamMembers.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Tokens distribués</p>
          <p className="stat-value">{tokensGiven}</p>
          <p className="stat-sub">vers son équipe</p>
        </div>
      </div>

      {/* Informations */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Informations</h2>
        <div className="info-card-list">
          {[
            { label: "Prénom", value: manager.first_name },
            { label: "Nom", value: manager.name },
            { label: "Email", value: manager.email },
            { label: "Équipe", value: team?.name ?? "Aucune équipe active" },
          ].map(({ label, value }) => (
            <div key={label} className="info-field-card">
              <span className="info-field-label">{label}</span>
              <span className="info-field-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Membres de l'équipe */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
          Membres de l'équipe
          {team && (
            <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: 8 }}>
              {team.name}
            </span>
          )}
        </h2>
        {teamMembers.length === 0 ? (
          <p className="empty-state">Aucun membre dans l'équipe.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th style={{ textAlign: "right" }}>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr
                    key={m.user_id}
                    onClick={() => navigate(`/employer/employees/${m.user_id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>
                      {m.user?.first_name} {m.user?.name}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {m.user?.email}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="token-badge">{m.user?.token_balance ?? 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique des transactions */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Historique des tokens</h2>
        {history.length === 0 ? (
          <p className="empty-state">Aucune transaction.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Type</th>
                  <th>Vers / De</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => {
                  const isCredit = tx.receiver_id === id;
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmt(tx.created_at)}
                      </td>
                      <td>
                        <span
                          className="token-badge"
                          style={
                            isCredit
                              ? { background: "#f0fdf4", color: "var(--success)" }
                              : { background: "var(--danger-light)", color: "var(--danger)" }
                          }
                        >
                          {isCredit ? "+" : "−"}{tx.amount}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {tx.type ?? "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {isCredit
                          ? (tx.sender ? `${tx.sender.first_name} ${tx.sender.name}` : "—")
                          : (tx.receiver ? `${tx.receiver.first_name} ${tx.receiver.name}` : "—")
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Zone rétrogradation */}
      <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.02)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8, color: "var(--danger)" }}>
          Rétrograder en collaborateur
        </h2>
        {!confirmDemote ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 14 }}>
              L'équipe sera dissoute, les membres libérés et les allocations automatiques désactivées.
              Le solde de tokens reste intact.
            </p>
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDemote(true)}>
              Rétrograder
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Confirmer la rétrogradation de{" "}
              <strong>{manager.first_name} {manager.name}</strong> ?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-danger btn-sm" onClick={handleDemote} disabled={demoting}>
                {demoting ? "En cours…" : "Oui, rétrograder"}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmDemote(false)}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
