import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dealService from '../services/dealService';

const STATUS_COLORS = {
  active:    { background: '#dbeafe', color: '#1e40af' },
  completed: { background: '#d1fae5', color: '#065f46' },
};

export default function DealDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDeal() {
      try {
        const data = await dealService.getDeal(id, token);
        setDeal(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [id, token]);

  if (loading) return <p>Loading deal...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!deal) return null;

  return (
    <div>
      <h1>{deal.title}</h1>

      <span style={{
        display: 'inline-block',
        marginBottom: '1rem',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        ...(STATUS_COLORS[deal.status] ?? {}),
      }}>
        {deal.status}
      </span>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Deal Terms</h2>
        <p><strong>Agreed Budget:</strong> ${deal.agreedBudget}</p>
        <p><strong>Agreed Timeline:</strong> {deal.agreedTimeline}</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Client</h2>
        <p><strong>Name:</strong> {deal.clientName}</p>
        <p><strong>Company:</strong> {deal.clientCompany}</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Provider</h2>
        <p><strong>Name:</strong> {deal.providerName}</p>
        <p><strong>Company:</strong> {deal.providerCompany}</p>
      </section>

      {/* Deal Room — update thread added in Week 5 */}
    </div>
  );
}
