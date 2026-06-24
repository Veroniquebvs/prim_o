/**
 * pages/employer/ManagerDetail.tsx — Detail page for a manager, visible to the employer.
 *
 * Fetches manager profile, their current team with members, and their token transaction
 * history. Displays stat cards (token balance, team size, total tokens distributed to team),
 * personal information, the team member list (each row links to the employee detail page),
 * and a full transaction history table with colour-coded credits/debits and the counterpart name.
 *
 * Includes a two-step demotion section: demoting the manager converts them back to an employee,
 * dissolves their team (left_at is set on all TeamMember records), and disables all their
 * scheduled automatic allocations. The employer is redirected to the dashboard on completion.
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { managerService } from "../../services/manager.service";
import { userService } from "../../services/user.service";
import { tokenService } from "../../services/token.service";
import type { User, Team, TokenTransaction } from "../../types";
import { fmt } from "../../utils/date";
import { useAuth } from "../../context/AuthContext";
import { getStoredAvatar } from "../../utils/avatar";

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

  const { refreshCompany } = useAuth();
  const [manager, setManager] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [promoting, setPromoting] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [demoting, setDemoting] = useState(false);

  const [quickTarget, setQuickTarget] = useState<'personal' | 'team' | null>(null);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickReason, setQuickReason] = useState("");
  const [quickSuccess, setQuickSuccess] = useState("");
  const [quickError, setQuickError] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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
        setEntryDate(teamData.manager.entry_date || "");
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

  async function handleQuickSend(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    try {
      await tokenService.allocate({
        target_type: "user",
        receiver_id: manager?.id,
        amount: parseInt(quickAmount) || 0,
        reason: quickReason || undefined,
        target_account: quickTarget || undefined,
      });
      setQuickSuccess(`${quickAmount} tokens envoyés au compte ${quickTarget === 'team' ? 'équipe' : 'personnel'} de ${manager?.first_name} !`);
      
      // Update UI by refetching everything to be safe (especially since team might have been created)
      if (id) {
        Promise.all([
          managerService.getManagerTeam(id),
          userService.getHistory(id),
        ]).then(([teamData, hist]) => {
          setManager(teamData.manager);
          setTeam(teamData.team);
          setHistory(hist);
        });
      }
      
      // Refresh employer company token balance
      refreshCompany();

      setTimeout(() => {
        setQuickTarget(null);
        setQuickSuccess("");
      }, 2000);
    } catch (err: any) {
      setQuickError(err.response?.data?.error || "Erreur lors de l'envoi.");
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 24px', margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={`/assets/av_${getStoredAvatar(manager.id)}.png`}
            alt={manager.first_name}
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
          />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
              {manager.first_name} {manager.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Manager</p>
          </div>
        </div>
        <button
          className="btn btn-outline back-btn"
          style={{
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            height: 'fit-content',
            padding: '10px 18px',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
          onClick={() => navigate('/employer/dashboard')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 161, 154, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <IconArrowLeft />
          Retour
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* Stats */}
      <div style={{ marginBottom: 28, display: 'flex', gap: 16 }}>
        <div 
          className="stat-card" 
          style={{ maxWidth: '300px', flex: 1, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => { setQuickTarget('team'); setQuickAmount(''); setQuickReason(''); setQuickError(''); setQuickSuccess(''); }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
        >
          <p className="stat-label">Solde équipe</p>
          <p className="stat-value">{team?.token_balance ?? 0}</p>
          <p className="stat-sub">tokens à distribuer</p>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span>+ Ajouter tokens</span>
          </div>
        </div>
        <div 
          className="stat-card" 
          style={{ maxWidth: '300px', flex: 1, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => { setQuickTarget('personal'); setQuickAmount(''); setQuickReason(''); setQuickError(''); setQuickSuccess(''); }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
        >
          <p className="stat-label">Solde personnel</p>
          <p className="stat-value">{manager.token_balance}</p>
          <p className="stat-sub">tokens persos</p>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span>+ Ajouter tokens</span>
          </div>
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

      {/* Date d'entrée */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ margin: 0 }}
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                setUpdateSuccess(false);

                await userService.updateEntryDate(id!, entryDate);

                const teamData = await managerService.getManagerTeam(id!);
                setManager(teamData.manager);
                setTeam(teamData.team);
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
                        {fmt(tx.createdAt || tx.created_at)}
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

      {/* ══ Quick send modal ══ */}
      {quickTarget && (
        <div className="emp-modal-overlay" onClick={() => { setQuickTarget(null); setQuickError(''); setQuickSuccess(''); }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 700, flexShrink: 0,
              }}>
                {(manager.first_name[0] ?? '').toUpperCase()}{(manager.name[0] ?? '').toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{manager.first_name} {manager.name}</p>
                <span className="token-badge" style={{ fontSize: '0.72rem' }}>
                  {quickTarget === 'team' ? (team?.token_balance ?? 0) : manager.token_balance} tkn actuels (Compte {quickTarget === 'team' ? 'Équipe' : 'Personnel'})
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
                  <label className="form-label">
                    Motif {quickTarget === 'team' ? <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(optionnel)</span> : null}
                  </label>
                  <input className="form-input" type="text" value={quickReason} list="quick_motifs"
                    onChange={(e) => setQuickReason(e.target.value)}
                    placeholder="ex. Bonus trimestriel" required={quickTarget !== 'team'} />
                  <datalist id="quick_motifs">
                    <option value="Prime exceptionnelle" />
                    <option value="Bon travail sur le projet" />
                    <option value="Atteinte des objectifs" />
                    <option value="Esprit d'équipe" />
                    <option value="Initiative récompensée" />
                  </datalist>
                </div>
                {quickError && <p className="form-error" style={{ marginBottom: 16 }}>{quickError}</p>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn" onClick={() => setQuickTarget(null)} style={{ padding: '8px 16px' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={!quickAmount}>
                    Allouer
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
