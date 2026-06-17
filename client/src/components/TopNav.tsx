import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';


export default function TopNav() {
  const { user, company, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";
  const onPanier = location.pathname === '/panier';

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

  const tokenBalance = user?.role === 'employer'
    ? (company?.token_balance ?? '…')
    : (user?.token_balance ?? 0);

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        {/* Brand */}
        <Link to="/pour-toi" className="top-nav-brand">PRIM'O</Link>

        {/* Nav links + Voir plus (à gauche) */}
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
                to={user?.role === "employer" ? "/employer/dashboard" : "/pour-toi"}
                className={({ isActive }) => link(isActive)}
              >
                Pour toi
              </NavLink>
              <NavLink to="/catalogue"   className={({ isActive }) => link(isActive)}>Catalogue</NavLink>
              <NavLink to="/historique"  className={({ isActive }) => link(isActive)}>Historique</NavLink>
              <NavLink to="/panier"      className={({ isActive }) => link(isActive)}>
                Panier
                {count > 0 && <span className="top-nav-badge">{count}</span>}
              </NavLink>
            </>
          )}

          {/* Voir plus — déplacé ici à gauche */}
          <div className="top-nav-more-wrap" ref={dropRef}>
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
                  { label: 'Paramètres',                    path: '/parametres'       },
                  { label: 'Mes informations personnelles', path: '/mes-informations' },
                  { label: 'Changer mon mot de passe',      path: '/mot-de-passe'     },
                  { label: 'Aide',                          path: '/service'           },
                  { label: 'Voir les CGU',                  path: '/cgu'              },
                  { label: 'Nous noter',                    path: '/avis'             },
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
            )}
          </div>
        </nav>

        {/* Droite : balance tokens + Valider le panier */}
        {user && (
          <div className="top-nav-right">
            {user?.role === 'employer' && (
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
              <span>{tokenBalance}</span>
            </div>
            {onPanier && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 16px', borderRadius: 8 }}
                onClick={() => window.dispatchEvent(new CustomEvent('panier:validate'))}
              >
                Valider le panier
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
