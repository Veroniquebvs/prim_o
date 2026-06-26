import { useState } from 'react';
import type { User, Team } from '../types';

interface Props {
  users: User[]; // Managers + Employees
  teams: Team[];
  initialTargetType: string;
  initialTargetTeamId: string | null;
  initialReceiverId: string | null;
  initialExcludedIds: string[];
  onSelect: (payload: {
    target_type: 'user' | 'all_company' | 'all_employees' | 'all_managers' | 'team' | 'team_and_manager';
    receiver_id: string | null;
    target_team_id: string | null;
    excluded_user_ids: string[];
  }) => void;
  onClose: () => void;
}

export default function TargetSelectionModal({ 
  users, 
  teams, 
  initialTargetType, 
  initialTargetTeamId, 
  initialReceiverId,
  initialExcludedIds,
  onSelect, 
  onClose 
}: Props) {
  const [targetType, setTargetType] = useState<string>(initialTargetType || 'all_company');
  const [receiverId, setReceiverId] = useState<string | null>(initialReceiverId || null);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(initialTargetTeamId || null);
  const [excludedIds, setExcludedIds] = useState<string[]>(initialExcludedIds || []);
  
  const [activeTab, setActiveTab] = useState<'groups' | 'individuals'>('groups');
  const managers = users.filter(u => u.role === 'manager').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const employees = users.filter(u => u.role === 'employee').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleConfirm = () => {
    onSelect({
      target_type: targetType as any,
      receiver_id: targetType === 'user' ? receiverId : null,
      target_team_id: (targetType === 'team' || targetType === 'team_and_manager') ? targetTeamId : null,
      excluded_user_ids: [],
    });
  };

  return (
    <div className="emp-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', minWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="emp-modal-title" style={{ margin: 0 }}>Sélectionner les bénéficiaires</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                style={{ flex: 1, padding: "8px", background: activeTab === 'groups' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: activeTab === 'groups' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", fontWeight: activeTab === 'groups' ? 600 : 400, color: activeTab === 'groups' ? "var(--primary)" : "inherit" }}
              >
                Groupes et Équipes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('individuals')}
                style={{ flex: 1, padding: "8px", background: activeTab === 'individuals' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: activeTab === 'individuals' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", fontWeight: activeTab === 'individuals' ? 600 : 400, color: activeTab === 'individuals' ? "var(--primary)" : "inherit" }}
              >
                Personne spécifique
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeTab === 'groups' ? (
                <>
                  <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Général</div>
                  
                  <button
                    type="button"
                    onClick={() => setTargetType('all_company')}
                    style={{ padding: '12px 16px', background: targetType === 'all_company' ? 'var(--primary-light)' : 'var(--bg)', border: targetType === 'all_company' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', fontWeight: targetType === 'all_company' ? 600 : 400 }}
                  >
                    Toute la boîte
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('all_employees')}
                    style={{ padding: '12px 16px', background: targetType === 'all_employees' ? 'var(--primary-light)' : 'var(--bg)', border: targetType === 'all_employees' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', fontWeight: targetType === 'all_employees' ? 600 : 400 }}
                  >
                    Tous les collaborateurs
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('all_managers')}
                    style={{ padding: '12px 16px', background: targetType === 'all_managers' ? 'var(--primary-light)' : 'var(--bg)', border: targetType === 'all_managers' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', fontWeight: targetType === 'all_managers' ? 600 : 400 }}
                  >
                    Tous les managers
                  </button>

                  {teams.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Équipes</div>
                      {teams.map(team => (
                        <div key={team.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', background: (targetType === 'team' || targetType === 'team_and_manager') && targetTeamId === team.id ? 'var(--primary-light)' : 'var(--bg)', border: (targetType === 'team' || targetType === 'team_and_manager') && targetTeamId === team.id ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left' }} onClick={() => {
                          setTargetTeamId(team.id);
                          if (targetType !== 'team' && targetType !== 'team_and_manager') {
                            setTargetType('team');
                          }
                        }}>
                          <span style={{ fontWeight: (targetType === 'team' || targetType === 'team_and_manager') && targetTeamId === team.id ? 600 : 500 }}>Équipe : {team.name}</span>
                          
                          {(targetType === 'team' || targetType === 'team_and_manager') && targetTeamId === team.id && (
                            <label style={{ display: 'flex', alignItems: 'center', marginTop: 12, cursor: 'pointer', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={targetType === 'team_and_manager'} 
                                onChange={(e) => setTargetType(e.target.checked ? 'team_and_manager' : 'team')}
                                style={{ marginRight: 8, accentColor: 'var(--primary)' }}
                              />
                              Inclure le manager de l'équipe
                            </label>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {managers.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Managers</div>
                      {managers.map(u => (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => { setTargetType('user'); setReceiverId(u.id); }}
                          style={{ padding: '12px 16px', background: targetType === 'user' && receiverId === u.id ? 'var(--primary-light)' : 'var(--bg)', border: targetType === 'user' && receiverId === u.id ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', fontWeight: targetType === 'user' && receiverId === u.id ? 600 : 400 }}
                        >
                          {u.name} {u.first_name}
                        </button>
                      ))}
                    </>
                  )}
                  {employees.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Collaborateurs</div>
                      {employees.map(u => (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => { setTargetType('user'); setReceiverId(u.id); }}
                          style={{ padding: '12px 16px', background: targetType === 'user' && receiverId === u.id ? 'var(--primary-light)' : 'var(--bg)', border: targetType === 'user' && receiverId === u.id ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', fontWeight: targetType === 'user' && receiverId === u.id ? 600 : 400 }}
                        >
                          {u.name} {u.first_name}
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button"
              onClick={onClose}
              style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 500 }}
            >
              Annuler
            </button>
            <button 
              type="button"
              onClick={handleConfirm}
              style={{ padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}
              disabled={targetType === 'user' && !receiverId}
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
