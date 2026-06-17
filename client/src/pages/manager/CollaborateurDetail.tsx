import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../services/user.service";
import type { User, TokenTransaction } from "../../types";
import { fmt } from "../../utils/date";

function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function CollaborateurDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collab, setCollab]   = useState<User | null>(null);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([userService.getById(id), userService.getHistory(id)])
      .then(([u, h]) => { setCollab(u); setHistory(h); })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Chargement…</div>;
  if (!collab)  return <div style={{ padding: 32, color: "var(--text-muted)" }}>Collaborateur introuvable. {error}</div>;

  const tokensReceived = history.filter((tx) => tx.receiver_id === id && tx.type === "manager_to_employee")
    .reduce((s, tx) => s + tx.amount, 0);

  const initials = [collab.first_name, collab.name].map((w) => w?.[0] ?? "").join("").toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "var(--primary-light)", color: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: "1.1rem", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ marginBottom: 2 }}>{collab.first_name} {collab.name}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{collab.email}</p>
          </div>
        </div>
        <button className="back-btn" onClick={() => navigate("/pour-toi")}>
          <IconArrowLeft /> Retour
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Solde tokens</p>
          <p className="stat-value">{collab.token_balance}</p>
          <p className="stat-sub">disponibles</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Tokens reçus</p>
          <p className="stat-value">{tokensReceived}</p>
          <p className="stat-sub">de votre part</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Membre depuis</p>
          <p className="stat-value" style={{ fontSize: "1.1rem" }}>{fmt(collab.created_at)}</p>
          <p className="stat-sub">dans l'entreprise</p>
        </div>
      </div>

      {/* Informations */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Informations</h2>
        <div className="info-card-list">
          {[
            { label: "Prénom",  value: collab.first_name },
            { label: "Nom",     value: collab.name },
            { label: "Email",   value: collab.email },
            { label: "Rôle",    value: "Collaborateur" },
          ].map(({ label, value }) => (
            <div key={label} className="info-field-card">
              <span className="info-field-label">{label}</span>
              <span className="info-field-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historique */}
      <div className="card">
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
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {fmt(tx.created_at)}
                    </td>
                    <td>
                      <span
                        className="token-badge"
                        style={
                          tx.receiver_id === id
                            ? { background: "#f0fdf4", color: "var(--success)" }
                            : { background: "var(--danger-light)", color: "var(--danger)" }
                        }
                      >
                        {tx.receiver_id === id ? "+" : "−"}{tx.amount}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {tx.type ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
