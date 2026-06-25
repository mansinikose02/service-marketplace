import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';

const STATUS_COLORS = {
  open: { background: '#dbeafe', color: '#1e40af' },
  sealed: { background: '#fef9c3', color: '#854d0e' },
  closed: { background: '#f3f4f6', color: '#374151' },
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

  if (loading) return <p>Loading requirements...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>My Requirements</h1>

      <button onClick={() => navigate('/client/requirements/new')}>
        Post New Requirement
      </button>

      {requirements.length === 0 ? (
        <p>You have not posted any requirements yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Bids</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr
                key={req._id}
                onClick={() => navigate(`/client/requirements/${req._id}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.title}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.category}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    ...(STATUS_COLORS[req.status] ?? {}),
                  }}>
                    {req.status}
                  </span>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.bidCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
