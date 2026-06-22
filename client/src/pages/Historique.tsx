/**
 * pages/Historique.tsx — Token and redemption history page, shared across all roles.
 *
 * Displays three tabs: "Mes tokens" (all token transactions involving the user), "Mes achats"
 * (redemption history for employees), and "Mon équipe" (allocations sent, for employers).
 *
 * Additionally, for employers and for employees whose company has feedback_enabled, a live
 * activity feed is shown below the tabs. The feed polls the transactions API every 5 seconds and
 * highlights newly appeared entries with a brief animation. First load silently populates the known
 * ID set without marking anything as new, so the highlight only fires on subsequent real-time events.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { marketplaceService } from '../services/marketplace.service';
import { tokenService } from '../services/token.service';
import type { TokenTransaction, Redemption, AdminRedemption } from '../types';
import { fmtShort as fmt, fmtDateTime } from '../utils/date';

type Tab = 'tokens' | 'achats' | 'depenses';

export default function Historique() {
  const { user, company } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'employer';
  
  // Default tab selection based on role
  const [tab, setTab] = useState<Tab>(isManager ? 'depenses' : 'tokens');
  
  // Employee-specific states
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]); 
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  
  // Employer/Manager-specific states
  const [companyTx, setCompanyTx] = useState<TokenTransaction[]>([]); 
  const [companyOrders, setCompanyOrders] = useState<AdminRedemption[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Feed states
  const [feed, setFeed] = useState<TokenTransaction[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFeed = useRef(true);
  const [totalLastMonthTokens, setTotalLastMonthTokens] = useState<number>(0);

  useEffect(() => {
    if (!user?.id) return;

    const tasks: Promise<unknown>[] = [];

    // Only employees (or manager viewed as employee) can receive tokens directly in the old way
    if (!isManager || user.role === 'manager') {
      tasks.push(userService.getHistory(user.id).then(setTransactions).catch(() => {}));
      tasks.push(marketplaceService.getOrders().then(setRedemptions).catch(() => {}));
    }

    // Global transactions and orders for Managers/Employers
    if (isManager) {
      tasks.push(tokenService.getTransactions().then(setCompanyTx).catch(() => {}));
      tasks.push(marketplaceService.getCompanyOrders().then(setCompanyOrders).catch(() => {}));
    }

    Promise.all(tasks).finally(() => setLoading(false));
  }, [user?.id, user?.role, isManager]);

  const showFeed = user?.role === 'employer' || (user?.role === 'employee' && company?.feedback_enabled === true);

  useEffect(() => {
    if (!user?.id || !showFeed) return;

    const fetchFeed = async () => {
      try {
        const data = await tokenService.getTransactions();
        const companyTx = Array.isArray(data) ? data.filter((tx) => tx && tx.company_id === user?.company_id) : [];
        const latest = companyTx.slice(0, 10);

        // Calculate last month's total tokens won
        const now = new Date();
        let prevMonth = now.getMonth() - 1;
        let prevMonthYear = now.getFullYear();
        if (prevMonth < 0) {
          prevMonth = 11;
          prevMonthYear = now.getFullYear() - 1;
        }

        const lastMonthAllocations = companyTx.filter((tx) => {
          if (!tx) return false;
          const txDate = new Date(tx.createdAt || tx.created_at || 0);
          return (
            txDate.getMonth() === prevMonth &&
            txDate.getFullYear() === prevMonthYear
          );
        });

        const sum = lastMonthAllocations.reduce((acc, tx) => acc + (tx.amount || 0), 0);
        setTotalLastMonthTokens(sum);

        const incoming = latest.filter((tx) => !knownIds.current.has(tx.id));
        if (incoming.length === 0) return;

        incoming.forEach((tx) => knownIds.current.add(tx.id));

        if (isFirstFeed.current) {
          isFirstFeed.current = false;
          setFeed(latest);
        } else {
          setNewIds(new Set(incoming.map((tx) => tx.id)));
          setTimeout(() => setNewIds(new Set()), 1800);
          setFeed((prev) => [...incoming, ...prev].slice(0, 10));
        }
      } catch {
        // silently ignore — feed is non-critical
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, [user?.id, showFeed, user?.company_id]);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  // Build Tabs dynamically
  const tabs: { key: Tab; label: string }[] = [];

  // Unified timeline for employees
  const employeeTimeline = !isManager
    ? [...transactions.map(t => ({ ...t, _kind: 'token' })), ...redemptions.map(r => ({ ...r, _kind: 'redemption' }))]
        .sort((a, b) => {
          const da = new Date(a._kind === 'token' ? a.created_at : a.redeemed_at).getTime();
          const db = new Date(b._kind === 'token' ? b.created_at : b.redeemed_at).getTime();
          return db - da;
        })
    : [];

  // Unified timeline for managers and employers
  const managerTimeline = isManager
    ? [...companyTx.map(t => ({ ...t, _kind: 'token' })), ...companyOrders.map(r => ({ ...r, _kind: 'redemption' }))]
        .sort((a, b) => {
          const da = new Date(a._kind === 'token' ? a.created_at : a.redeemed_at).getTime();
          const db = new Date(b._kind === 'token' ? b.created_at : b.redeemed_at).getTime();
          return db - da;
        })
    : [];

  return (
    <div>
      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="hist-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`hist-tab ${tab === t.key ? 'hist-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Unified Timeline (Employee only) */}
      {!isManager && (
        <div className="card" style={{ marginTop: 16 }}>
          {employeeTimeline.length === 0 ? (
            <p className="empty-state">Aucun historique disponible.</p>
          ) : (
<<<<<<< Updated upstream
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {employeeTimeline.map((item) => {
                if (item._kind === 'token') {
                  const tx = item as TokenTransaction & { _kind: 'token' };
                  if (tx.type === 'role_change') {
                    const text = tx.reason === 'manager' 
                      ? 'Promotion au poste de Manager' 
                      : 'Rétrogradation au poste de Collaborateur';
                    return (
                      <div key={`tx-${tx.id}`} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{text}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                          {fmtDateTime(tx.created_at)}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tokens reçus <span className="token-badge" style={{ marginLeft: 6 }}>+{tx.amount}</span></p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Motif : {tx.reason || tx.type || '—'}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(tx.created_at)}</p>
                      </div>
                    </div>
                  );
                } else {
                  const r = item as Redemption & { _kind: 'redemption' };
                  return (
                    <div key={`red-${r.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Achat de bon <span className="token-badge" style={{ background: '#fef2f2', color: '#991b1b', marginLeft: 6 }}>-{r.voucher?.token_cost ?? '?'}</span></p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Offre : {r.voucher?.title || '—'} ({r.voucher?.partner || '—'})</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(r.redeemed_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="promo-code" style={{ fontSize: '0.75rem' }}>{r.promo_code}</span>
                      </div>
                    </div>
                  );
                }
              })}
=======
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Montant</th>
                    <th>Motif</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td><span className="token-badge">+{tx.amount}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.type || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(tx.createdAt || tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
>>>>>>> Stashed changes
            </div>
          )}
        </div>
      )}

      {/* Unified Timeline (Manager/Employer) */}
      {isManager && (
        <div className="card" style={{ marginTop: 16 }}>
          {managerTimeline.length === 0 ? (
            <p className="empty-state">Aucun historique d'équipe disponible.</p>
          ) : (
<<<<<<< Updated upstream
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {managerTimeline.map((item) => {
                if (item._kind === 'token') {
                  const tx = item as TokenTransaction & { _kind: 'token' };
                  if (tx.type === 'role_change') {
                    const text = tx.reason === 'manager' 
                      ? 'a été promu(e) au poste de Manager' 
                      : 'a été rétrogradé(e) au poste de Collaborateur';
                    const receiverName = tx.receiver?.first_name || tx.receiver?.name || 'Un collaborateur';
                    return (
                      <div key={`mtx-${tx.id}`} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{receiverName} {text}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                          {fmtDateTime(tx.created_at)}
                        </p>
                      </div>
                    );
                  }
                  let receiverName = tx.receiver?.first_name || tx.receiver?.name || 'Un collaborateur';
                  if (tx.type === 'employer_to_team') {
                    receiverName = `L'équipe de ${tx.receiver?.first_name} ${tx.receiver?.name}`;
                  }
                  const senderName = tx.sender?.first_name || tx.sender?.name || 'Système';
                  return (
                    <div key={`mtx-${tx.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {receiverName} a reçu des tokens <span className="token-badge" style={{ marginLeft: 6 }}>+{tx.amount}</span>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Motif : {tx.reason || tx.type || '—'} (par {senderName})</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(tx.created_at)}</p>
                      </div>
                    </div>
                  );
                } else {
                  const r = item as AdminRedemption & { _kind: 'redemption' };
                  const buyerName = r.user?.first_name || r.user?.name || 'Un collaborateur';
                  const offerName = r.voucher?.title || '—';
                  const partnerName = r.voucher?.partner || '—';
                  return (
                    <div key={`mred-${r.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {buyerName} a acheté le bon "{offerName}" <span className="token-badge" style={{ background: '#fef2f2', color: '#991b1b', marginLeft: 6 }}>-{r.voucher?.token_cost ?? '?'}</span>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Partenaire : {partnerName}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(r.redeemed_at)}</p>
                      </div>
                    </div>
                  );
                }
              })}
=======
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Boutique</th>
                    <th>Code promo</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {r.voucher?.partner || '—'}
                      </td>
                      <td>
                        <span className="promo-code">{r.promo_code}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {fmt(r.createdAt || r.redeemed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
>>>>>>> Stashed changes
            </div>
          )}
        </div>
      )}

<<<<<<< Updated upstream
      {/* Fil d'activité entreprise — temps réel */}
=======
      {/* Mon équipe (employer only) */}
      {tab === 'equipe' && (
        <div className="card" style={{ marginTop: 16 }}>
          {teamTx.length === 0 ? (
            <p className="empty-state">Aucune allocation effectuée.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Collaborateur</th>
                    <th>Tokens</th>
                    <th>Motif</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTx
                    .filter((tx) => tx.sender_id === user?.id)
                    .map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 500, fontSize: '0.82rem' }}>
                          {tx.receiver?.first_name || tx.receiver?.name || tx.receiver_id?.slice(0, 8)}
                        </td>
                        <td><span className="token-badge">{tx.amount}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.type || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(tx.createdAt || tx.created_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fil d'activité entreprise — temps réel, visible pour les employeurs et les employés si activé */}
>>>>>>> Stashed changes
      {showFeed && (
        <div className="card feed-card" style={{ marginTop: 24 }}>
          <div className="feed-header">
            <span className="feed-title">Activité dans l'entreprise</span>
            <span className="feed-dot" />
          </div>

          {new Date().getDate() === 1 && (
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(240, 168, 0, 0.2)'
            }}>
              <span>🎉</span>
              <span>
                Le mois dernier, <strong>{totalLastMonthTokens}</strong> tokens ont été gagnés pour célébrer les réussites de l'équipe !
              </span>
            </div>
          )}

          {feed.length === 0 ? (
            <p className="empty-state">Aucune activité pour le moment.</p>
          ) : (
            <ul className="feed-list">
              {feed.map((tx) => {
                const isNew = newIds.has(tx.id);
                return (
                  <li key={tx.id} className={`feed-item${isNew ? ' feed-item--new' : ''}`}>
                    <span className="feed-avatar" style={{ background: 'transparent' }}>
                      <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="11" fill="#F5C518" />
                        <circle cx="12" cy="12" r="9" fill="#F5C518" stroke="#E6A800" strokeWidth="1" />
                        <text x="12" y="16.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#1A7A1A">P</text>
                      </svg>
                    </span>
                    <span className="feed-text">
                      <span className="token-badge feed-badge">+{tx.amount}</span> tokens gagnés pour : <strong>{tx.type || '—'}</strong>
                    </span>
                    <span className="feed-time">{fmt(tx.createdAt || tx.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
