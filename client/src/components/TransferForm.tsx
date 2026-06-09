import { useState } from "react";
import type { User } from "../types";
import { tokenService } from "../services/token.service";

interface Props {
  employees: User[];
  onSuccess: () => void;
}

export default function TransferForm({ employees, onSuccess }: Props) {
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await tokenService.allocate({
        receiver_id: receiverId,
        amount: Number(amount),
        reason: reason || undefined,
      });
      setSuccess(`${amount} tokens alloués avec succès.`);
      setReceiverId("");
      setAmount("");
      setReason("");
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ?? "Erreur lors de l'allocation.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 20, fontSize: "1rem", fontWeight: 600 }}>
        Allouer des tokens
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Employé</label>
          <select
            className="form-select"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            required
          >
            <option value="">Sélectionner un employé…</option>
            {Array.isArray(employees) &&
              employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.token_balance} tokens
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
          {loading ? "Envoi…" : "Allouer"}
        </button>
      </form>
    </div>
  );
}
