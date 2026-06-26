/**
 * components/TransferForm.tsx — Token allocation form used by employers and managers.
 *
 * Renders a form to select a collaborator from a provided list, enter an amount, and
 * optionally enter a reason. On submit a confirmation modal appears showing a recap of
 * the intended allocation. On confirmation, calls tokenService.allocate() then refreshes
 * the company pool via AuthContext and invokes the onSuccess callback (typically triggers
 * a re-fetch of the parent page data). Any server-side error (e.g. insufficient balance)
 * is displayed inline in the form.
 */
import { useState } from "react";
import type { User, Team } from "../types";
import { tokenService } from "../services/token.service";
import { useAuth } from "../context/AuthContext";
import TargetSelectionModal from "./TargetSelectionModal";
import MotifSelectionModal from "./MotifSelectionModal";
import { MOTIFS_ALLOCATION } from "../utils/motifs";

interface Props {
  employees: User[];
  teams: Team[];
  onSuccess: () => void;
}

interface PendingAlloc {
  target_type: string;
  receiver_id: string | null;
  target_team_id: string | null;
  excluded_user_ids: string[];
  amount: number;
  reason: string;
  targetName: string;
  target_account?: "personal" | "team";
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
        <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>
          Confirmer l'allocation
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.5 }}>
          Vous allez allouer des tokens.<br />Cette action est irréversible.
        </p>

        {/* Récap */}
        <div style={{
          background: "var(--bg)", borderRadius: "var(--radius)",
          padding: "16px 20px", marginBottom: 24,
          display: "flex", flexDirection: "column", gap: 10,
          textAlign: "left",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Destinataire(s)</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{pending.targetName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Montant unitaire</span>
            <span className="token-badge" style={{ fontSize: "1rem" }}>{pending.amount}</span>
          </div>
          {pending.reason && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", flexShrink: 0 }}>Motif</span>
              <span style={{ fontSize: "0.85rem", textAlign: "right" }}>{pending.reason}</span>
            </div>
          )}
          {pending.target_account === 'team' && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Compte Cible</span>
              <span style={{ fontSize: "0.85rem" }}>Compte Équipe</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="button"
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

export default function TransferForm({ employees, teams, onSuccess }: Props) {
  const { refreshCompany } = useAuth();
  
  const [targetType, setTargetType] = useState<string>("user");
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [targetAccount, setTargetAccount] = useState<"personal" | "team">("personal");
  
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showMotifModal, setShowMotifModal] = useState(false);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState<PendingAlloc | null>(null);

  const getTargetName = () => {
    if (targetType === 'user' && receiverId) {
      const u = employees.find(e => e.id === receiverId);
      return u ? `${u.name} ${u.first_name}` : "Sélectionner...";
    } else if (targetType === 'all_employees') {
      return "Tous les collaborateurs";
    } else if (targetType === 'all_managers') {
      return "Tous les managers";
    } else if (targetType === 'team' && targetTeamId) {
      const t = teams.find(t => t.id === targetTeamId);
      return t ? `Équipe : ${t.name}` : "Équipe...";
    } else if (targetType === 'team_and_manager' && targetTeamId) {
      const t = teams.find(t => t.id === targetTeamId);
      return t ? `Équipe : ${t.name} (avec manager)` : "Équipe...";
    } else if (targetType === 'all_company') {
      return "Toute la boîte";
    }
    return "Sélectionner...";
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (targetType === 'user' && !receiverId) {
      setError("Veuillez sélectionner un bénéficiaire.");
      return;
    }

    setPending({ 
      target_type: targetType,
      receiver_id: receiverId,
      target_team_id: targetTeamId,
      excluded_user_ids: excludedUserIds,
      amount: Number(amount), 
      reason,
      targetName: getTargetName(),
      target_account: targetAccount
    });
  }

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    try {
      const res = await tokenService.allocate({
        target_type: pending.target_type,
        receiver_id: pending.receiver_id,
        target_team_id: pending.target_team_id,
        excluded_user_ids: pending.excluded_user_ids,
        amount: pending.amount,
        reason: pending.reason || undefined,
        target_account: pending.target_account,
      });
      
      const count = (res as any).count || 1;
      const total = (res as any).total || pending.amount;
      
      setSuccess(`${total} tokens alloués (${count} destinataire${count > 1 ? 's' : ''}).`);
      setReceiverId(null);
      setTargetTeamId(null);
      setExcludedUserIds([]);
      setTargetType("user");
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

      <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h2 style={{ marginBottom: 20, fontSize: "1rem", fontWeight: 600 }}>
          Allouer des tokens
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Bénéficiaire</label>
            <div
              className="form-select"
              style={{ cursor: 'pointer', lineHeight: '1.5', minHeight: '40px', display: 'flex', alignItems: 'center' }}
              onClick={() => setShowSelectModal(true)}
            >
              {getTargetName()}
            </div>
            
            {showSelectModal && (
              <TargetSelectionModal
                users={employees}
                teams={teams}
                initialTargetType={targetType}
                initialTargetTeamId={targetTeamId}
                initialReceiverId={receiverId}
                initialExcludedIds={excludedUserIds}
                onSelect={(payload) => { 
                  setTargetType(payload.target_type);
                  setReceiverId(payload.receiver_id);
                  setTargetTeamId(payload.target_team_id);
                  setExcludedUserIds(payload.excluded_user_ids);
                  setShowSelectModal(false); 
                }}
                onClose={() => setShowSelectModal(false)}
              />
            )}
          </div>

          {targetType === 'user' && receiverId && employees.find(e => e.id === receiverId && e.role === 'manager') && (
            <div className="form-group">
              <label className="form-label">Compte cible du manager</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="tf_target_account" 
                    value="personal" 
                    checked={targetAccount === 'personal'} 
                    onChange={() => setTargetAccount('personal')}
                  />
                  Compte Personnel
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="tf_target_account" 
                    value="team" 
                    checked={targetAccount === 'team'} 
                    onChange={() => setTargetAccount('team')}
                  />
                  Compte Équipe
                </label>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                {targetAccount === 'personal' 
                  ? "Le manager pourra utiliser ces tokens pour ses propres achats."
                  : "Le manager pourra distribuer ces tokens à son équipe."}
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Montant unitaire</label>
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
            <label className="form-label">
              Motif {targetType === 'team' || targetAccount === 'team' ? <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(optionnel)</span> : null}
            </label>
            <div
              onClick={() => setShowMotifModal(true)}
              className="form-input"
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: reason ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {reason ? reason : "Sélectionner un motif..."}
            </div>
            {/* Validation native bypass */}
            <input type="hidden" value={reason} required={targetType !== 'team' && targetAccount !== 'team'} />
            
            {showMotifModal && (
              <MotifSelectionModal
                initialMotif={reason}
                onSelect={(motif) => {
                  setReason(motif);
                  setShowMotifModal(false);
                }}
                onClose={() => setShowMotifModal(false)}
              />
            )}
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
