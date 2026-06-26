import type { Company } from '../types';

interface Props {
  companies: Company[];
  onSelect: (id: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CompanySelectionModal({ companies, onSelect, onClose, title = "Sélectionner une entreprise" }: Props) {
  // Sort alphabetically by name
  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="emp-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="emp-modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {sortedCompanies.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>Aucune entreprise trouvée.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedCompanies.map((c) => {
                const addr = [c.street, c.zip_code, c.city].filter(Boolean).join(', ');
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{c.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{addr || '—'}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span className="token-badge">{c.token_balance}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>tokens</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
