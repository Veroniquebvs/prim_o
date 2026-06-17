import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { marketplaceService } from '../services/marketplace.service';
import { managerService } from '../services/manager.service';
import { useFavorites } from '../hooks/useFavorites';
import { useCart } from '../hooks/useCart';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Voucher, Redemption, Team, ScheduledAllocation, User } from '../types';
import { fmtShort } from '../utils/date';

/* ── Icons ── */
function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/* ── Voucher card (carousel) ── */
function VoucherCard({
  voucher, onRedeem, redeeming, promoCode, canAfford, saved, onToggle, inCart, onCartToggle,
}: {
  voucher: Voucher;
  onRedeem: (v: Voucher) => void;
  redeeming: boolean;
  promoCode?: string;
  canAfford: boolean;
  saved: boolean;
  onToggle: (id: string) => void;
  inCart: boolean;
  onCartToggle: (id: string) => void;
}) {
  const navigate = useNavigate();
  const imgSrc = resolveImageUrl(voucher.images?.[0]);

  return (
    <div
      className="voucher-card-carousel"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/catalogue/offre/${voucher.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/catalogue/offre/${voucher.id}`); }}
    >
      {imgSrc ? (
        <div className="voucher-card-image">
          <img src={imgSrc} alt={voucher.partner} />
        </div>
      ) : (
        <div className="voucher-card-image voucher-card-image--placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
      <div className="voucher-card-carousel-top">
        <div className="voucher-card-partner">{voucher.partner}</div>
        <button
          className={`btn-bookmark ${saved ? 'btn-bookmark--saved' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(voucher.id); }}
          aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <IconHeart filled={saved} />
        </button>
      </div>
      <p className="voucher-card-carousel-title">{voucher.title}</p>
      <div className="voucher-card-carousel-footer" style={{ justifyContent: 'flex-end' }}>
        {promoCode ? (
          <span className="promo-code" style={{ fontSize: '0.72rem', marginRight: 'auto' }}>{promoCode}</span>
        ) : !voucher.available ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto' }}>Indisponible</span>
        ) : null}
        <span className="token-badge">{voucher.token_cost}</span>
      </div>
    </div>
  );
}

