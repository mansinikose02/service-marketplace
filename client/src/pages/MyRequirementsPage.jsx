import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
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

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Requirements</h1>
        <Link
          to="/client/requirements/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Post Requirement
        </Link>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && requirements.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg mb-3">No requirements yet.</p>
          <Link
            to="/client/requirements/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Post your first requirement
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {requirements.map((req) => (
          <div
            key={req._id}
            onClick={() => navigate(`/client/requirements/${req._id}`)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{req.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{req.category}</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  ${req.budgetMin}–${req.budgetMax} · {req.timeline}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {req.bidCount} bid{req.bidCount !== 1 ? 's' : ''}
                </span>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
