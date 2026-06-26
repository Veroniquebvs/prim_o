import { useState } from 'react';
import { MOTIFS_ALLOCATION } from '../utils/motifs';

interface Props {
  initialMotif: string;
  onSelect: (motif: string) => void;
  onClose: () => void;
}

export default function MotifSelectionModal({ initialMotif, onSelect, onClose }: Props) {
  const [selectedMotif, setSelectedMotif] = useState<string>(initialMotif);

  return (
    <div className="emp-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div 
        className="emp-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', width: '100%', maxWidth: '500px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="emp-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>Sélectionner un motif</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {MOTIFS_ALLOCATION.map((category) => (
            <div key={category.category}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                {category.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {category.motifs.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMotif(m.label)}
                    style={{ 
                      padding: '12px 16px', 
                      background: selectedMotif === m.label ? 'var(--primary-light)' : 'var(--bg)', 
                      border: selectedMotif === m.label ? '2px solid var(--primary)' : '1px solid var(--border)', 
                      borderRadius: 'var(--radius)', 
                      cursor: 'pointer', 
                      textAlign: 'left', 
                      fontWeight: selectedMotif === m.label ? 600 : 400,
                      lineHeight: '1.4'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => {
              if (selectedMotif) {
                onSelect(selectedMotif);
              }
            }}
            disabled={!selectedMotif}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
