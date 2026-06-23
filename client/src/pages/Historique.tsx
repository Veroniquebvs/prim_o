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
        .sort((a: any, b: any) => {
          const da = new Date(a._kind === 'token' ? (a.createdAt || a.created_at) : (a.redeemed_at || a.createdAt || a.created_at)).getTime();
          const db = new Date(b._kind === 'token' ? (b.createdAt || b.created_at) : (b.redeemed_at || b.createdAt || b.created_at)).getTime();
          return db - da;
        })
    : [];

  // Unified timeline for managers and employers
  const managerTimeline = isManager
    ? companyTx
        .filter(t => t && t.amount > 0)
        .map(t => ({ ...t, _kind: 'token' }))
        .sort((a: any, b: any) => {
          const da = new Date(a.createdAt || a.created_at).getTime();
          const db = new Date(b.createdAt || b.created_at).getTime();
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
                          {fmtDateTime(tx.createdAt || tx.created_at)}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tokens reçus <span className="token-badge" style={{ marginLeft: 6 }}>+{tx.amount}</span></p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Motif : {tx.reason || tx.type || '—'}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(tx.createdAt || tx.created_at)}</p>
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
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{fmtDateTime(r.createdAt || r.redeemed_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="promo-code" style={{ fontSize: '0.75rem' }}>{r.promo_code}</span>
                      </div>
                    </div>
                  );
                }
              })}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {managerTimeline.map((item) => {
                const tx = item as TokenTransaction;
                const firstName = tx.receiver?.first_name || tx.receiver?.name || 'Un collaborateur';
                const motif = tx.reason || tx.type || '—';
                const amount = tx.amount;
                const dateStr = fmtDateTime(tx.createdAt || tx.created_at);

                return (
                  <div key={`mtx-${tx.id}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {firstName}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                        Motif : {motif}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                        {dateStr}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="token-badge">+{amount} tokens</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fil d'activité entreprise — temps réel */}
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
                    <span className="feed-avatar" style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src="/icons/token-logo-SF.png" 
                        alt="Token" 
                        style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
                      />
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
