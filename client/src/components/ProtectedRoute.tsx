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
