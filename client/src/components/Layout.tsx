/**
 * components/Layout.tsx — Application shell that wraps every authenticated page.
 *
 * Renders the desktop top navigation bar (TopNav), a mobile-only sticky header with the
 * PRIM'O brand and the user's token balance, the page content, and the mobile bottom
 * navigation bar (BottomNav). Employers see their company's token balance and an
 * 'Acheter' shortcut; all other roles see their personal token balance.
 */
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
}

/* Pages where the hero fills from the very top — no mobile top-bar, no padding-top */
const HERO_PAGES = ['/pour-toi', '/employer/dashboard'];

export default function Layout({ children }: Props) {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHeroPage = location.pathname === '/login' || HERO_PAGES.includes(location.pathname);
  const isPourToi = location.pathname === '/pour-toi' || location.pathname === '/employer/dashboard';
  const isManagerDesign = user?.role === 'manager' || user?.role === 'employee';

  return (
    <div className="app-layout">
      <TopNav />

      {/* Mobile only — sticky brand bar */}
      <header className="top-bar">
        <Link to="/pour-toi" className="top-bar-brand">PRIM'O</Link>

        {user && (
          <div className="top-bar-right">
            {user.role === 'employer' && (
              <button
                className="top-bar-buy"
                onClick={() => navigate('/abonnement')}
                aria-label="Acheter des tokens"
              >
                + Acheter
              </button>
            )}
            <div className="top-bar-tokens">
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="#F5C518" />
                <circle cx="12" cy="12" r="9" fill="#F5C518" stroke="#E6A800" strokeWidth="1" />
                <text x="12" y="16.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#1A7A1A">P</text>
              </svg>
              <span>{user.role === 'employer' ? (company?.token_balance ?? '…') : (user.token_balance ?? 0)}</span>
            </div>
          </div>
        )}
      </header>

      <main className={`app-main${isHeroPage ? ' app-main--hero' : ''}`}>{children}</main>

      <BottomNav />
    </div>
  );
}
