import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dealService from '../services/dealService';

const STATUS_COLORS = {
  active:    { background: '#dbeafe', color: '#1e40af' },
  completed: { background: '#d1fae5', color: '#065f46' },
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

  // Navigate to the role-prefixed deal detail path
  const dealPath = (dealId) =>
    user?.role === 'client' ? `/client/deals/${dealId}` : `/provider/deals/${dealId}`;

  if (loading) return <p>Loading deals...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>My Deals</h1>

      {deals.length === 0 ? (
        <p>No deals yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Agreed Budget</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Timeline</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal._id}
                onClick={() => navigate(dealPath(deal._id))}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{deal.title}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>${deal.agreedBudget}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{deal.agreedTimeline}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    ...(STATUS_COLORS[deal.status] ?? {}),
                  }}>
                    {deal.status}
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
