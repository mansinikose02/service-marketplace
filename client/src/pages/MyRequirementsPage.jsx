import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import aiService from '../services/aiService';
import Layout from '../components/Layout';

const STATUS_CLASSES = {
  open:   'bg-blue-100 text-blue-800',
  sealed: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function MyRequirementsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [matchState, setMatchState] = useState({});

  useEffect(() => {
    async function fetchRequirements() {
      try {
        const data = await requirementService.listOwnRequirements(token);
        setRequirements(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRequirements();
  }, [token]);

  async function handleFindMatches(requirementId) {
    setMatchState((prev) => ({ ...prev, [requirementId]: { loading: true, matches: null, error: '' } }));
    try {
      const { matches } = await aiService.matchProviders(requirementId, token);
      setMatchState((prev) => ({ ...prev, [requirementId]: { loading: false, matches, error: '' } }));
    } catch (err) {
      setMatchState((prev) => ({ ...prev, [requirementId]: { loading: false, matches: null, error: err.message } }));
    }
  }

  return (
    <Layout>
      <div className="fade-in">
        {/* Hero section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">My Requirements</h1>
              <p className="text-blue-200 text-sm">Manage your posted requirements and track incoming proposals</p>
            </div>
            <Link
              to="/client/requirements/new"
              className="shrink-0 bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200"
            >
              + Post New
            </Link>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && requirements.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-3">No requirements yet.</p>
            <Link
              to="/client/requirements/new"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200"
            >
              Post your first requirement
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {requirements.map((req) => {
            const cardMatch = matchState[req._id];

            return (
              <div key={req._id}>
                <div
                  onClick={() => navigate(`/client/requirements/${req._id}`)}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{req.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">{req.category}</span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CLASSES[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        ${req.budgetMin}–${req.budgetMax} · {req.timeline}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {req.bidCount} bid{req.bidCount !== 1 ? 's' : ''}
                      </span>
                      {req.status === 'open' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFindMatches(req._id); }}
                          disabled={cardMatch?.loading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 transition-colors"
                        >
                          {cardMatch?.loading ? '✨ Finding…' : '✨ Find Providers'}
                        </button>
                      )}
                      <span className="text-gray-400 text-sm">→</span>
                    </div>
                  </div>
                </div>

                {cardMatch && !cardMatch.loading && (
                  <div className="bg-indigo-50 border border-indigo-200 border-t-0 rounded-b-2xl px-5 py-4">
                    {cardMatch.error && <p className="text-xs text-red-600">{cardMatch.error}</p>}
                    {!cardMatch.error && cardMatch.matches !== null && (
                      <>
                        <p className="text-xs font-semibold text-indigo-800 mb-3">✨ AI-suggested matches</p>
                        {cardMatch.matches.length === 0 ? (
                          <p className="text-xs text-indigo-600">No matching providers found yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {cardMatch.matches.map((match) => (
                              <div key={match.providerId} className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-indigo-900">{match.providerName}</p>
                                  <p className="text-xs text-indigo-700 mt-0.5">{match.reason}</p>
                                </div>
                                <Link
                                  to={`/providers/${match.providerId}`}
                                  className="shrink-0 text-xs text-indigo-600 hover:underline font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Profile →
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
