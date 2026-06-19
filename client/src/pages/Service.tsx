import { useNavigate, useLocation } from 'react-router-dom';

function IconFAQ() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconContact() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.13 1 .38 1.97.72 2.9a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.18-1.18a2 2 0 012.11-.45c.93.34 1.9.59 2.9.72A2 2 0 0122 14.92v2z" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function Service() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  function goFaq(anchor?: string) {
    navigate('/faq', { state: { from: location.pathname, anchor } });
  }

  return (
    <div>
      <div className="page-header page-header--clean">
        <div>
          <h1>Aide</h1>
          <p>Besoin d'assistance ?</p>
        </div>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 20, lineHeight: 1.65, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Une question ? Notre FAQ recense les questions fréquentes. Peut-être y trouveras-tu une réponse ?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="aide-card-btn" onClick={() => goFaq()}>
            <span className="aide-card-icon"><IconFAQ /></span>
            <span className="aide-card-label">FAQ</span>
            <IconChevron />
          </button>

          <button className="aide-card-btn" onClick={() => goFaq('contact')}>
            <span className="aide-card-icon"><IconContact /></span>
            <span className="aide-card-label">Nous contacter</span>
            <IconChevron />
          </button>
        </div>
      </div>
    </div>
  );
}
