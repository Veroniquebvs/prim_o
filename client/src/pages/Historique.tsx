import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { marketplaceService } from '../services/marketplace.service';
import { tokenService } from '../services/token.service';
import { managerService } from '../services/manager.service';
import type { TokenTransaction, Redemption, Team } from '../types';
import { fmtShort as fmt } from '../utils/date';
import * as XLSX from 'xlsx';


type Tab = 'tokens' | 'achats' | 'equipe';

export default function Historique() {
  const { user, company } = useAuth();
  const [tab, setTab] = useState<Tab>('tokens');
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [teamTx, setTeamTx] = useState<TokenTransaction[]>([]);
  const [managerTeam, setManagerTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<TokenTransaction[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFeed = useRef(true);

  // States for filtering
  const [filterReceiver, setFilterReceiver] = useState<string>('');
  const [filterSender, setFilterSender] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

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

    if (user.role === 'employer' || user.role === 'manager') {
      const compId = user.company_id || company?.id;
      const fetchPromise = compId
        ? tokenService.getTransactions({ companyId: compId })
        : tokenService.getTransactions({ userId: user.id });
      tasks.push(fetchPromise.then(setTeamTx).catch(() => {}));
    }

    if (user.role === 'manager') {
      tasks.push(
        managerService.getTeam().then(setManagerTeam).catch(() => {})
      );
    }

    Promise.all(tasks).finally(() => setLoading(false));
  }, [user?.id, user?.role, company?.id, user?.company_id]);

  const managerTeamMemberIds = user?.role === 'manager'
    ? (managerTeam?.members ?? []).map((m) => m.user_id)
    : [];

  const baseTeamTx = teamTx.filter((tx) => {
    if (user?.role === 'manager') {
      return tx.receiver_id && managerTeamMemberIds.includes(tx.receiver_id);
    }
    return true;
  });

  // Compute unique receivers and senders from team transactions
  const uniqueReceivers = Array.from(
    new Map(
      baseTeamTx
        .map((tx) => tx.receiver)
        .filter((rec): rec is NonNullable<typeof rec> => !!rec)
        .map((rec) => [rec.id, rec])
    ).values()
  ).sort((a, b) => `${a.first_name || ''} ${a.name || ''}`.localeCompare(`${b.first_name || ''} ${b.name || ''}`));

  const uniqueSenders = Array.from(
    new Map(
      baseTeamTx
        .map((tx) => tx.sender)
        .filter((send): send is NonNullable<typeof send> => !!send)
        .map((send) => [send.id, send])
    ).values()
  ).sort((a, b) => `${a.first_name || ''} ${a.name || ''}`.localeCompare(`${b.first_name || ''} ${b.name || ''}`));

  // Filtered transactions for rendering and export
  const filteredTeamTx = baseTeamTx.filter((tx) => {
    if (filterReceiver && tx.receiver_id !== filterReceiver) {
      return false;
    }
    if (filterSender && tx.sender_id !== filterSender) {
      return false;
    }
    if (filterStartDate) {
      const txDate = new Date(tx.created_at);
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      txDate.setHours(0, 0, 0, 0);
      if (txDate < start) return false;
    }
    if (filterEndDate) {
      const txDate = new Date(tx.created_at);
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (txDate > end) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    const rows = filteredTeamTx.map((tx) => {
      const rec = tx.receiver;
      const roleLabel = rec?.role === 'manager' ? 'Manager' : rec?.role === 'employee' ? 'Collaborateur' : rec?.role || '—';
      const membership = rec?.team_memberships?.[0];
      const managerName = membership?.team?.manager
        ? `${membership.team.manager.first_name} ${membership.team.manager.name}`
        : 'Aucun manager';

      const senderName = tx.sender
        ? `${tx.sender.first_name || ''} ${tx.sender.name || ''}`.trim() || tx.sender.email
        : 'Système';

      if (user?.role === 'manager') {
        return {
          'Prénom & Nom': rec ? `${rec.first_name || ''} ${rec.name || ''}`.trim() : '—',
          'Date d\'entrée': rec?.entry_date ? fmt(rec.entry_date) : '—',
          'Tokens reçus': tx.amount,
          'Distribué par': senderName,
          'Motif': tx.type || '—',
          'Date de réception': fmt(tx.created_at)
        };
      }

      return {
        'Nom': rec?.name || '—',
        'Prénom': rec?.first_name || '—',
        'Rôle': roleLabel,
        'Manager': managerName,
        'Date d\'entrée': rec?.entry_date ? fmt(rec.entry_date) : '—',
        'Tokens reçus': tx.amount,
        'Distribué par': senderName,
        'Motif': tx.type || '—',
        'Date de réception': fmt(tx.created_at)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Allocations");
    
    // Auto-fit column widths
    const maxLengths = Object.keys(rows[0] || {}).map(key => {
      const colMax = Math.max(
        key.length,
        ...rows.map(row => String(row[key as keyof typeof row] || '').length)
      );
      return { wch: colMax + 2 };
    });
    worksheet['!cols'] = maxLengths;

    XLSX.writeFile(workbook, "historique_allocations_equipe.xlsx");
  };

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
    ...(user?.role === 'employer' || user?.role === 'manager' ? [{ key: 'equipe' as Tab, label: 'Mon équipe' }] : []),
  ];

  return (
    <div>
      <div className="page-header page-header--centered">
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
          {user?.role === 'employer' ? (
            <p className="empty-state">Consultez l'onglet <strong>Mon équipe</strong> pour l'historique des allocations.</p>
          ) : transactions.length === 0 ? (
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

      {tab === 'equipe' && (
        <div className="card" style={{ marginTop: 16 }}>
          {user?.role === 'manager' && !managerTeam ? (
            <p className="empty-state">Vous n'avez pas encore d'équipe active.</p>
          ) : baseTeamTx.length === 0 ? (
            <p className="empty-state">Aucune allocation effectuée.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Historique des allocations</h3>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={exportToExcel} 
                  disabled={filteredTeamTx.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>📄</span> Exporter en Excel (.xlsx)
                </button>
              </div>

              {/* Filtres */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Collaborateur</label>
                  <select
                    className="form-select"
                    value={filterReceiver}
                    onChange={(e) => setFilterReceiver(e.target.value)}
                    style={{
                      minHeight: '38px',
                      padding: '6px 12px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">Tous les collaborateurs</option>
                    {uniqueReceivers.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {`${rec.first_name || ''} ${rec.name || ''}`.trim() || rec.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Distributeur</label>
                  <select
                    className="form-select"
                    value={filterSender}
                    onChange={(e) => setFilterSender(e.target.value)}
                    style={{
                      minHeight: '38px',
                      padding: '6px 12px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">Tous les distributeurs</option>
                    {uniqueSenders.map((send) => (
                      <option key={send.id} value={send.id}>
                        {`${send.first_name || ''} ${send.name || ''}`.trim() || send.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Date de début</label>
                  <input
                    type="date"
                    className="form-input"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={{
                      minHeight: '38px',
                      padding: '6px 12px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Date de fin</label>
                  <input
                    type="date"
                    className="form-input"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={{
                      minHeight: '38px',
                      padding: '6px 12px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                {(filterReceiver || filterSender || filterStartDate || filterEndDate) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setFilterReceiver('');
                        setFilterSender('');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        minHeight: '38px',
                        background: 'transparent',
                        border: '1.5px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Réinitialiser
                    </button>
                  </div>
                )}
              </div>

              {filteredTeamTx.length === 0 ? (
                <p className="empty-state" style={{ padding: '32px 0' }}>Aucune allocation ne correspond à vos critères.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {user?.role === 'employer' ? (
                          <>
                            <th>Nom</th>
                            <th>Prénom</th>
                            <th>Rôle</th>
                            <th>Manager</th>
                          </>
                        ) : (
                          <th>Prénom & Nom</th>
                        )}
                        <th>Date d'entrée</th>
                        <th>Tokens reçus</th>
                        <th>Distribué par</th>
                        <th>Motif</th>
                        <th>Date de réception</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeamTx.map((tx) => {
                        const rec = tx.receiver;
                        const roleLabel = rec?.role === 'manager' ? 'Manager' : rec?.role === 'employee' ? 'Collaborateur' : rec?.role || '—';
                        const membership = rec?.team_memberships?.[0];
                        const managerName = membership?.team?.manager
                          ? `${membership.team.manager.first_name} ${membership.team.manager.name}`
                          : 'Aucun manager';
                        
                        const senderName = tx.sender
                          ? `${tx.sender.first_name || ''} ${tx.sender.name || ''}`.trim() || tx.sender.email
                          : 'Système';

                        return (
                          <tr key={tx.id}>
                            {user?.role === 'employer' ? (
                              <>
                                <td style={{ fontWeight: 500 }}>{rec?.name || '—'}</td>
                                <td style={{ fontWeight: 500 }}>{rec?.first_name || '—'}</td>
                                <td style={{ fontSize: '0.82rem' }}>{roleLabel}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{managerName}</td>
                              </>
                            ) : (
                              <td style={{ fontWeight: 500 }}>
                                {rec ? `${rec.first_name || ''} ${rec.name || ''}`.trim() : '—'}
                              </td>
                            )}
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                              {rec?.entry_date ? fmt(rec.entry_date) : '—'}
                            </td>
                            <td>
                              <span className="token-badge">+{tx.amount}</span>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{senderName}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.type || '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              {fmt(tx.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
