import { useState } from "react";
import type { User } from "../types";
import { tokenService } from "../services/token.service";
import { useAuth } from "../context/AuthContext";

interface Props {
  employees: User[];
  onSuccess: () => void;
}

interface PendingAlloc {
  employee: User;
  amount: number;
  reason: string;
}

function ConfirmModal({
  pending,
  loading,
  onConfirm,
  onCancel,
}: {
  pending: PendingAlloc;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const initials = pending.employee.name
    ? pending.employee.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={!loading ? onCancel : undefined}
    >
      <div
        className="card"
        style={{ maxWidth: 400, width: "100%", padding: 28, textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--primary-light)", color: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem", fontWeight: 700,
          margin: "0 auto 16px",
        }}>
          {initials}
        </div>

        <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>
          Confirmer le don
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.5 }}>
          Vous allez allouer des tokens à ce collaborateur.<br />Cette action est irréversible.
        </p>

        {/* Récap */}
        <div style={{
          background: "var(--bg)", borderRadius: "var(--radius)",
          padding: "16px 20px", marginBottom: 24,
          display: "flex", flexDirection: "column", gap: 10,
          textAlign: "left",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Destinataire</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{pending.employee.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Montant</span>
            <span className="token-badge" style={{ fontSize: "1rem" }}>{pending.amount}</span>
          </div>
          {pending.reason && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", flexShrink: 0 }}>Motif</span>
              <span style={{ fontSize: "0.85rem", textAlign: "right" }}>{pending.reason}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Envoi…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransferForm({ employees, onSuccess }: Props) {
  const { refreshCompany } = useAuth();
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState<PendingAlloc | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const employee = employees.find((emp) => String(emp.id) === receiverId);
    if (!employee) return;
    setPending({ employee, amount: Number(amount), reason });
  }

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    try {
      await tokenService.allocate({
        receiver_id: String(pending.employee.id),
        amount: pending.amount,
        reason: pending.reason || undefined,
      });
      setSuccess(`${pending.amount} tokens alloués à ${pending.employee.name}.`);
      setReceiverId("");
      setAmount("");
      setReason("");
      setPending(null);
      onSuccess();
      refreshCompany();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error ?? "Erreur lors de l'allocation.");
      setPending(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {pending && (
        <ConfirmModal
          pending={pending}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      <div className="card">
        <h2 style={{ marginBottom: 20, fontSize: "1rem", fontWeight: 600 }}>
          Allouer des tokens
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Collaborateur</label>
            <select
              className="form-select"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              required
            >
              <option value="">Sélectionner un collaborateur…</option>
              {Array.isArray(employees) &&
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.name} — {emp.token_balance} tokens
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Montant</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex. 50"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Motif (facultatif)</label>
            <input
              className="form-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Excellent travail sur le projet X"
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            Allouer
          </button>
        </form>
      </div>
    </>
  );
}
