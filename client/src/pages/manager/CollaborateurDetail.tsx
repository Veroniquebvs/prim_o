/**
 * pages/manager/CollaborateurDetail.tsx — Team member detail page, visible to the manager.
 *
 * Fetches the collaborator's profile and full token transaction history by :id param.
 * Displays initials avatar, stat cards (current balance, tokens received from this manager,
 * account creation date), personal info fields, and a colour-coded token history table.
 * Read-only — managers cannot edit collaborator profiles from this page.
 * Back button navigates to /pour-toi (the manager home page).
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../services/user.service";
import type { User, TokenTransaction } from "../../types";
import { fmt } from "../../utils/date";
import { resolveAvatarIndex } from "../../utils/avatar";

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
  const [entryDate, setEntryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([userService.getById(id), userService.getHistory(id)])
      .then(([u, h]) => { 
        setCollab(u); 
        setHistory(h); 
        setEntryDate(u.entry_date || "");
      })
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
      <div className="page-header page-header--clean">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={`/assets/av_${resolveAvatarIndex(collab)}.png`}
            alt={collab.first_name}
            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center', border: '2px solid var(--border)', flexShrink: 0 }}
          />
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
      <div className="grid-2" style={{ marginBottom: 28 }}>
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
          <p className="stat-value" style={{ fontSize: "1.1rem" }}>{fmt(collab.createdAt || collab.created_at)}</p>
          <p className="stat-sub">dans l'entreprise</p>
        </div>
      </div>

      {/* Informations */}
      <div className="card" style={{ marginBottom: 20, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Informations</h2>
        <div className="info-card-list">
          {[
            { label: "Prénom",  value: collab.first_name },
            { label: "Nom",     value: collab.name },
            { label: "Email",   value: collab.email },
            { label: "Rôle",    value: "Collaborateur" },
            { label: "Date d'entrée", value: collab.entry_date ? fmt(collab.entry_date) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="info-field-card">
              <span className="info-field-label">{label}</span>
              <span className="info-field-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date d'entrée */}
      <div className="card" style={{ marginBottom: 20, background: '#fff1f1', borderColor: '#fecaca' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ margin: 0 }}
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                setUpdateSuccess(false);
                setError("");

                await userService.updateEntryDate(id!, entryDate);

                const updated = await userService.getById(id!);
                setCollab(updated);
                setUpdateSuccess(true);
                setTimeout(() => setUpdateSuccess(false), 3000);
              } catch {
                setError("Erreur lors de la mise à jour.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Sauvegarde..." : "Mettre à jour"}
          </button>
          {updateSuccess && (
            <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ Date d'entrée mise à jour avec succès !
            </span>
          )}
          {error && (
            <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="card" style={{ background: '#fefce8', borderColor: '#fef08a' }}>
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
                      {fmt(tx.createdAt || tx.created_at)}
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
