import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';


export default function TopNav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    function close(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleLogout() {
    setDropOpen(false);
    await logout();
    navigate("/login");
  }

  function link(isActive: boolean) {
    return `top-nav-link${isActive ? " top-nav-link--active" : ""}`;
  }

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        {/* Brand */}
        <span className="top-nav-brand">PRIM'O</span>

        {/* 1. Les liens (Gauche) */}
        <nav className="top-nav-links">
          {isAdmin ? (
            <>
              <NavLink to="/admin/stats"     className={({ isActive }) => link(isActive)}>Tableau de bord</NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => link(isActive)}>Entreprises</NavLink>
              <NavLink to="/admin/bons"      className={({ isActive }) => link(isActive)}>Bons d'achat</NavLink>
              <NavLink to="/catalogue"       className={({ isActive }) => link(isActive)}>Catalogue</NavLink>
            </>
          ) : (
            <>
              <NavLink
                to={
                  user?.role === "employer"
                    ? "/employer/dashboard"
                    : "/pour-toi"
                }
                className={({ isActive }) => link(isActive)}
              >
                Pour toi
              </NavLink>
              <NavLink
                to="/catalogue"
                className={({ isActive }) => link(isActive)}
              >
                Catalogue
              </NavLink>
              <NavLink
                to="/historique"
                className={({ isActive }) => link(isActive)}
              >
                Historique
              </NavLink>
              <NavLink
                to="/panier"
                className={({ isActive }) => link(isActive)}
              >
              <NavLink to={user?.role === 'employer' ? '/employer/dashboard' : '/pour-toi'} className={({ isActive }) => link(isActive)}>Pour toi</NavLink>
              <NavLink to="/catalogue"  className={({ isActive }) => link(isActive)}>Catalogue</NavLink>
              <NavLink to="/historique" className={({ isActive }) => link(isActive)}>Historique</NavLink>
              <NavLink to="/panier"     className={({ isActive }) => link(isActive)}>
                Panier
                {count > 0 && <span className="top-nav-badge">{count}</span>}
              </NavLink>
            </>
          )}

        {/* User menu */}
        <div className="top-nav-user" ref={dropRef}>
          <button
            className="top-nav-more-btn"
            onClick={() => setDropOpen((v) => !v)}
            aria-label="Voir plus"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
              <circle cx="5"  cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            Voir plus
          </button>

          {dropOpen && (
            <div className="top-nav-dropdown">
              <div className="top-nav-drop-user">
                <p className="top-nav-drop-name">{user?.first_name || user?.name}</p>
                <p className="top-nav-drop-email">{user?.email}</p>
                <span className="menu-sheet-role">{user?.role}</span>
              </div>
              <div className="top-nav-drop-divider" />
              {[
                { label: 'Paramètres',                    path: '/parametres'    },
                { label: 'Mes informations personnelles', path: '/mes-informations' },
                { label: 'Changer mon mot de passe',      path: '/mot-de-passe'  },
                { label: 'Aide',                          path: '/service'       },
                { label: 'Voir les CGU',                  path: '/cgu'           },
                { label: 'Nous noter',                    path: '/avis'          },
              ].map((item) => (
                <button
                  key={item.path}
                  className="top-nav-drop-item top-nav-drop-item--chevron"
                  onClick={() => { setDropOpen(false); navigate(item.path, { state: { from: location.pathname } }); }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span className="top-nav-drop-chevron">›</span>
                </button>
              ))}
              <div className="top-nav-drop-divider" />
              <button className="top-nav-drop-item top-nav-drop-item--danger" onClick={handleLogout}>
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
