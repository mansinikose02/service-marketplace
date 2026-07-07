import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import reviewService from '../services/reviewService';
import Layout from '../components/Layout';

const ACTION_CARDS = [
  {
    emoji: '🔍',
    iconBg: 'bg-blue-100',
    title: 'Browse Requirements',
    description: 'Find open requirements and submit proposals.',
    to: '/provider/requirements',
    label: 'Browse',
  },
  {
    emoji: '👤',
    iconBg: 'bg-purple-100',
    title: 'My Profile',
    description: 'Keep your pitch and service categories up to date.',
    to: '/provider/profile',
    label: 'Edit profile',
  },
  {
    emoji: '📨',
    iconBg: 'bg-yellow-100',
    title: 'My Bids',
    description: 'Track the status of your submitted proposals.',
    to: '/provider/bids',
    label: 'View bids',
  },
  {
    emoji: '🤝',
    iconBg: 'bg-green-100',
    title: 'My Deals',
    description: 'Manage active and completed deals.',
    to: '/provider/deals',
    label: 'View deals',
  },
];

export default function ProviderDashboard() {
  const { user, token } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchReviews() {
      try {
        const { reviews: fetchedReviews, averageRating: avg } =
          await reviewService.getProviderReviews(user.id, token);
        setReviews(fetchedReviews);
        setAverageRating(avg);
      } catch {
        // Silently ignore — section shows empty state
      }
    }
    fetchReviews();
  }, [user?.id, token]);

  return (
    <Layout>
      <div className="fade-in">
        {/* Gradient welcome card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back,</p>
          <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
          <p className="text-indigo-200 mt-1 text-sm">{user?.company}</p>
          {user?.id && (
            <div className="mt-4">
              <Link
                to={`/providers/${user.id}`}
                className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white font-medium underline underline-offset-2 transition-colors"
              >
                View my public profile →
              </Link>
            </div>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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

        {/* My Reviews section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">My Reviews</h2>

          {averageRating === null ? (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 text-center text-gray-500 text-sm">
              No reviews yet. Complete a deal to receive your first review.
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
              {/* Average rating summary */}
              <div className="flex items-center gap-2 mb-5">
                <span className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`text-lg ${i < Math.round(averageRating) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                  ))}
                </span>
                <span className="text-sm font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">· {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              </div>

              {/* 3 most recent reviews */}
              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review._id} className="bg-white/70 backdrop-blur-sm border border-amber-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{review.clientName}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      {review.comment.length > 100 ? `${review.comment.slice(0, 100)}…` : review.comment}
                    </p>
                  </div>
                ))}
              </div>

              {reviews.length > 3 && user?.id && (
                <div className="mt-4 text-right">
                  <Link to={`/providers/${user.id}`} className="text-sm text-indigo-600 hover:underline font-medium">
                    View all on my public profile →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
