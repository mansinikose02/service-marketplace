import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  client: 'bg-blue-100 text-blue-700',
  provider: 'bg-indigo-100 text-indigo-700',
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const dashboardPath = user ? `/${user.role}/dashboard` : '/login';

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link
          to={dashboardPath}
          className="text-lg font-bold text-indigo-600 tracking-tight hover:text-indigo-700 transition-colors"
        >
          Dealtable
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">{user.name}</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
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
