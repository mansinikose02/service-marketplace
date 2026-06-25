import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import bidService from '../services/bidService';
import Layout from '../components/Layout';

const STATUS_CLASSES = {
  pending:  'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-gray-100 text-gray-600',
};

export default function MyBidsPage() {
  const { token } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMyBids() {
      try {
        const data = await bidService.getMyBids(token);
        setBids(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMyBids();
  }, [token]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Proposals</h1>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && bids.length === 0 && (
        <p className="text-center text-gray-500 py-12">No proposals submitted yet.</p>
      )}

      <div className="space-y-3">
        {bids.map((bid) => (
          <div key={bid._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {bid.requirementId?.title ?? '—'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{bid.requirementId?.category ?? ''}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>💰 ${bid.proposedBudget}</span>
                  <span>📅 {bid.proposedTimeline}</span>
                </div>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_CLASSES[bid.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {bid.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
