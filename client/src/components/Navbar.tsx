import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on route change
  function close() {
    setOpen(false);
  }

  async function handleLogout() {
    close();
    await logout();
    navigate('/login');
  }

  return (
    <header className="navbar" ref={headerRef}>
      <Link to="/" className="navbar-brand" onClick={close}>
        PRIM'O
      </Link>

      {/* Hamburger — mobile only */}
      <button
        className="navbar-hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <span className={`hamburger-bar ${open ? 'hamburger-bar--1-open' : ''}`} />
        <span className={`hamburger-bar ${open ? 'hamburger-bar--2-open' : ''}`} />
        <span className={`hamburger-bar ${open ? 'hamburger-bar--3-open' : ''}`} />
      </button>

      {/* Nav links */}
      <nav className={`navbar-nav${open ? ' navbar-nav--open' : ''}`}>
        {!isAuthenticated && (
          <>
            <Link to="/login" onClick={close}>Connexion</Link>
            <Link to="/register" onClick={close}>S'inscrire</Link>
          </>
        )}

        {user?.role === 'employer' && (
          <Link to="/employer/dashboard" onClick={close}>Dashboard</Link>
        )}
        {user?.role === 'employee' && (
          <>
            <Link to="/catalogue" onClick={close}>Catalogue</Link>
            <Link to="/panier" onClick={close} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Panier
              {cartCount > 0 && (
                <span style={{
                  background: 'var(--primary)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 700,
                  borderRadius: '999px', padding: '1px 5px',
                  lineHeight: 1.4, minWidth: 16, textAlign: 'center',
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin/dashboard" onClick={close}>Administration</Link>
        )}

        {isAuthenticated && (
          <>
            <Link to="/profil" onClick={close}>Profil</Link>
            <Link to="/parametres" onClick={close}>Paramètres</Link>
            <span className="navbar-user">{user?.first_name || user?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Déconnexion
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
