import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const ACTION_CARDS = [
  {
    emoji: '📋',
    iconBg: 'bg-blue-100',
    title: 'Post a Requirement',
    description: 'Describe what you need and let providers come to you.',
    to: '/client/requirements/new',
    label: 'Post now',
  },
  {
    emoji: '📁',
    iconBg: 'bg-purple-100',
    title: 'My Requirements',
    description: 'View and manage your posted requirements.',
    to: '/client/requirements',
    label: 'View all',
  },
  {
    emoji: '🤝',
    iconBg: 'bg-green-100',
    title: 'My Deals',
    description: 'Track active and completed deals.',
    to: '/client/deals',
    label: 'View deals',
  },
  {
    emoji: '🏢',
    iconBg: 'bg-orange-100',
    title: 'Browse Providers',
    description: 'Find providers and view their profiles and reviews before posting.',
    to: '/client/providers',
    label: 'Browse providers',
  },
];

export default function ClientDashboard() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="fade-in">
        {/* Gradient welcome card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back,</p>
          <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
          <p className="text-indigo-200 mt-1 text-sm">{user?.company}</p>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTION_CARDS.map((card) => (
            <div
              key={card.to}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 text-2xl`}>
                {card.emoji}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 flex-1 mb-4">{card.description}</p>
              <Link
                to={card.to}
                className="inline-block text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                {card.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
