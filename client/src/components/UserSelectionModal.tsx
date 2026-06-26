import { useState } from 'react';
import type { User } from '../types';

interface Props {
  users: User[];
  onSelect: (id: string) => void;
  onClose: () => void;
  allowAllOption?: boolean;
  allOptionText?: string;
  title?: string;
}

export default function UserSelectionModal({ users, onSelect, onClose, allowAllOption, allOptionText = "Tous", title = "Sélectionner un bénéficiaire" }: Props) {
  const [activeTab, setActiveTab] = useState<'employees' | 'managers'>('employees');

  // Sort by last name (name)
  const managers = users.filter(u => u.role === 'manager').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const employees = users.filter(u => u.role === 'employee').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const showTabs = managers.length > 0 && employees.length > 0;

  // Si on est sur l'onglet manager mais qu'il n'y a pas de manager, on force sur employee (et vice versa)
  const safeActiveTab = showTabs ? activeTab : (employees.length > 0 ? 'employees' : 'managers');
  const currentList = safeActiveTab === 'managers' ? managers : employees;

  return (
    <div className="emp-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="emp-modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {allowAllOption && (
          <button
            onClick={() => onSelect("")}
            style={{ padding: '12px 16px', marginBottom: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}
          >
            {allOptionText}
          </button>
        )}

        {showTabs && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setActiveTab('employees')}
              style={{ flex: 1, padding: "8px", background: safeActiveTab === 'employees' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: safeActiveTab === 'employees' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", fontWeight: safeActiveTab === 'employees' ? 600 : 400, color: safeActiveTab === 'employees' ? "var(--primary)" : "inherit" }}
            >
              Collaborateurs ({employees.length})
            </button>
            <button
              onClick={() => setActiveTab('managers')}
              style={{ flex: 1, padding: "8px", background: safeActiveTab === 'managers' ? "var(--primary-light, rgba(16, 185, 129, 0.1))" : "var(--bg)", borderRadius: "var(--radius)", textAlign: "center", border: safeActiveTab === 'managers' ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", fontWeight: safeActiveTab === 'managers' ? 600 : 400, color: safeActiveTab === 'managers' ? "var(--primary)" : "inherit" }}
            >
              Managers ({managers.length})
            </button>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {currentList.length === 0 ? (
            <p className="empty-state">Aucun résultat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentList.map(u => (
                <button
                  key={u.id}
                  onClick={() => onSelect(u.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 500 }}>{u.name} {u.first_name}</span>
                  <span className="token-badge">{u.token_balance}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
