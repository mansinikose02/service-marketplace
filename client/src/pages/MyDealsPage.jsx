import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dealService from '../services/dealService';
import Layout from '../components/Layout';

const STATUS_CLASSES = {
  active:    'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

export default function MyDealsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMyDeals() {
      try {
        const data = await dealService.getMyDeals(token);
        setDeals(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMyDeals();
  }, [token]);

  const dealPath = (dealId) =>
    user?.role === 'client' ? `/client/deals/${dealId}` : `/provider/deals/${dealId}`;

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Deals</h1>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && deals.length === 0 && (
        <p className="text-center text-gray-500 py-12">No deals yet.</p>
      )}

      <div className="space-y-3">
        {deals.map((deal) => (
          <div
            key={deal._id}
            onClick={() => navigate(dealPath(deal._id))}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{deal.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user?.role === 'client' ? `Provider: ${deal.providerName}` : `Client: ${deal.clientName}`}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>💰 ${deal.agreedBudget}</span>
                  <span>📅 {deal.agreedTimeline}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[deal.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {deal.status}
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
