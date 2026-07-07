import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import reviewService from '../services/reviewService';
import Layout from '../components/Layout';

function StarDisplay({ rating, max = 5 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`text-lg ${i < rating ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
      ))}
    </span>
  );
}

export default function PublicProviderProfilePage() {
  const { providerId } = useParams();
  const { token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await profileService.getPublicProfile(providerId, token);
        setProfile(data);
      } catch (err) {
        setProfileError(err.message);
      } finally {
        setProfileLoading(false);
      }
    }
    async function fetchReviews() {
      try {
        const { reviews: fetchedReviews, averageRating: avg } =
          await reviewService.getProviderReviews(providerId, token);
        setReviews(fetchedReviews);
        setAverageRating(avg);
      } catch (err) {
        setReviewsError(err.message);
      }
    }
    fetchProfile();
    fetchReviews();
  }, [providerId, token]);

  if (profileLoading) return <Layout><p className="text-gray-500">Loading…</p></Layout>;
  if (profileError) return <Layout><p className="text-sm text-red-600">{profileError}</p></Layout>;
  if (!profile) return null;

  return (
    <Layout>
      <div className="fade-in">
        {/* Gradient header card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.name ?? 'Provider'}</h1>
              <p className="text-indigo-200 mt-0.5 text-sm">{profile.company ?? ''}</p>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-white ${profile.pitchComplete ? 'text-green-600' : 'text-yellow-600'}`}>
              {profile.pitchComplete ? '✓ Complete' : '⚠ Incomplete'}
            </span>
          </div>

          {/* Category pills with glass effect */}
          {profile.categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.categories.map((cat) => (
                <span key={cat} className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Key stats grid on white/translucent tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {profile.capacity != null && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs text-indigo-200 mb-0.5">Capacity</p>
                <p className="text-sm font-semibold text-white">{profile.capacity} project{profile.capacity !== 1 ? 's' : ''}</p>
              </div>
            )}
            {profile.teamSize != null && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs text-indigo-200 mb-0.5">Team Size</p>
                <p className="text-sm font-semibold text-white">{profile.teamSize} person{profile.teamSize !== 1 ? 's' : ''}</p>
              </div>
            )}
            {profile.typicalBudgetMin != null && profile.typicalBudgetMax != null && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs text-indigo-200 mb-0.5">Typical Budget</p>
                <p className="text-sm font-semibold text-white">${profile.typicalBudgetMin}–${profile.typicalBudgetMax}</p>
              </div>
            )}
            {profile.websiteUrl && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs text-indigo-200 mb-0.5">Website</p>
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white hover:text-indigo-100 underline truncate block"
                >
                  {profile.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Pitch card */}
        {profile.pitch && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.pitch}</p>
          </div>
        )}

        {/* Reviews section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Reviews</h2>
            {averageRating !== null && (
              <div className="flex items-center gap-2">
                <StarDisplay rating={Math.round(averageRating)} />
                <span className="text-sm font-semibold text-gray-700">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>

          {reviewsError && <p className="text-sm text-red-600 mb-3">{reviewsError}</p>}

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{review.clientName}</p>
                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <StarDisplay rating={review.rating} />
                  <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
