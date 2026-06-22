/**
 * components/Layout.tsx — Application shell that wraps every authenticated page.
 *
 * Renders the desktop top navigation bar (TopNav), a mobile-only sticky header with the
 * PRIM'O brand and the user's token balance, the page content, and the mobile bottom
 * navigation bar (BottomNav). Employers see their company's token balance and an
 * 'Acheter' shortcut; all other roles see their personal token balance.
 */
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
}

/* Pages where the hero fills from the very top — no mobile top-bar, no padding-top */
const HERO_PAGES = ['/pour-toi', '/employer/dashboard'];

const NO_SWIPE_PAGES = ['/catalogue', '/pour-toi', '/employer/dashboard', '/historique', '/cart'];

export default function Layout({ children }: Props) {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHeroPage = location.pathname === '/login' || HERO_PAGES.includes(location.pathname);
  const isPourToi = location.pathname === '/pour-toi' || location.pathname === '/employer/dashboard';
  const isManagerDesign = user?.role === 'manager' || user?.role === 'employee';

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;
    
    if (distance > 75) {
      if (!NO_SWIPE_PAGES.includes(location.pathname)) {
        navigate(-1);
      }
    }
    setTouchStart(null);
  };

  return (
    <div className="app-layout" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <TopNav />

      {/* Mobile only — sticky brand bar (hidden on hero pages) */}
      {!isHeroPage && (
        <header className={`top-bar ${isPourToi ? 'top-bar--manager' : ''} ${!isPourToi ? 'no-shadow' : ''}`}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 2, flex: 1, visibility: isPourToi ? 'hidden' : 'visible' }}>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2.8rem', color: 'var(--text)', letterSpacing: '0.5px' }}>prim'</span>
            <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '4rem', color: 'var(--primary)', lineHeight: 1 }}>o</span>
          </span>

          {user && (
            <div className="top-bar-right">
              <div className="top-bar-tokens top-bar-tokens--large">
                <img src="/icons/token-logo-SF.png" alt="Token" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span>{user.role === 'employer' ? (company?.token_balance ?? '…') : (user.token_balance ?? 0)}</span>
              </div>
            </div>
          )}
        </header>
      )}

      <main className={`app-main${isHeroPage ? ' app-main--hero' : ''}`}>{children}</main>

      <BottomNav />
    </div>
  );
}
