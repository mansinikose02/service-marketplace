import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  client:   'bg-blue-100 text-blue-700',
  provider: 'bg-indigo-100 text-indigo-700',
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const dashboardPath = user ? `/${user.role}/dashboard` : '/login';

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to={dashboardPath}
          className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity tracking-tight"
        >
          Dealtable
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">{user.name}</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
              {user.role}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
