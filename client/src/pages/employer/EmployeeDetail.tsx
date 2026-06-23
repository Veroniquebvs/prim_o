/**
 * pages/employer/EmployeeDetail.tsx — Individual employee detail page for employers.
 *
 * Fetches the employee profile and token transaction history by :id param. Displays:
 * - Stat cards (current token balance, account creation date)
 * - Read-only personal info fields
 * - An editable entry date (saved via userService.updateEntryDate)
 * - Token history table with colour-coded credits (+) and debits (−)
 * - A two-step deletion confirmation section
 *
 * Navigates back to the employer dashboard on deletion or when the back button is clicked.
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../services/user.service";
import { managerService } from "../../services/manager.service";
import { tokenService } from "../../services/token.service";
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
  const [employee, setEmployee] = useState<User | null>(null);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [quickTarget, setQuickTarget] = useState<boolean>(false);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickReason, setQuickReason] = useState("");
  const [quickSuccess, setQuickSuccess] = useState("");
  const [quickError, setQuickError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([userService.getById(id), userService.getHistory(id)])
      .then(([emp, hist]) => {
        setEmployee(emp);
        setHistory(hist);
        setEntryDate(emp.entry_date || "");
      })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleQuickSend(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    try {
      await tokenService.allocate({
        target_type: "user",
        receiver_id: employee?.id,
        amount: parseInt(quickAmount) || 0,
        reason: quickReason || undefined,
      });
      setQuickSuccess(`${quickAmount} tokens envoyés à ${employee?.first_name} !`);
      
      // Update UI
      if (employee) {
         setEmployee({ ...employee, token_balance: (employee.token_balance || 0) + parseInt(quickAmount) });
      }

      // Refresh history
      if (id) {
        userService.getHistory(id).then(setHistory);
      }

      setTimeout(() => {
        setQuickTarget(false);
        setQuickSuccess("");
      }, 2000);
    } catch (err: any) {
      setQuickError(err.response?.data?.error || "Erreur lors de l'envoi.");
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await userService.delete(id);
      navigate(-1);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 24px', margin: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            {employee.first_name} {employee.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Employé</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* Stats */}
      <div style={{ marginBottom: 28 }}>
        <div 
          className="stat-card" 
          style={{ maxWidth: '300px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => { setQuickTarget(true); setQuickAmount(''); setQuickReason(''); setQuickError(''); setQuickSuccess(''); }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
        >
          <p className="stat-label">Tokens</p>
          <p className="stat-value">{employee.token_balance}</p>
          <p className="stat-sub">solde actuel</p>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>+ Ajouter tokens</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Membre depuis</p>
          <p className="stat-value" style={{ fontSize: "1.1rem" }}>
            {fmt(employee.createdAt || employee.created_at)}
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
            { label: "Rôle", value: employee.role },
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
                      {fmt(tx.createdAt || tx.created_at)}
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

      {/* Zone promotion */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>
          Promouvoir en Manager
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 14 }}>
          En promouvant cet employé, il pourra gérer une équipe et distribuer des tokens.
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            try {
              if (!id) return;
              const teamName = window.prompt(
                "Nom de l'équipe pour ce manager :",
                `Équipe de ${employee?.first_name || ""} ${employee?.name || ""}`.trim() || "Nouvelle équipe"
              );
              if (!teamName || !teamName.trim()) return;
              await managerService.promoteToManager(id, teamName.trim());
              navigate(-1);
            } catch {
              alert("Erreur lors de la promotion.");
            }
          }}
        >
          Promouvoir
        </button>
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

      {/* ══ Quick send modal ══ */}
      {quickTarget && (
        <div className="emp-modal-overlay" onClick={() => { setQuickTarget(false); setQuickError(''); setQuickSuccess(''); }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 700, flexShrink: 0,
              }}>
                {(employee.first_name[0] ?? '').toUpperCase()}{(employee.name[0] ?? '').toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{employee.first_name} {employee.name}</p>
                <span className="token-badge" style={{ fontSize: '0.72rem' }}>
                  {employee.token_balance} tkn actuels
                </span>
              </div>
            </div>

            {quickSuccess ? (
              <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</p>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>{quickSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleQuickSend}>
                <div className="form-group">
                  <label className="form-label">Montant de tokens</label>
                  <input className="form-input" type="number" min={1} value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="ex. 20" required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Motif</label>
                  <input className="form-input" type="text" value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    placeholder="ex. Bonus trimestriel" required />
                </div>
                {quickError && <p className="form-error" style={{ marginBottom: 16 }}>{quickError}</p>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn" onClick={() => setQuickTarget(false)} style={{ padding: '8px 16px' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={!quickAmount}>
                    Envoyer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