/* ── Carousel row ── */
function CarouselRow({
  title, vouchers, onRedeem, redeeming, promoCodes, userBalance, isFavorite, onToggle, isInCart, onCartToggle,
}: {
  title: string;
  vouchers: Voucher[];
  onRedeem: (v: Voucher) => void;
  redeeming: string | null;
  promoCodes: Record<string, string>;
  userBalance: number;
  isFavorite: (id: string) => boolean;
  onToggle: (id: string) => void;
  isInCart: (id: string) => boolean;
  onCartToggle: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  }
  if (vouchers.length === 0) return null;
  return (
    <div className="carousel-section">
      <div className="carousel-header">
        {title ? <h2 className="carousel-title">{title}</h2> : <span />}
        <div className="carousel-controls">
          <button className="carousel-btn" onClick={() => scroll('left')} aria-label="Précédent"><IconChevronLeft /></button>
          <button className="carousel-btn" onClick={() => scroll('right')} aria-label="Suivant"><IconChevronRight /></button>
        </div>
      </div>
      <div className="carousel-track" ref={scrollRef}>
        {vouchers.map((v) => (
          <VoucherCard
            key={v.id}
            voucher={v}
            onRedeem={onRedeem}
            redeeming={redeeming === v.id}
            promoCode={promoCodes[v.id]}
            canAfford={userBalance >= v.token_cost}
            saved={isFavorite(v.id)}
            onToggle={onToggle}
            inCart={isInCart(v.id)}
            onCartToggle={onCartToggle}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Constants ── */
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const EMPTY_SCHED = { receiver_id: '', amount: '' as string | number, label: '', frequency: 'monthly' as 'monthly' | 'annual', day_of_month: '', month: 1 };

/* ── Manager view ── */
function ManagerPourToi() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam]                   = useState<Team | null>(null);
  const [orders, setOrders]               = useState<Redemption[]>([]);
  const [schedRules, setSchedRules]       = useState<ScheduledAllocation[]>([]);
  const [available, setAvailable]         = useState<User[]>([]);
  const [loading, setLoading]             = useState(true);

  /* Give tokens form */
  const [receiverId, setReceiverId]       = useState('');
  const [giveAmount, setGiveAmount]       = useState('');
  const [giveReason, setGiveReason]       = useState('');
  const [giving, setGiving]               = useState(false);
  const [giveError, setGiveError]         = useState('');
  const [giveSuccess, setGiveSuccess]     = useState('');
  const [pendingGive, setPendingGive]     = useState<{ member: User; amount: number; reason: string } | null>(null);

  /* Add collaborator panel */
  const [addMode, setAddMode]             = useState<'none'|'existing'|'create'>('none');
  const [addingId, setAddingId]           = useState('');
  const [addingLoad, setAddingLoad]       = useState(false);
  const [addError, setAddError]           = useState('');
  const [createForm, setCreateForm]       = useState({ first_name: '', name: '', email: '', password: '' });
  const [createLoad, setCreateLoad]       = useState(false);
  const [createError, setCreateError]     = useState('');

  /* Scheduled allocation modal */
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedForm, setSchedForm]           = useState(EMPTY_SCHED);
  const [schedError, setSchedError]         = useState('');
  const [schedLoading, setSchedLoading]     = useState(false);

  const members = (team?.members ?? []).map((m) => m.user).filter(Boolean) as User[];

  const fetchAll = useCallback(async () => {
    const [teamRes, ordersRes, schedRes, availRes] = await Promise.allSettled([
      managerService.getTeam(),
      marketplaceService.getOrders(),
      managerService.listScheduled(),
      managerService.getUnassignedCollaborators(),
    ]);
    if (teamRes.status === 'fulfilled')   setTeam(teamRes.value);
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value);
    if (schedRes.status === 'fulfilled')  setSchedRules(schedRes.value);
    if (availRes.status === 'fulfilled')  setAvailable(availRes.value);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Token give */
  function handleGiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGiveError(''); setGiveSuccess('');
    const member = members.find((m) => m.id === receiverId);
    if (!member) return;
    setPendingGive({ member, amount: Number(giveAmount), reason: giveReason });
  }

  async function handleGiveConfirm() {
    if (!pendingGive) return;
    setGiving(true);
    try {
      await managerService.giveTokens(pendingGive.member.id, pendingGive.amount, pendingGive.reason || undefined);
      setGiveSuccess(`${pendingGive.amount} tokens envoyés à ${pendingGive.member.first_name}.`);
      setReceiverId(''); setGiveAmount(''); setGiveReason('');
      setPendingGive(null);
      refreshUser();
      fetchAll();
    } catch (err: any) {
      setGiveError(err?.response?.data?.error ?? 'Erreur lors du don.');
      setPendingGive(null);
    } finally { setGiving(false); }
  }

  /* Add existing collaborator */
  async function handleAddExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!addingId) return;
    setAddingLoad(true); setAddError('');
    try {
      await managerService.addTeamMember(addingId);
      setAddingId(''); setAddMode('none');
      await fetchAll();
    } catch (err: any) {
      setAddError(err?.response?.data?.error ?? 'Erreur lors de l\'ajout.');
    } finally { setAddingLoad(false); }
  }

  /* Create new collaborator */
  async function handleCreateCollaborator(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoad(true); setCreateError('');
    try {
      await managerService.createEmployee(createForm);
      setCreateForm({ first_name: '', name: '', email: '', password: '' });
      setAddMode('none');
      await fetchAll();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? 'Erreur lors de la création.');
    } finally { setCreateLoad(false); }
  }

  /* Scheduled */
  async function handleSubmitSched(e: React.FormEvent) {
    e.preventDefault();
    setSchedError(''); setSchedLoading(true);
    try {
      const created = await managerService.createScheduled({
        receiver_id: schedForm.receiver_id,
        amount: parseInt(String(schedForm.amount)) || 1,
        frequency: schedForm.frequency,
        day_of_month: parseInt(String(schedForm.day_of_month)) || 1,
        month: schedForm.frequency === 'annual' ? schedForm.month : undefined,
        label: schedForm.label || undefined,
      });
      setSchedRules((prev) => [created, ...prev]);
      setShowSchedModal(false);
      setSchedForm(EMPTY_SCHED);
    } catch (err: any) {
      setSchedError(err?.response?.data?.error ?? "Erreur lors de la création.");
    } finally { setSchedLoading(false); }
  }

  async function handleToggleSched(id: string) {
    try {
      const updated = await managerService.toggleScheduled(id);
      setSchedRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {}
  }

  async function handleDeleteSched(id: string) {
    try {
      await managerService.deleteScheduled(id);
      setSchedRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  return (
    <div>
      <div className="page-header page-header--centered">
        <h1>Mon espace manager</h1>
      </div>

      {/* Solde */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Mon solde tokens</p>
          <p className="stat-value">{user?.token_balance ?? 0}</p>
          <p className="stat-sub">à distribuer à mon équipe</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Mon équipe</p>
          <p className="stat-value">{members.length}</p>
          <p className="stat-sub">membre{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Attributions auto</p>
          <p className="stat-value">{schedRules.filter((r) => r.active).length}</p>
          <p className="stat-sub">règle{schedRules.filter((r) => r.active).length !== 1 ? 's' : ''} active{schedRules.filter((r) => r.active).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Don de tokens */}
        <div className="card">
          <h2 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 600 }}>Donner des tokens</h2>

          {pendingGive ? (
            <div>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Destinataire</span>
                  <span style={{ fontWeight: 700 }}>{pendingGive.member.first_name} {pendingGive.member.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Montant</span>
                  <span className="token-badge" style={{ fontSize: '1rem' }}>{pendingGive.amount}</span>
                </div>
                {pendingGive.reason && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Motif</span>
                    <span style={{ fontSize: '0.85rem', textAlign: 'right' }}>{pendingGive.reason}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPendingGive(null)} disabled={giving}>Annuler</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGiveConfirm} disabled={giving}>{giving ? 'Envoi…' : 'Confirmer'}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGiveSubmit}>
              <div className="form-group">
                <label className="form-label">Membre de l'équipe</label>
                <select className="form-select" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} required>
                  <option value="">Sélectionner un membre…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.name} — {m.token_balance} tokens</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Montant</label>
                <input className="form-input" type="number" min={1} value={giveAmount} onChange={(e) => setGiveAmount(e.target.value)} placeholder="ex. 20" required />
              </div>
              <div className="form-group">
                <label className="form-label">Motif (facultatif)</label>
                <input className="form-input" type="text" value={giveReason} onChange={(e) => setGiveReason(e.target.value)} placeholder="ex. Excellent accueil client" />
              </div>
              {giveError && <p className="form-error">{giveError}</p>}
              {giveSuccess && <p className="form-success">{giveSuccess}</p>}
              <button type="submit" className="btn btn-primary btn-full" disabled={giving}>Donner</button>
            </form>
          )}
        </div>

        {/* Liste des membres */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              Mon équipe
              {team && <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>{team.name}</span>}
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setAddMode(addMode === 'none' ? 'existing' : 'none'); setAddError(''); setCreateError(''); }}>
              + Ajouter
            </button>
          </div>

          {addMode !== 'none' && (
            <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button type="button" onClick={() => { setAddMode('existing'); setAddError(''); setCreateError(''); }}
                  className={addMode === 'existing' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
                  Depuis la liste
                </button>
                <button type="button" onClick={() => { setAddMode('create'); setAddError(''); setCreateError(''); }}
                  className={addMode === 'create' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
                  Créer un collaborateur
                </button>
              </div>

              {addMode === 'existing' && (
                <form onSubmit={handleAddExisting}>
                  {available.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aucun collaborateur disponible sans équipe.</p>
                  ) : (
                    <>
                      <select className="form-select" value={addingId} onChange={(e) => setAddingId(e.target.value)} required style={{ marginBottom: 10 }}>
                        <option value="">Sélectionner un collaborateur…</option>
                        {available.map((u) => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.name} — {u.email}</option>
                        ))}
                      </select>
                      {addError && <p className="form-error">{addError}</p>}
                      <button type="submit" className="btn btn-primary btn-sm" disabled={addingLoad || !addingId}>
                        {addingLoad ? 'Ajout…' : 'Ajouter à l\'équipe'}
                      </button>
                    </>
                  )}
                </form>
              )}

              {addMode === 'create' && (
                <form onSubmit={handleCreateCollaborator}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <input className="form-input" type="text" placeholder="Prénom" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} required />
                    <input className="form-input" type="text" placeholder="Nom" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
                  </div>
                  <input className="form-input" type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required style={{ marginBottom: 10 }} />
                  <input className="form-input" type="password" placeholder="Mot de passe (min. 8 car.)" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required style={{ marginBottom: 10 }} />
                  {createError && <p className="form-error">{createError}</p>}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={createLoad}>
                    {createLoad ? 'Création…' : 'Créer et ajouter à l\'équipe'}
                  </button>
                </form>
              )}
            </div>
          )}

          {members.length === 0 ? (
            <p className="empty-state">Aucun collaborateur dans votre équipe.</p>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th style={{ textAlign: 'right' }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/manager/collaborateurs/${m.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 500 }}>{m.first_name} {m.name}</td>
                      <td style={{ textAlign: 'right' }}><span className="token-badge">{m.token_balance}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Attributions automatiques */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: schedRules.length > 0 ? 16 : 0 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Attributions automatiques</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Tokens attribués automatiquement à un membre à date récurrente.</p>
          </div>
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, marginLeft: 12 }} onClick={() => { setSchedForm(EMPTY_SCHED); setSchedError(''); setShowSchedModal(true); }}>
            + Créer
          </button>
        </div>

        {schedRules.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedRules.map((r) => {
              const who = r.receiver ? `${r.receiver.first_name} ${r.receiver.name}` : '—';
              const when = r.frequency === 'monthly'
                ? `Chaque mois, le ${r.day_of_month}`
                : `Chaque année, le ${r.day_of_month} ${MONTHS[(r.month ?? 1) - 1]}`;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      <span className="token-badge" style={{ marginRight: 6 }}>{r.amount}</span>{who}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {when} — {r.label || 'sans motif'} · Prochaine : {fmtShort(r.next_run_at)}
                    </p>
                  </div>
                  <button role="switch" aria-checked={r.active} onClick={() => handleToggleSched(r.id)} className={`param-toggle ${r.active ? 'param-toggle--on' : ''}`} style={{ flexShrink: 0 }} />
                  <button onClick={() => handleDeleteSched(r.id)} style={{ color: 'var(--danger)', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }} aria-label="Supprimer">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bons d'achat utilisés */}
      <div style={{ marginTop: 28 }}>
        <h2 className="carousel-title" style={{ marginBottom: 12 }}>Mes bons d'achat</h2>
        {orders.length === 0 ? (
          <div className="card"><p className="empty-state">Tu n'as pas encore racheté de bon.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((order) => (
              <div key={order.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>{order.voucher?.partner ?? '—'}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.voucher?.title ?? '—'}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{fmtShort(order.redeemed_at)}</p>
                </div>
                <span className="promo-code" style={{ fontSize: '0.8rem', flexShrink: 0 }}>{order.promo_code}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal création attribution automatique */}
      {showSchedModal && (
        <div className="emp-modal-overlay" onClick={() => setShowSchedModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">Attribution automatique</h2>
            <form onSubmit={handleSubmitSched} noValidate>
              <div className="form-group">
                <label className="form-label">Membre de l'équipe</label>
                <select className="form-select" value={schedForm.receiver_id} onChange={(e) => setSchedForm({ ...schedForm, receiver_id: e.target.value })} required>
                  <option value="">Sélectionner un membre…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.name}</option>
                  ))}
                </select>
              </div>
              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Tokens</label>
                  <input className="form-input" type="text" inputMode="numeric" placeholder="Ex : 10" value={schedForm.amount}
                    onChange={(e) => setSchedForm({ ...schedForm, amount: e.target.value.replace(/[^0-9]/g, '') })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fréquence</label>
                  <select className="form-select" value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value as 'monthly' | 'annual' })}>
                    <option value="monthly">Mensuelle</option>
                    <option value="annual">Annuelle</option>
                  </select>
                </div>
              </div>
              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Jour du mois</label>
                  <input className="form-input" type="text" inputMode="numeric" placeholder="Ex : 1" value={schedForm.day_of_month}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 28)) setSchedForm({ ...schedForm, day_of_month: v }); }} required />
                </div>
                {schedForm.frequency === 'annual' && (
                  <div className="form-group">
                    <label className="form-label">Mois</label>
                    <select className="form-select" value={schedForm.month} onChange={(e) => setSchedForm({ ...schedForm, month: parseInt(e.target.value) })}>
                      {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Motif (optionnel)</label>
                <input className="form-input" type="text" placeholder="Ex : Prime mensuelle…" value={schedForm.label} onChange={(e) => setSchedForm({ ...schedForm, label: e.target.value })} />
              </div>
              {schedError && <p className="form-error">{schedError}</p>}
              <div className="emp-modal-actions">
                <button type="button" style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setShowSchedModal(false)} disabled={schedLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6" /></svg>
                  Retour
                </button>
                <button type="submit" className="btn btn-primary" disabled={schedLoading}>{schedLoading ? 'Enregistrement…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function PourToi() {
  const { user } = useAuth();
  if (user?.role === 'manager') return <ManagerPourToi />;
  return <EmployeePourToi />;
}

function EmployeePourToi() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const [vouchers, setVouchers]     = useState<Voucher[]>([]);
  const [orders, setOrders]         = useState<Redemption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [redeeming, setRedeeming]   = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const { isFavorite, toggle } = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();

  useEffect(() => {
    Promise.all([
      marketplaceService.getItems().then(setVouchers).catch(() => {}),
      marketplaceService.getOrders().then(setOrders).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleRedeem(voucher: Voucher) {
    setRedeeming(voucher.id);
    try {
      const { promo_code } = await marketplaceService.redeem(voucher.id);
      setPromoCodes((p) => ({ ...p, [voucher.id]: promo_code }));
      setVouchers((vs) => vs.map((v) => v.id === voucher.id ? { ...v, available: false } : v));
      if (user?.role === 'employer') {
        await refreshCompany();
      } else {
        await refreshUser();
      }
    } catch {
      // balance error handled by disabled state
    } finally {
      setRedeeming(null);
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const balance = user?.role === 'employer' ? (company?.token_balance ?? 0) : (user?.token_balance ?? 0);

  const available = vouchers.filter((v) => v.available);

  /* Offres du moment : plus favorisées d'abord, puis plus récentes */
  const populaires = [...available]
    .sort((a, b) =>
      (b.favorite_count ?? 0) - (a.favorite_count ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  /* Favoris : featured admin d'abord, puis les plus aimés pour compléter jusqu'à 50 */
  const featured = available.filter((v) => v.is_featured);
  const featuredIds = new Set(featured.map((v) => v.id));
  const heartedFill = available
    .filter((v) => !featuredIds.has(v.id) && (v.favorite_count ?? 0) > 0)
    .sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0));
  const topFavoris = [...featured, ...heartedFill].slice(0, 50);

  /* Offres de la semaine : marquées is_weekly par l'admin, ou ajoutées il y a moins de 7 jours */
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPinned = available.filter((v) => v.is_weekly);
  const weeklyPinnedIds = new Set(weeklyPinned.map((v) => v.id));
  const recentFill = available.filter((v) => !weeklyPinnedIds.has(v.id) && new Date(v.created_at) > sevenDaysAgo);
  const newThisWeek = [
    ...weeklyPinned,
    ...recentFill.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  ];

  const fmt = fmtShort;

  return (
    <div>
      <div className="page-header page-header--centered">
        <h1>Tes offres et tes bons d'achat</h1>
      </div>

      {/* Carousel offres du moment */}
      <CarouselRow
        title="Offres du moment"
        vouchers={populaires}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Favoris globaux */}
      <CarouselRow
        title="❤️ Favoris"
        vouchers={topFavoris}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Offres de la semaine */}
      <CarouselRow
        title="🆕 Les offres de la semaine"
        vouchers={newThisWeek}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        promoCodes={promoCodes}
        userBalance={balance}
        isFavorite={isFavorite}
        onToggle={toggle}
        isInCart={isInCart}
        onCartToggle={cartToggle}
      />

      {/* Bons déjà achetés */}
      <div style={{ marginTop: 28 }}>
        <h2 className="carousel-title" style={{ marginBottom: 12 }}>Mes bons d'achat</h2>
        {orders.length === 0 ? (
          <div className="card">
            <p className="empty-state">Tu n'as pas encore racheté de bon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((order) => (
              <div key={order.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>
                    {order.voucher?.partner ?? '—'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {order.voucher?.title ?? '—'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {fmt(order.redeemed_at)}
                  </p>
                </div>
                <span className="promo-code" style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                  {order.promo_code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
