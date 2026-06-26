/**
 * components/ProtectedRoute.tsx — Route guard that enforces authentication and optional role restrictions.
 *
 * Shows a splash screen while the session is loading. Redirects to /login if the user is not
 * authenticated. If allowedRoles is provided and the user's role is not in that list, redirects
 * to / (which HomeRedirect will then route to the appropriate page for that role).
 *
 * Used in App.tsx to wrap every non-public route.
 */
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import SplashScreen from './SplashScreen';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading || (!isAuthenticated && localStorage.getItem('accessToken'))) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
