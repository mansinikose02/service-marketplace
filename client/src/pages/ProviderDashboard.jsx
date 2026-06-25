import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const ACTION_CARDS = [
  {
    emoji: '🔍',
    title: 'Browse Requirements',
    description: 'Find open requirements and submit proposals.',
    to: '/provider/requirements',
    label: 'Browse',
  },
  {
    emoji: '👤',
    title: 'My Profile',
    description: 'Keep your pitch and service categories up to date.',
    to: '/provider/profile',
    label: 'Edit profile',
  },
  {
    emoji: '📨',
    title: 'My Bids',
    description: 'Track the status of your submitted proposals.',
    to: '/provider/bids',
    label: 'View bids',
  },
  {
    emoji: '🤝',
    title: 'My Deals',
    description: 'Manage active and completed deals.',
    to: '/provider/deals',
    label: 'View deals',
  },
];

export default function ProviderDashboard() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <p className="text-sm text-gray-500">Welcome back,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.company}</p>
        {user?.id && (
          <div className="mt-3">
            <Link
              to={`/providers/${user.id}`}
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              View my public profile →
            </Link>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ACTION_CARDS.map((card) => (
          <div key={card.to} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
            <span className="text-2xl mb-3">{card.emoji}</span>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-xs text-gray-500 flex-1 mb-4">{card.description}</p>
            <Link
              to={card.to}
              className="inline-block text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {card.label}
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  );
}
