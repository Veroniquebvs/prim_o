/**
 * pages/HomePage.tsx — Public landing page for unauthenticated visitors.
 *
 * If the session is still loading, renders nothing (avoids flash-of-wrong-page).
 * If already authenticated, redirects immediately to the role-appropriate dashboard:
 * employer → /employer/dashboard, admin → /admin/dashboard, others → /catalogue.
 * For unauthenticated visitors, renders the marketing hero with login and register CTAs.
 */
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated && user) {
    if (user.role === 'employer') return <Navigate to="/employer/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/pour-toi" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e6f7f7 0%, #ffffff 60%)',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2, marginBottom: 20 }}>
          <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '3.2rem', color: 'var(--text)', letterSpacing: '0.5px' }}>prim'</span>
          <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '4.5rem', color: 'var(--primary)', lineHeight: 1 }}>o</span>
        </div>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            color: '#000000',
            marginBottom: 16,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}
        >
          La reconnaissance méritocratique
          <br />
          en temps réel
        </h1>

        <p
          style={{
            color: '#6b7280',
            fontSize: '1rem',
            lineHeight: 1.75,
            marginBottom: 44,
            maxWidth: 480,
            margin: '0 auto 44px',
          }}
        >
          Récompensez instantanément vos collaborateurs dès qu'une performance est
          observée. Ils échangent leurs tokens contre des bons d'achat dans la
          marketplace.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login">
            <button
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontSize: '0.95rem' }}
            >
              Se connecter
            </button>
          </Link>
          <Link to="/register">
            <button
              className="btn btn-outline"
              style={{ padding: '12px 32px', fontSize: '0.95rem' }}
            >
              Créer un compte
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
