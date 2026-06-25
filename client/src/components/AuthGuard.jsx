import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AuthGuard has two modes:
 *
 * Mode A (requiredRole provided): protects dashboard routes.
 *   - Unauthenticated users → /login
 *   - Wrong-role users → their own dashboard
 *   - Correct-role users → render the route
 *
 * Mode B (no requiredRole): guards public routes like /login and /register.
 *   - Authenticated users → their own dashboard (prevents re-login)
 *   - Unauthenticated users → render the route
 */
export default function AuthGuard({ requiredRole }) {
  const { user, isLoading } = useAuth();

  // Defer rendering until localStorage rehydration completes to avoid flash redirects
  if (isLoading) return null;

  if (requiredRole) {
    // Mode A — protected route
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (user.role !== requiredRole) {
      return <Navigate to={`/${user.role}/dashboard`} replace />;
    }
    return <Outlet />;
  }

  // Mode B — public route
  if (user) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return <Outlet />;
}
