import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import { VALID_CATEGORIES } from '../constants/categories';
import Layout from '../components/Layout';

export default function BrowseRequirementsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [allRequirements, setAllRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state — all client-side, no extra API calls
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  useEffect(() => {
    async function fetchOpenRequirements() {
      try {
        const data = await requirementService.listOpenRequirements(token);
        setAllRequirements(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOpenRequirements();
  }, [token]);

  // Apply all three filters with AND logic
  const filteredRequirements = useMemo(() => {
    const lowerSearch = searchText.toLowerCase().trim();
    const maxBudgetNum = maxBudget !== '' ? Number(maxBudget) : null;

    return allRequirements.filter((req) => {
      if (selectedCategory && req.category !== selectedCategory) return false;
      if (maxBudgetNum !== null && req.budgetMin > maxBudgetNum) return false;
      if (lowerSearch && !req.title.toLowerCase().includes(lowerSearch) && !req.description?.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [allRequirements, searchText, selectedCategory, maxBudget]);

  function clearFilters() {
    setSearchText('');
    setSelectedCategory('');
    setMaxBudget('');
  }

  const isFiltered = searchText !== '' || selectedCategory !== '' || maxBudget !== '';

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Browse Open Requirements</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="searchText" className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              id="searchText"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Title or description…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="categoryFilter" className="block text-xs font-medium text-gray-500 mb-1">Category</label>
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

          <div>
            <label htmlFor="maxBudget" className="block text-xs font-medium text-gray-500 mb-1">Max Budget ($)</label>
            <input
              id="maxBudget"
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isFiltered && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <p className="text-xs text-gray-500 mb-3">
          Showing {filteredRequirements.length} of {allRequirements.length} requirement{allRequirements.length !== 1 ? 's' : ''}
        </p>
      )}

      {!loading && !error && filteredRequirements.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          {allRequirements.length === 0 ? 'No open requirements at the moment.' : 'No requirements match your filters.'}
        </p>
      )}

      <div className="space-y-3">
        {filteredRequirements.map((req) => (
          <div
            key={req._id}
            onClick={() => navigate(`/provider/requirements/${req._id}`)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {req.category}
                </span>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>💰 ${req.budgetMin}–${req.budgetMax}</span>
                  <span>📅 {req.timeline}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">{req.clientCompany ?? '—'}</p>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
