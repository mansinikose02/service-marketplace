import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProviderDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            Log out
          </button>
        </div>
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.name}</span>. You are logged in as a{' '}
          <span className="font-medium">{user?.role}</span>.
        </p>
        <nav style={{ marginTop: '1.5rem' }}>
          <Link to="/provider/profile">My Profile</Link>
          {' · '}
          <Link to="/provider/requirements">Browse Requirements</Link>
          {' · '}
          <Link to="/provider/bids">My Bids</Link>
          {' · '}
          <Link to="/provider/deals">My Deals</Link>
        </nav>
      </div>
    </div>
  );
}
