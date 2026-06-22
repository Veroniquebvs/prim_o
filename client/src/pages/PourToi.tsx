import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { marketplaceService } from '../services/marketplace.service';
import { managerService } from '../services/manager.service';
import { userService } from '../services/user.service';
import { useFavorites } from '../hooks/useFavorites';
import { useCart } from '../hooks/useCart';
import { resolveImageUrl } from '../utils/imageUrl';
import { getCategory, getCategoryColor } from '../utils/category';
import type { Voucher, Redemption, Team, ScheduledAllocation, User, TokenTransaction } from '../types';
import { fmtShort } from '../utils/date';

/* ── Gold coin SVG ── */
function CoinSVG({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(176,120,0,0.45))' }}>
      <circle cx="60" cy="60" r="56" fill="url(#coinBase)" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="44" fill="url(#coinInner)" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <text x="60" y="70" textAnchor="middle" fontSize="30" fontWeight="800"
        fontFamily="Poppins,sans-serif" fill="rgba(255,255,255,0.85)">P</text>
      <defs>
        <radialGradient id="coinBase" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="50%" stopColor="#F0A800" />
          <stop offset="100%" stopColor="#A06000" />
        </radialGradient>
        <radialGradient id="coinInner" cx="42%" cy="38%" r="68%">
          <stop offset="0%" stopColor="#FFD740" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#C88000" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Team bar chart ── */
function TeamBarChart({ members }: { members: User[] }) {
  const max = Math.max(...members.map((m) => m.token_balance), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {members.map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 72, fontSize: '0.75rem', fontWeight: 600,
            color: 'var(--text-muted)', flexShrink: 0,
            textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {m.first_name}
          </div>
          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${(m.token_balance / max) * 100}%`,
              minWidth: m.token_balance > 0 ? 8 : 0,
              height: '100%',
              background: 'var(--primary)',
              borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ width: 36, fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0, textAlign: 'right' }}>
            {m.token_balance}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const catColor = getCategoryColor(getCategory(voucher));

  return (
    <div
      className="voucher-card-carousel"
      style={{ cursor: 'pointer', backgroundColor: catColor.light }}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
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

/* ════════════════════════════════════════════════════════════
   MANAGER VIEW
════════════════════════════════════════════════════════════ */
function ManagerPourToi() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam]             = useState<Team | null>(null);
  const [orders, setOrders]         = useState<Redemption[]>([]);
  const [schedRules, setSchedRules] = useState<ScheduledAllocation[]>([]);
  const [available, setAvailable]   = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);

  /* Quick send per collaborator card */
  const [quickMember, setQuickMember]   = useState<User | null>(null);
  const [quickAmount, setQuickAmount]   = useState('');
  const [quickReason, setQuickReason]   = useState('');
  const [quickGiving, setQuickGiving]   = useState(false);
  const [quickError, setQuickError]     = useState('');
  const [quickSuccess, setQuickSuccess] = useState('');

  /* Add collaborator panel */
  const [addMode, setAddMode]       = useState<'none'|'existing'|'create'>('none');
  const [addingId, setAddingId]     = useState('');
  const [addingLoad, setAddingLoad] = useState(false);
  const [addError, setAddError]     = useState('');
  const [createForm, setCreateForm] = useState({ first_name: '', name: '', email: '', password: '' });
  const [createLoad, setCreateLoad] = useState(false);
  const [createError, setCreateError] = useState('');

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

  /* Quick send */
  async function handleQuickSend(e: React.FormEvent) {
    e.preventDefault();
    if (!quickMember) return;
    setQuickGiving(true); setQuickError('');
    try {
      await managerService.giveTokens(quickMember.id, parseInt(quickAmount) || 0, quickReason || undefined);
      setQuickSuccess(`${quickAmount} tokens envoyés à ${quickMember.first_name} !`);
      setQuickAmount(''); setQuickReason('');
      refreshUser(); fetchAll();
      setTimeout(() => { setQuickMember(null); setQuickSuccess(''); }, 1800);
    } catch (err: any) {
      setQuickError(err?.response?.data?.error ?? "Erreur lors de l'envoi.");
    } finally { setQuickGiving(false); }
  }

  /* Add collaborator */
  async function handleAddExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!addingId) return;
    setAddingLoad(true); setAddError('');
    try {
      await managerService.addTeamMember(addingId);
      setAddingId(''); setAddMode('none');
      await fetchAll();
    } catch (err: any) {
      setAddError(err?.response?.data?.error ?? "Erreur lors de l'ajout.");
    } finally { setAddingLoad(false); }
  }

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

  /* Scheduled allocations */
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
      setSchedError(err?.response?.data?.error ?? 'Erreur lors de la création.');
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
      {/* ══ Dark hero ══ */}
      <div className="manager-hero">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2.4rem', color: '#ffffff', letterSpacing: '0.5px' }}>prim'</span>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '3.6rem', color: '#f0a800', lineHeight: 1 }}>o</span>
          </span>
        </div>

        {/* Two-column: left = avatar placeholder, right = coin + stock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Left — avatar area (client will provide asset) */}
          <div style={{ flex: 1 }} />

          {/* Right — coin + token count window */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, transform: 'translateY(55px)' }}>
            {team?.name && (
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 4, letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {team.name}
              </span>
            )}
            {/* Token Image from client/public/icons */}
            <img 
              src="/icons/token-logo-SF.png" 
              alt="Token" 
              style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.4))', zIndex: 2, marginBottom: '-20px' }} 
            />
            <div style={{ background: '#303236', border: '3px solid #ffffff', borderRadius: '16px', padding: '18px 24px 10px 24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '180px' }}>
              <p style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                {user?.token_balance ?? 0}
              </p>
              <p style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: 500, marginTop: 4, opacity: 0.8 }}>
                Tokens stock
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Mes collaborateurs ══ */}
      <div style={{ marginBottom: 28, marginTop: 55 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Mes collaborateurs</h2>
        </div>

        {/* List of collaborators */}
        {members.length === 0 ? (
          <p className="empty-state" style={{ marginBottom: 24 }}>Aucun collaborateur dans votre équipe.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {members.map((m) => (
              <div
                key={m.id}
                className="manager-collab-row"
                onClick={() => navigate(`/manager/collaborateurs/${m.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 700, marginRight: 12 }}>
                    {(m.first_name[0] ?? '').toUpperCase()}{(m.name[0] ?? '').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#000', marginBottom: 2 }}>{m.first_name} {m.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#666' }}>Collaborateur</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: '#f0a800', fontSize: '0.9rem' }}>{m.token_balance} tkn</span>
                  <button className="manager-collab-btn" onClick={(e) => { e.stopPropagation(); setQuickMember(m); setQuickAmount(''); setQuickReason(''); setQuickError(''); setQuickSuccess(''); }}>+ Envoyer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Panel (Window below collaborators) */}
        <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Ajouter à l'équipe</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button"
              onClick={() => { setAddMode('existing'); setAddError(''); setCreateError(''); }}
              className={addMode === 'existing' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
              Depuis la liste
            </button>
            <button type="button"
              onClick={() => { setAddMode('create'); setAddError(''); setCreateError(''); }}
              className={addMode === 'create' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
              Créer un profil
            </button>
          </div>
        )}

          {addMode === 'existing' && (
            <form onSubmit={handleAddExisting}>
              {available.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Aucun collaborateur disponible sans équipe.
                </p>
              ) : (
                <>
                  <select className="form-select" value={addingId}
                    onChange={(e) => setAddingId(e.target.value)} required style={{ marginBottom: 12 }}>
                    <option value="">Sélectionner un collaborateur…</option>
                    {available.map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.name} — {u.email}</option>
                    ))}
                  </select>
                  {addError && <p className="form-error">{addError}</p>}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addingLoad || !addingId}>
                    {addingLoad ? 'Ajout…' : "Ajouter à l'équipe"}
                  </button>
                </>
              )}
            </form>
          )}

          {addMode === 'create' && (
            <form onSubmit={handleCreateCollaborator}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <input className="form-input" type="text" placeholder="Prénom"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} required />
                <input className="form-input" type="text" placeholder="Nom"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
              </div>
              <input className="form-input" type="email" placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required style={{ marginBottom: 12 }} />
              <input className="form-input" type="password" placeholder="Mot de passe (min. 8 car.)"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required style={{ marginBottom: 12 }} />
              {createError && <p className="form-error">{createError}</p>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={createLoad}>
                {createLoad ? 'Création…' : "Créer et ajouter à l'équipe"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ══ Distribution chart ══ */}
      {members.length > 1 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Distribution tokens</h2>
          <TeamBarChart members={members} />
        </div>
      )}

      {/* ══ Attributions automatiques ══ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: schedRules.length > 0 ? 16 : 0 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Attributions automatiques</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Tokens attribués automatiquement à un membre à date récurrente.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, marginLeft: 12 }}
            onClick={() => { setSchedForm(EMPTY_SCHED); setSchedError(''); setShowSchedModal(true); }}
          >
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
                  <button role="switch" aria-checked={r.active} onClick={() => handleToggleSched(r.id)}
                    className={`param-toggle ${r.active ? 'param-toggle--on' : ''}`} style={{ flexShrink: 0 }} />
                  <button onClick={() => handleDeleteSched(r.id)}
                    style={{ color: 'var(--danger)', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
                    aria-label="Supprimer">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Bons d'achat utilisés ══ */}
      <div style={{ marginBottom: 28 }}>
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

      {/* ══ Quick send modal ══ */}
      {quickMember && (
        <div className="emp-modal-overlay" onClick={() => { setQuickMember(null); setQuickError(''); setQuickSuccess(''); }}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 700, flexShrink: 0,
              }}>
                {(quickMember.first_name[0] ?? '').toUpperCase()}{(quickMember.name[0] ?? '').toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{quickMember.first_name} {quickMember.name}</p>
                <span className="token-badge" style={{ fontSize: '0.72rem' }}>{quickMember.token_balance} tkn actuels</span>
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
                  <label className="form-label">Motif (facultatif)</label>
                  <input className="form-input" type="text" value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    placeholder="ex. Excellent accueil client" />
                </div>
                {quickError && <p className="form-error">{quickError}</p>}
                <div className="emp-modal-actions">
                  <button type="button" className="btn btn-outline"
                    onClick={() => { setQuickMember(null); setQuickError(''); }} disabled={quickGiving}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={quickGiving || !quickAmount}>
                    {quickGiving ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ Scheduled allocation modal ══ */}
      {showSchedModal && (
        <div className="emp-modal-overlay" onClick={() => setShowSchedModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="emp-modal-title">Attribution automatique</h2>
            <form onSubmit={handleSubmitSched} noValidate>
              <div className="form-group">
                <label className="form-label">Membre de l'équipe</label>
                <select className="form-select" value={schedForm.receiver_id}
                  onChange={(e) => setSchedForm({ ...schedForm, receiver_id: e.target.value })} required>
                  <option value="">Sélectionner un membre…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.name}</option>
                  ))}
                </select>
              </div>
              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Tokens</label>
                  <input className="form-input" type="text" inputMode="numeric" placeholder="Ex : 10"
                    value={schedForm.amount}
                    onChange={(e) => setSchedForm({ ...schedForm, amount: e.target.value.replace(/[^0-9]/g, '') })}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fréquence</label>
                  <select className="form-select" value={schedForm.frequency}
                    onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value as 'monthly' | 'annual' })}>
                    <option value="monthly">Mensuelle</option>
                    <option value="annual">Annuelle</option>
                  </select>
                </div>
              </div>
              <div className="emp-modal-row">
                <div className="form-group">
                  <label className="form-label">Jour du mois</label>
                  <input className="form-input" type="text" inputMode="numeric" placeholder="Ex : 1"
                    value={schedForm.day_of_month}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 28))
                        setSchedForm({ ...schedForm, day_of_month: v });
                    }} required />
                </div>
                {schedForm.frequency === 'annual' && (
                  <div className="form-group">
                    <label className="form-label">Mois</label>
                    <select className="form-select" value={schedForm.month}
                      onChange={(e) => setSchedForm({ ...schedForm, month: parseInt(e.target.value) })}>
                      {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Motif (optionnel)</label>
                <input className="form-input" type="text" placeholder="Ex : Prime mensuelle…"
                  value={schedForm.label}
                  onChange={(e) => setSchedForm({ ...schedForm, label: e.target.value })} />
              </div>
              {schedError && <p className="form-error">{schedError}</p>}
              <div className="emp-modal-actions">
                <button type="button" onClick={() => setShowSchedModal(false)} disabled={schedLoading}
                  style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Retour
                </button>
                <button type="submit" className="btn btn-primary" disabled={schedLoading}>
                  {schedLoading ? 'Enregistrement…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE SWITCH
════════════════════════════════════════════════════════════ */
export default function PourToi() {
  const { user } = useAuth();
  if (user?.role === 'manager') return <ManagerPourToi />;
  return <EmployeePourToi />;
}

/* ════════════════════════════════════════════════════════════
   EMPLOYEE VIEW
════════════════════════════════════════════════════════════ */
function EmployeePourToi() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const [vouchers, setVouchers]         = useState<Voucher[]>([]);
  const [orders, setOrders]             = useState<Redemption[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [redeeming, setRedeeming]       = useState<string | null>(null);
  const [promoCodes, setPromoCodes]     = useState<Record<string, string>>({});
  const { isFavorite, toggle }          = useFavorites();
  const { isInCart, toggle: cartToggle } = useCart();

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      marketplaceService.getItems().then(setVouchers).catch(() => {}),
      marketplaceService.getOrders().then(setOrders).catch(() => {}),
      userService.getHistory(user.id).then(setTransactions).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user?.id]);

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

  /* Last 6 received transactions */
  const recentReceived = transactions
    .filter((tx) => tx.receiver_id === user?.id)
    .slice(0, 6);

  const available = vouchers.filter((v) => v.available);

  const populaires = [...available]
    .sort((a, b) =>
      (b.favorite_count ?? 0) - (a.favorite_count ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  const featured = available.filter((v) => v.is_featured);
  const featuredIds = new Set(featured.map((v) => v.id));
  const heartedFill = available
    .filter((v) => !featuredIds.has(v.id) && (v.favorite_count ?? 0) > 0)
    .sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0));
  const topFavoris = [...featured, ...heartedFill].slice(0, 50);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPinned = available.filter((v) => v.is_weekly);
  const weeklyPinnedIds = new Set(weeklyPinned.map((v) => v.id));
  const recentFill = available.filter((v) => !weeklyPinnedIds.has(v.id) && new Date(v.created_at) > sevenDaysAgo);
  const newThisWeek = [
    ...weeklyPinned,
    ...recentFill.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  ];

  return (
    <div>
      {/* ══ Teal hero ══ */}
      <div className="pour-toi-hero">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2.4rem', color: '#ffffff', letterSpacing: '0.5px' }}>prim'</span>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '3.6rem', color: '#f0a800', lineHeight: 1 }}>o</span>
          </span>
        </div>

        {/* Two-column: left = avatar placeholder, right = coin + stock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Left — avatar area (client will provide asset) */}
          <div style={{ flex: 1 }} />

          {/* Right — coin + token count window */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, transform: 'translateY(55px)' }}>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 4, letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Bonjour, {user?.first_name} !
            </span>
            {/* Token Image from client/public/icons */}
            <img 
              src="/icons/token-logo-SF.png" 
              alt="Token" 
              style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.4))', zIndex: 2, marginBottom: '-20px' }} 
            />
            <div style={{ background: '#303236', border: '3px solid #ffffff', borderRadius: '16px', padding: '18px 24px 10px 24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '180px' }}>
              <p style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                {balance}
              </p>
              <p style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: 500, marginTop: 4, opacity: 0.8 }}>
                Tokens stock
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Feedback instantané ══ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>Feedback instantané</h2>
        {recentReceived.length === 0 ? (
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <p className="empty-state">Vous n'avez pas encore reçu de tokens récemment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentReceived.map((tx) => {
              const senderName = tx.sender
                ? `${tx.sender.first_name} ${tx.sender.name}`
                : "prim'O";
              return (
                <div key={tx.id} style={{
                  background: '#ffffff', borderRadius: '16px', padding: '16px 20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(26, 122, 26, 0.1)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                      Vous avez gagné {tx.amount} Tokens !
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Envoyé par {senderName} {tx.reason ? ` - "${tx.reason}"` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Bons déjà achetés ══ */}
      <div style={{ marginBottom: 28 }}>
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
    </div>
  );
}
