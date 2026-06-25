import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';

export default function BrowseRequirementsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOpenRequirements() {
      try {
        const data = await requirementService.listOpenRequirements(token);
        setRequirements(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOpenRequirements();
  }, [token]);

  if (loading) return <p>Loading requirements...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>Browse Open Requirements</h1>

      {requirements.length === 0 ? (
        <p>No open requirements at the moment.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Budget</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Timeline</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Client Company</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr
                key={req._id}
                onClick={() => navigate(`/provider/requirements/${req._id}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.title}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.category}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>${req.budgetMin} – ${req.budgetMax}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.timeline}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{req.clientCompany ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
