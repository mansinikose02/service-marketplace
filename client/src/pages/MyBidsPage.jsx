import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import bidService from '../services/bidService';

const STATUS_COLORS = {
  pending:  { background: '#dbeafe', color: '#1e40af' },
  accepted: { background: '#d1fae5', color: '#065f46' },
  declined: { background: '#fee2e2', color: '#991b1b' },
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

  if (loading) return <p>Loading your bids...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>My Proposals</h1>

      {bids.length === 0 ? (
        <p>You have not submitted any proposals yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Requirement</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Proposed Budget</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Timeline</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => (
              <tr key={bid._id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  {bid.requirementId?.title ?? '—'}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  {bid.requirementId?.category ?? '—'}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>${bid.proposedBudget}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{bid.proposedTimeline}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    ...(STATUS_COLORS[bid.status] ?? {}),
                  }}>
                    {bid.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
