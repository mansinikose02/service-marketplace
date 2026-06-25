import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const ACTION_CARDS = [
  {
    emoji: '📋',
    title: 'Post a Requirement',
    description: 'Describe what you need and let providers come to you.',
    to: '/client/requirements/new',
    label: 'Post now',
  },
  {
    emoji: '📁',
    title: 'My Requirements',
    description: 'View and manage your posted requirements.',
    to: '/client/requirements',
    label: 'View all',
  },
  {
    emoji: '🤝',
    title: 'My Deals',
    description: 'Track active and completed deals.',
    to: '/client/deals',
    label: 'View deals',
  },
];

export default function ClientDashboard() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <p className="text-sm text-gray-500">Welcome back,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.company}</p>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
