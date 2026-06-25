import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import { VALID_CATEGORIES } from '../constants/categories';
import Layout from '../components/Layout';

function StarDisplay({ rating, max = 5 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`text-sm ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </span>
  );
}

export default function ProviderDirectoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    async function fetchProviders() {
      try {
        const data = await profileService.listProviders(token);
        setAllProviders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, [token]);

  // Client-side category filter on already-fetched data
  const filteredProviders = useMemo(() => {
    if (!selectedCategory) return allProviders;
    return allProviders.filter((p) => p.categories?.includes(selectedCategory));
  }, [allProviders, selectedCategory]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Providers</h1>
        {!loading && !error && (
          <span className="text-xs text-gray-500">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} available
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="categoryFilter" className="block text-xs font-medium text-gray-500 mb-1">
              Filter by category
            </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="text-xs text-indigo-600 hover:underline font-medium pb-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && filteredProviders.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          {allProviders.length === 0
            ? 'No providers have completed their profile yet.'
            : 'No providers match the selected category.'}
        </p>
      )}

      <div className="space-y-3">
        {filteredProviders.map((provider) => (
          <div
            key={provider._id}
            onClick={() => navigate(`/providers/${provider.userId}`)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Name + company */}
                <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{provider.company}</p>

                {/* Category pills */}
                {provider.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {provider.categories.map((cat) => (
                      <span key={cat} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                  {provider.typicalBudgetMin != null && provider.typicalBudgetMax != null && (
                    <span>💰 ${provider.typicalBudgetMin}–${provider.typicalBudgetMax}</span>
                  )}
                  {provider.teamSize != null && (
                    <span>👥 {provider.teamSize} person{provider.teamSize !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Rating + arrow */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {provider.averageRating !== null ? (
                  <div className="flex items-center gap-1">
                    <StarDisplay rating={provider.averageRating} />
                    <span className="text-xs font-medium text-gray-700">{provider.averageRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({provider.reviewCount})</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No reviews yet</span>
                )}
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
