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
import type { TokenTransaction, Redemption } from '../types';
import { fmtShort as fmt } from '../utils/date';

type Tab = 'tokens' | 'achats' | 'equipe';

export default function Historique() {
  const { user, company } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'employee' || user?.role === 'employer';
  const [tab, setTab] = useState<Tab>('tokens');
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [teamTx, setTeamTx] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<TokenTransaction[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFeed = useRef(true);

  useEffect(() => {
    if (!user?.id) return;

    const tasks: Promise<unknown>[] = [
      userService.getHistory(user.id).then(setTransactions).catch(() => {}),
    ];

    if (user.role === 'employee') {
      tasks.push(
        marketplaceService.getOrders().then(setRedemptions).catch(() => {}),
      );
    }

    if (user.role === 'employer') {
      tasks.push(
        tokenService.getTransactions({ userId: user.id }).then(setTeamTx).catch(() => {}),
      );
    }

    Promise.all(tasks).finally(() => setLoading(false));
  }, [user?.id, user?.role]);

  const showFeed = user?.role === 'employer' || (user?.role === 'employee' && company?.feedback_enabled === true);

  useEffect(() => {
    if (!user?.id || !showFeed) return;

    const fetchFeed = async () => {
      try {
        const data = await tokenService.getTransactions({ userId: user.id });
        const latest = data.slice(0, 10);
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
  }, [user?.id, showFeed]);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tokens', label: 'Mes tokens' },
    { key: 'achats', label: 'Mes achats' },
    ...(user?.role === 'employer' ? [{ key: 'equipe' as Tab, label: 'Mon équipe' }] : []),
  ];

  return (
    <div>
      <div className={`page-header page-header--centered ${isManager ? 'page-header--manager' : ''}`}>
        <h1>Suivi de vos tokens et de vos échanges</h1>
      </div>

      {/* Tabs */}
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

      {/* Mes tokens */}
      {tab === 'tokens' && (
        <div className="card" style={{ marginTop: 16 }}>
          {transactions.length === 0 ? (
            <p className="empty-state">Aucune transaction de tokens.</p>
          ) : (
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
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mes achats */}
      {tab === 'achats' && (
        <div className="card" style={{ marginTop: 16 }}>
          {redemptions.length === 0 ? (
            <p className="empty-state">Aucun bon d'achat racheté.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code promo</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="promo-code">{r.promo_code}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {fmt(r.redeemed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(tx.created_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fil d'activité entreprise — temps réel, visible pour les employeurs et les employés si activé */}
      {showFeed && (
        <div className="card feed-card" style={{ marginTop: 24 }}>
          <div className="feed-header">
            <span className="feed-title">Activité dans l'entreprise</span>
            <span className="feed-dot" />
          </div>
          {feed.length === 0 ? (
            <p className="empty-state">Aucune activité pour le moment.</p>
          ) : (
            <ul className="feed-list">
              {feed.map((tx) => {
                const name = tx.receiver?.first_name || tx.receiver?.name || 'Un collaborateur';
                const isNew = newIds.has(tx.id);
                return (
                  <li key={tx.id} className={`feed-item${isNew ? ' feed-item--new' : ''}`}>
                    <span className="feed-avatar">{name.charAt(0).toUpperCase()}</span>
                    <span className="feed-text">
                      <strong>{name}</strong> a gagné <span className="token-badge feed-badge">+{tx.amount}</span> tokens !
                    </span>
                    <span className="feed-time">{fmt(tx.created_at)}</span>
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
