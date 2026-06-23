/**
 * pages/employer/EmployerDashboard.tsx — Primary dashboard for the employer role.
 *
 * Shows:
 * - Company token budget and team size stat cards
 * - A toggle to enable/disable the real-time activity feed for employees (feedback_enabled flag)
 * - A printable QR code poster for onboarding new employees
 * - A list of pending (not-yet-activated) employees with a validation action and optional entry date
 * - Scheduled automatic allocations management (create, edit, toggle active, delete) with a modal form
 *   supporting monthly/annual frequency, a specific collaborator or all employees, and an exclusion list
 * - The TransferForm component for immediate manual allocations
 * - A table of all managers in the company
 *
 * Scheduled rule creation and editing share the same modal form (editing pre-fills from the rule object).
 * A null receiver_id means the rule targets all employees; excluded_user_ids is only sent in that case.
 *
 * All data is fetched in parallel via Promise.all on mount and re-fetched after any mutation (fetchData).
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { userService } from "../../services/user.service";
import { companyService } from "../../services/company.service";
import { authService } from "../../services/auth.service";
import { scheduledService } from "../../services/scheduled.service";
import TransferForm from "../../components/TransferForm";
import type { User, Company, ScheduledAllocation } from "../../types";
import { PrintableQRCode } from "../../components/PrintableQRCode";
import { fmtShort } from "../../utils/date";
import UserSelectionModal from "../../components/UserSelectionModal";
import TargetSelectionModal from "../../components/TargetSelectionModal";
import MotifSelectionModal from "../../components/MotifSelectionModal";
import { MOTIFS_ALLOCATION } from "../../utils/motifs";
import { managerService } from "../../services/manager.service";
import type { Team } from "../../types";
import AvatarPickerModal from "../../components/AvatarPickerModal";
import { getStoredAvatar, saveAvatar } from "../../utils/avatar";

const EMPTY_FORM = { first_name: "", name: "", email: "", password: "" };

const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const EMPTY_SCHED = {
  receiver_id: "",
  target_type: "all_company",
  target_team_id: "",
  target_account: "personal" as "personal" | "team",
  amount: "" as string | number,
  label: "",
  frequency: "monthly" as "monthly" | "annual",
  day_of_month: "",
  month: 1,
  excluded_user_ids: [] as string[],
};

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [avatarIndex, setAvatarIndex]           = useState<number>(1);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  useEffect(() => { if (user) setAvatarIndex(getStoredAvatar(String(user.id))); }, [user?.id]);

  const [employees, setEmployees] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<User[]>([]);
  const [entryDates, setEntryDates] = useState<Record<string, string>>({});
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [selectedEmpToPromote, setSelectedEmpToPromote] = useState<User | null>(null);
  const [teamNameForPromotion, setTeamNameForPromotion] = useState("");

  const [activeTab, setActiveTab] = useState<'managers' | 'employees'>('managers');
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const [schedRules, setSchedRules] = useState<ScheduledAllocation[]>([]);
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);
  const [schedForm, setSchedForm] = useState(EMPTY_SCHED);
  const [showSchedMotifModal, setShowSchedMotifModal] = useState(false);
  const [showSchedSelectModal, setShowSchedSelectModal] = useState(false);
  const [schedError, setSchedError] = useState("");
  const [schedLoading, setSchedLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const results = await Promise.all([
        userService.getAll({ companyId: user.company_id, role: "employee" }),
        companyService.getById(user.company_id),
        userService.getPending(user.company_id),
        scheduledService.list(),
        userService.getAll({ companyId: user.company_id, role: "manager" }),
        companyService.getTeams(),
      ]);

      setEmployees(results[0].data.data || []);
      setCompany((results[1] as any).data || results[1]);
      setPendingEmployees(results[2].data || []);
      setSchedRules(results[3] || []);
      setManagers(results[4].data.data || []);
      setTeams(results[5] || []);
    } catch (err) {
      console.error("Erreur :", err);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  async function handleToggleFeedback() {
    if (!company) return;
    setFeedbackSaving(true);
    try {
      await companyService.update(company.id, { feedback_enabled: !company.feedback_enabled });
      await fetchData();
    } finally {
      setFeedbackSaving(false);
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await userService.activate(id, entryDates[id]);

      fetchData();
    } catch {
      alert("Erreur lors de la validation");
    }
  };

  function openSchedCreate() {
    setEditingSchedId(null);
    setSchedForm(EMPTY_SCHED);
    setSchedError("");
    setShowSchedModal(true);
  }

  function openSchedEdit(rule: ScheduledAllocation) {
    setEditingSchedId(rule.id);
    setSchedForm({
      receiver_id: rule.receiver_id ?? "",
      target_type: rule.target_type ?? (rule.receiver_id ? "user" : "all_company"),
      target_team_id: rule.target_team_id ?? "",
      target_account: rule.target_account ?? "personal",
      amount: rule.amount,
      label: rule.label ?? "",
      frequency: rule.frequency,
      day_of_month: String(rule.day_of_month),
      month: rule.month ?? 1,
      excluded_user_ids: rule.excluded_user_ids ?? [],
    });
    setSchedError("");
    setShowSchedModal(true);
  }

  async function handleSubmitSched(e: React.FormEvent) {
    e.preventDefault();
    setSchedError("");
    setSchedLoading(true);
    const payload = {
      target_type: schedForm.target_type,
      target_team_id: schedForm.target_team_id || null,
      target_account: schedForm.target_account,
      receiver_id: schedForm.target_type === 'user' ? schedForm.receiver_id : null,
      amount: parseInt(String(schedForm.amount)) || 1,
      label: schedForm.label || undefined,
      frequency: schedForm.frequency,
      day_of_month: parseInt(String(schedForm.day_of_month)) || 1,
      month: schedForm.frequency === "annual" ? schedForm.month : undefined,
      excluded_user_ids: schedForm.target_type === 'user' ? [] : schedForm.excluded_user_ids,
    };
    try {
      if (editingSchedId) {
        const updated = await scheduledService.update(editingSchedId, payload);
        setSchedRules((prev) => prev.map((r) => (r.id === editingSchedId ? updated : r)));
      } else {
        await scheduledService.create(payload);
        fetchData();
      }
      setShowSchedModal(false);
      setSchedForm(EMPTY_SCHED);
      setEditingSchedId(null);
    } catch (err: any) {
      setSchedError(err?.response?.data?.error ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSchedLoading(false);
    }
  }

  async function handleToggleSched(id: string) {
    try {
      const updated = await scheduledService.toggle(id);
      setSchedRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {}
  }

  async function handleDeleteSched(id: string) {
    try {
      await scheduledService.remove(id);
      setSchedRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.company_id) return;
    setCreateError("");
    setCreateLoading(true);
    try {
      await authService.register({
        ...createForm,
        role: "employee",
        company_id: user.company_id,
      });
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
      fetchData();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? "Erreur lors de la création.");
    } finally {
      setCreateLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>Chargement…</div>
    );

  return (
    <div>
      {/* ══ Employer hero ══ */}
      <div className="employer-hero-banner" style={{ position: 'relative' }}>
        {/* Avatar — position absolute, ne prend aucune place dans le flux */}
        {user && (
          <button onClick={() => setShowAvatarPicker(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'absolute', top: 100, left: 40, zIndex: 10 }}>
            <img
              src={`/assets/av_${avatarIndex}.png`}
              alt={user.first_name}
              style={{ width: 'min(175px, 27vw)', height: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </button>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

          {/* Left: Brand (above the absolute avatar) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: '3px' }}>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2.4rem', color: '#ffffff', letterSpacing: '0.5px' }}>prim'</span>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '3.6rem', color: '#f0a800', lineHeight: 1 }}>o</span>
          </div>

          {/* Right: QR Code + Token count */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* QR Code Trigger with blinking arrows */}
            <div style={{ zIndex: 10, marginTop: '16px', marginBottom: '8px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: -24, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                color: '#ffffff', 
                fontSize: '0.8rem', 
                fontWeight: 'normal', 
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="blinking-arrows">{'>>'}</span>
                CLICK HERE
                <span className="blinking-arrows">{'<<'}</span>
              </div>
              {company && (
                <PrintableQRCode companyId={company.id} companyName={company.name} />
              )}
            </div>

            {/* Token count window */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 4, letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {company?.name || "Chargement..."}
              </span>
              <img 
                src="/icons/token-logo-SF.png" 
                alt="Token" 
                style={{ width: '100px', height: '100px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.15))', zIndex: 2, marginBottom: '-16px' }} 
              />
              <div style={{ background: '#303236', border: '3px solid #ffffff', borderRadius: '16px', padding: '12px 16px 8px 16px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '140px' }}>
                <p style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                  {company?.token_balance ?? 0}
                </p>
                <p style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 500, marginTop: 4, opacity: 0.8 }}>
                  Tokens stock
                </p>
              </div>

              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: 12,
                  marginBottom: '-46px', // This makes it stick out by half its height
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/abonnement')}
              >
                + Acheter
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="form-error" style={{ marginTop: 65 }}>{error}</p>}

      <div className="card" style={{ marginBottom: 24, marginTop: error ? 0 : 65 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Équipes & Managers</h2>
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              + Ajouter
            </button>
            {showAddMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShowAddMenu(false)} />
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 200, overflow: "hidden" }}>
                  <button
                    style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.85rem", cursor: "pointer", color: "var(--text)" }}
                    onClick={() => { setShowCreateModal(true); setShowAddMenu(false); }}
                  >
                    Créer un collaborateur
                  </button>
                  <button
                    style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: "0.85rem", cursor: "pointer", color: "var(--text)" }}
                    onClick={() => { setShowAddManagerModal(true); setShowAddMenu(false); }}
                  >
                    Ajouter un manager
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div 
            style={{ flex: 1, padding: "10px", background: activeTab === 'managers' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: activeTab === 'managers' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => setActiveTab('managers')}
          >
            <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: activeTab === 'managers' ? "var(--primary)" : "inherit" }}>{managers.length}</p>
            <p style={{ fontSize: "0.75rem", color: activeTab === 'managers' ? "var(--primary)" : "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Équipe{managers.length !== 1 ? "s" : ""}</p>
          </div>
          <div 
            style={{ flex: 1, padding: "10px", background: activeTab === 'employees' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: activeTab === 'employees' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => setActiveTab('employees')}
          >
            <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: activeTab === 'employees' ? "var(--primary)" : "inherit" }}>{employees.length}</p>
            <p style={{ fontSize: "0.75rem", color: activeTab === 'employees' ? "var(--primary)" : "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Collab.</p>
          </div>
        </div>

        {activeTab === 'managers' ? (
          managers.length === 0 ? (
            <p className="empty-state">Aucun manager dans votre entreprise.</p>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "7px 10px" }}>Nom</th>
                    <th style={{ padding: "7px 10px" }}>Rôle</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((mgr) => (
                    <tr
                      key={mgr.id}
                      onClick={() => navigate(`/employer/managers/${mgr.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 500, padding: "8px 10px" }}>
                        {mgr.first_name} {mgr.name}
                      </td>
                      <td style={{ color: "var(--text-muted)", padding: "8px 10px", fontSize: "0.82rem" }}>
                        {mgr.role ? (mgr.role === 'employee' ? 'Collaborateur' : mgr.role === 'employer' ? 'Employeur' : mgr.role.charAt(0).toUpperCase() + mgr.role.slice(1)) : '—'}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <span className="token-badge">{mgr.token_balance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          employees.length === 0 ? (
            <p className="empty-state">Aucun collaborateur dans votre entreprise.</p>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "7px 10px" }}>Nom</th>
                    <th style={{ padding: "7px 10px" }}>Équipe</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="table-row-hover"
                      onClick={() => navigate(`/employer/employees/${emp.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 500, padding: "8px 10px" }}>
                        {emp.first_name} {emp.name}
                      </td>
                      <td style={{ color: "var(--text-muted)", padding: "8px 10px", fontSize: "0.82rem" }}>
                        {(() => {
                          const team = teams.find(t => t.members?.some(m => m.user_id === emp.id)) as any;
                          return team?.manager ? `${team.manager.first_name} ${team.manager.name}` : "—";
                        })()}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <span className="token-badge">{emp.token_balance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Feedback feed */}
      {company && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
                Fil d'activité pour les collaborateurs
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {company.feedback_enabled
                  ? 'Vos collaborateurs voient les tokens reçus dans l\'entreprise en temps réel.'
                  : 'Activez pour que vos collaborateurs voient l\'activité tokens de l\'entreprise.'}
              </p>
              {feedbackSaving && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Enregistrement…</p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={company.feedback_enabled}
              onClick={feedbackSaving ? undefined : handleToggleFeedback}
              className={`param-toggle ${company.feedback_enabled ? 'param-toggle--on' : ''}`}
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
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

      {/* Attributions automatiques */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: schedRules.length > 0 ? 16 : 0 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Attributions automatiques</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
              Tokens attribués automatiquement à une date récurrente (mensuel ou anniversaire).
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, marginLeft: 12 }}
            onClick={openSchedCreate}
          >
            + Créer
          </button>
        </div>

        {schedRules.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {schedRules.map((r) => {
              let who = "Toute la boîte";
              if (r.target_type === 'user' && r.receiver) {
                who = `${r.receiver.first_name} ${r.receiver.name}`;
              } else if (r.target_type === 'all_employees') {
                who = "Tous les collaborateurs";
              } else if (r.target_type === 'all_managers') {
                who = "Tous les managers";
              } else if (r.target_type === 'team' && r.target_team) {
                who = `Équipe : ${r.target_team.name}`;
              } else if (r.target_type === 'team_and_manager' && r.target_team) {
                who = `Équipe : ${r.target_team.name} (avec manager)`;
              } else if (!r.target_type && r.receiver) {
                who = `${r.receiver.first_name} ${r.receiver.name}`;
              } else if (!r.target_type && !r.receiver) {
                who = "Toute l'équipe";
              }
              
              if (r.excluded_user_ids && r.excluded_user_ids.length > 0) {
                who += ` (sauf ${r.excluded_user_ids.length})`;
              }
              const when = r.frequency === "monthly"
                ? `Chaque mois, le ${r.day_of_month}`
                : `Chaque année, le ${r.day_of_month} ${MONTHS[(r.month ?? 1) - 1]}`;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      <span className="token-badge" style={{ marginRight: 6 }}>{r.amount}</span>
                      {who}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {when} — {r.label || "sans motif"} · Prochaine : {fmtShort(r.next_run_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => openSchedEdit(r)}
                    style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600, padding: "0 6px", flexShrink: 0 }}
                    aria-label="Modifier"
                  >
                    ✎
                  </button>
                  <button
                    role="switch"
                    aria-checked={r.active}
                    onClick={() => handleToggleSched(r.id)}
                    className={`param-toggle ${r.active ? "param-toggle--on" : ""}`}
                    style={{ flexShrink: 0 }}
                  />
                  <button
                    onClick={() => handleDeleteSched(r.id)}
                    style={{ color: "var(--danger)", fontSize: "1.1rem", padding: "0 4px", flexShrink: 0 }}
                    aria-label="Supprimer"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <TransferForm employees={[...managers, ...employees]} teams={teams} onSuccess={fetchData} />
      </div>

      {showSchedModal && (
        <div className="emp-modal-overlay" onClick={() => setShowSchedModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">
              {editingSchedId ? "Modifier l'attribution" : "Attribution automatique"}
            </h2>

            <form onSubmit={handleSubmitSched} noValidate>
              <div className="form-group">
                <label className="form-label">Bénéficiaire</label>
                <div
                  className="form-select"
                  style={{ cursor: 'pointer', lineHeight: '1.5', minHeight: '40px', display: 'flex', alignItems: 'center' }}
                  onClick={() => setShowSchedSelectModal(true)}
                >
                  {(() => {
                    if (schedForm.target_type === 'user' && schedForm.receiver_id) {
                      const u = [...managers, ...employees].find(e => e.id === schedForm.receiver_id);
                      return u ? `${u.name} ${u.first_name}` : "Sélectionner...";
                    } else if (schedForm.target_type === 'all_employees') {
                      return "Tous les collaborateurs";
                    } else if (schedForm.target_type === 'all_managers') {
                      return "Tous les managers";
                    } else if (schedForm.target_type === 'team' && schedForm.target_team_id) {
                      const t = teams.find(t => t.id === schedForm.target_team_id);
                      return t ? `Équipe : ${t.name}` : "Équipe...";
                    } else if (schedForm.target_type === 'team_and_manager' && schedForm.target_team_id) {
                      const t = teams.find(t => t.id === schedForm.target_team_id);
                      return t ? `Équipe : ${t.name} (avec manager)` : "Équipe...";
                    } else {
                      return "Toute la boîte";
                    }
                  })()}
                </div>
                {/* Native validation requirement bypass since we use div instead of select */}
                <input type="hidden" value={schedForm.target_type} />
                {showSchedSelectModal && (
                  <TargetSelectionModal
                    users={[...managers, ...employees]}
                    teams={teams}
                    initialTargetType={schedForm.target_type}
                    initialTargetTeamId={schedForm.target_team_id}
                    initialReceiverId={schedForm.receiver_id}
                    initialExcludedIds={schedForm.excluded_user_ids}
                    onSelect={(payload) => {
                      setSchedForm({ ...schedForm, ...payload } as any);
                      setShowSchedSelectModal(false);
                    }}
                    onClose={() => setShowSchedSelectModal(false)}
                  />
                )}
              </div>

              {schedForm.target_type === 'user' && schedForm.receiver_id && [...managers].find(m => m.id === schedForm.receiver_id) && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Compte cible du manager</label>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="radio" 
                        name="target_account" 
                        value="personal" 
                        checked={schedForm.target_account === 'personal'} 
                        onChange={() => setSchedForm({ ...schedForm, target_account: 'personal' })}
                      />
                      Compte Personnel
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="radio" 
                        name="target_account" 
                        value="team" 
                        checked={schedForm.target_account === 'team'} 
                        onChange={() => setSchedForm({ ...schedForm, target_account: 'team' })}
                      />
                      Compte Équipe
                    </label>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                    {schedForm.target_account === 'personal' 
                      ? "Le manager pourra utiliser ces tokens pour ses propres achats."
                      : "Le manager pourra distribuer ces tokens à son équipe."}
                  </p>
                </div>
              )}

              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Tokens</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex : 20"
                    value={schedForm.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setSchedForm({ ...schedForm, amount: val });
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fréquence</label>
                  <select
                    className="form-select"
                    value={schedForm.frequency}
                    onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value as "monthly" | "annual" })}
                  >
                    <option value="monthly">Mensuelle</option>
                    <option value="annual">Annuelle</option>
                  </select>
                </div>
              </div>

              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Jour du mois</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex : 15"
                    value={schedForm.day_of_month}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                        setSchedForm({ ...schedForm, day_of_month: val });
                      }
                    }}
                    required
                  />
                </div>
                {schedForm.frequency === "annual" && (
                  <div className="form-group">
                    <label className="form-label">Mois</label>
                    <select
                      className="form-select"
                      value={schedForm.month}
                      onChange={(e) => setSchedForm({ ...schedForm, month: parseInt(e.target.value) })}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


              <div className="form-group">
                <label className="form-label">Motif</label>
                <div
                  onClick={() => setShowSchedMotifModal(true)}
                  className="form-input"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: schedForm.label ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {schedForm.label ? schedForm.label : "Sélectionner un motif..."}
                </div>
                <input type="hidden" value={schedForm.label} required />
                
                {showSchedMotifModal && (
                  <MotifSelectionModal
                    initialMotif={schedForm.label}
                    onSelect={(motif) => {
                      setSchedForm({ ...schedForm, label: motif });
                      setShowSchedMotifModal(false);
                    }}
                    onClose={() => setShowSchedMotifModal(false)}
                  />
                )}
              </div>

              {schedError && <p className="form-error">{schedError}</p>}

              <div className="emp-modal-actions">
                <button
                  type="button"
                  style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setShowSchedModal(false)}
                  disabled={schedLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Retour
                </button>
                <button type="submit" className="btn btn-primary" disabled={schedLoading}>
                  {schedLoading ? "Enregistrement…" : editingSchedId ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="emp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">Créer un collaborateur</h2>

            <form onSubmit={handleCreateEmployee} noValidate>
              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Prénom"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nom"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="email@exemple.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Entreprise</label>
                <input
                  className="form-input"
                  type="text"
                  value={company?.name ?? ""}
                  disabled
                  readOnly
                />
              </div>

              {createError && <p className="form-error">{createError}</p>}

              <div className="emp-modal-actions">
                <button
                  type="button"
                  style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Retour
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddManagerModal && (
        <div className="emp-modal-overlay" onClick={() => { setShowAddManagerModal(false); setSelectedEmpToPromote(null); setTeamNameForPromotion(""); }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">Ajouter un Manager</h2>
            {!selectedEmpToPromote ? (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
                  Sélectionnez un collaborateur existant pour le promouvoir au rôle de Manager. Il pourra alors gérer une équipe et distribuer des tokens.
                </p>
                {employees.length === 0 ? (
                  <p className="empty-state" style={{ marginBottom: 20 }}>Aucun collaborateur disponible.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 20 }}>
                    {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map(emp => (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)" }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{emp.first_name} {emp.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{emp.email}</p>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedEmpToPromote(emp);
                            setTeamNameForPromotion(`Équipe de ${emp.first_name}`);
                          }}
                        >
                          Sélectionner
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
                  Vous allez promouvoir <strong>{selectedEmpToPromote.first_name} {selectedEmpToPromote.name}</strong>. Veuillez définir le nom de son équipe.
                </p>
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Nom de l'équipe</label>
                  <input
                    type="text"
                    className="form-input"
                    value={teamNameForPromotion}
                    onChange={(e) => setTeamNameForPromotion(e.target.value)}
                    placeholder="Ex: Équipe Rayon Frais"
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={!teamNameForPromotion.trim()}
                    onClick={async () => {
                      try {
                        await managerService.promoteToManager(selectedEmpToPromote.id, teamNameForPromotion.trim());
                        setShowAddManagerModal(false);
                        setSelectedEmpToPromote(null);
                        setTeamNameForPromotion("");
                        fetchData();
                      } catch {
                        alert("Erreur lors de la promotion.");
                      }
                    }}
                  >
                    Confirmer la promotion
                  </button>
                </div>
              </>
            )}
            <div className="emp-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%" }}
                onClick={() => {
                  if (selectedEmpToPromote) {
                    setSelectedEmpToPromote(null);
                  } else {
                    setShowAddManagerModal(false);
                  }
                }}
              >
                {selectedEmpToPromote ? "Retour" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarPicker && (
        <AvatarPickerModal
          current={avatarIndex}
          onSelect={(index) => { setAvatarIndex(index); if (user) saveAvatar(String(user.id), index); setShowAvatarPicker(false); }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
