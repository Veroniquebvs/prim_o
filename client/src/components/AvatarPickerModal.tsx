import { AVATAR_COUNT } from '../utils/avatar';

export default function AvatarPickerModal({ current, onSelect, onClose }: {
  current: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '16px 24px 40px', width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 999, margin: '0 auto 20px' }} />
        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 24, textAlign: 'center' }}>Choisir un avatar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((index) => (
            <button
              key={index}
              onClick={() => onSelect(index)}
              style={{
                border: current === index ? '3px solid var(--primary)' : '3px solid transparent',
                borderRadius: 12,
                padding: 3,
                background: current === index ? 'rgba(0,161,154,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                transform: current === index ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              <img
                src={`/assets/av_${index}.png`}
                alt={`Avatar ${index}`}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', display: 'block' }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
