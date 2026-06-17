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
import { managerService } from "../../services/manager.service";

const EMPTY_FORM = { first_name: "", name: "", email: "", password: "" };

const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const EMPTY_SCHED = {
  receiver_id: "",
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

  const [schedRules, setSchedRules] = useState<ScheduledAllocation[]>([]);
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);
  const [schedForm, setSchedForm] = useState(EMPTY_SCHED);
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
      ]);

      setEmployees(results[0].data.data || []);
      setCompany((results[1] as any).data || results[1]);
      setPendingEmployees(results[2].data || []);
      setSchedRules(results[3] || []);
      setManagers(results[4].data.data || []);
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
      receiver_id: schedForm.receiver_id || null,
      amount: parseInt(String(schedForm.amount)) || 1,
      label: schedForm.label || undefined,
      frequency: schedForm.frequency,
      day_of_month: parseInt(String(schedForm.day_of_month)) || 1,
      month: schedForm.frequency === "annual" ? schedForm.month : undefined,
      excluded_user_ids: schedForm.receiver_id ? [] : schedForm.excluded_user_ids,
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
      <div className="page-header page-header--centered">
        <h1>
          Tableau de bord
          <br />
          {company?.name || "Chargement..."}
        </h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Budget tokens</p>
          <p className="stat-value">{company?.token_balance ?? 0}</p>
          <p className="stat-sub">tokens à distribuer</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Équipe</p>
          <p className="stat-value">{employees.length}</p>
          <p className="stat-sub">collaborateur{employees.length !== 1 ? "s" : ""}</p>
        </div>
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

      {/* QRCode */}
      {company && (
        <PrintableQRCode companyId={company.id} companyName={company.name} />
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
              const who = r.receiver
                ? `${r.receiver.first_name} ${r.receiver.name}`
                : "Tous les collaborateurs";
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

      <div className="grid-2">
        <TransferForm employees={employees} onSuccess={fetchData} />

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Managers</h2>
          </div>
          {managers.length === 0 ? (
            <p className="empty-state">Aucun manager dans votre entreprise.</p>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "7px 10px" }}>Nom</th>
                    <th style={{ padding: "7px 10px" }}>Email</th>
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
                        {mgr.email}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <span className="token-badge">{mgr.token_balance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showSchedModal && (
        <div className="emp-modal-overlay" onClick={() => setShowSchedModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">
              {editingSchedId ? "Modifier l'attribution" : "Attribution automatique"}
            </h2>

            <form onSubmit={handleSubmitSched} noValidate>
              <div className="form-group">
                <label className="form-label">Collaborateur</label>
                <select
                  className="form-select"
                  value={schedForm.receiver_id}
                  onChange={(e) => setSchedForm({ ...schedForm, receiver_id: e.target.value })}
                >
                  <option value="">Tous les collaborateurs</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.name}
                    </option>
                  ))}
                </select>
              </div>

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

              {!schedForm.receiver_id && employees.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Exclure des collaborateurs</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)" }}>
                    {employees.map((emp) => {
                      const excluded = schedForm.excluded_user_ids.includes(emp.id);
                      return (
                        <label key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.85rem" }}>
                          <input
                            type="checkbox"
                            checked={excluded}
                            onChange={() =>
                              setSchedForm((f) => ({
                                ...f,
                                excluded_user_ids: excluded
                                  ? f.excluded_user_ids.filter((id) => id !== emp.id)
                                  : [...f.excluded_user_ids, emp.id],
                              }))
                            }
                          />
                          {emp.first_name} {emp.name}
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{emp.email}</span>
                        </label>
                      );
                    })}
                  </div>
                  {schedForm.excluded_user_ids.length > 0 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                      {schedForm.excluded_user_ids.length} collaborateur{schedForm.excluded_user_ids.length > 1 ? "s" : ""} exclu{schedForm.excluded_user_ids.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Motif (optionnel)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex : Prime mensuelle, Anniversaire…"
                  value={schedForm.label}
                  onChange={(e) => setSchedForm({ ...schedForm, label: e.target.value })}
                />
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
    </div>
  );
}
