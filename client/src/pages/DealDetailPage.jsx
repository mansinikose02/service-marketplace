import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dealService from '../services/dealService';
import updateService from '../services/updateService';

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

  // Update thread state
  const [updates, setUpdates] = useState([]);
  const [updatesError, setUpdatesError] = useState('');
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState('');

  // Mark complete state
  const [completeError, setCompleteError] = useState('');

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

    async function fetchUpdates() {
      try {
        const data = await updateService.getUpdates(id, token);
        setUpdates(data);
      } catch (err) {
        setUpdatesError(err.message);
      }
    }

    fetchDeal();
    fetchUpdates();
  }, [id, token]);

  async function handlePostUpdate(e) {
    e.preventDefault();
    setPostError('');
    try {
      const savedUpdate = await updateService.postUpdate(id, newContent, token);
      setUpdates((prev) => [...prev, savedUpdate]);
      setNewContent('');
    } catch (err) {
      setPostError(err.message);
    }
  }

  async function handleMarkCompleted() {
    setCompleteError('');
    const confirmed = window.confirm('Mark this deal as completed? This cannot be undone.');
    if (!confirmed) return;
    try {
      const updatedDeal = await dealService.markCompleted(id, token);
      setDeal(updatedDeal);
    } catch (err) {
      setCompleteError(err.message);
    }
  }

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

      {/* Mark Complete button — only when deal is active */}
      {deal.status === 'active' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleMarkCompleted}
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Mark as Completed
          </button>
          {completeError && <p style={{ color: 'red' }}>{completeError}</p>}
        </div>
      )}

      {/* Deal Room — update thread */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Deal Room</h2>

        {updatesError && <p style={{ color: 'red' }}>{updatesError}</p>}

        <div style={{ marginBottom: '1.5rem' }}>
          {updates.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No updates yet. Start the conversation below.</p>
          ) : (
            updates.map((update) => (
              <div
                key={update._id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                  background: update.authorRole === 'client' ? '#f0f9ff' : '#fef3c7',
                }}
              >
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                  <strong>{update.authorName}</strong> ({update.authorRole}) —{' '}
                  {new Date(update.createdAt).toLocaleString()}
                </p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{update.content}</p>
              </div>
            ))
          )}
        </div>

        {deal.status === 'active' && (
          <form onSubmit={handlePostUpdate}>
            <div>
              <label htmlFor="newContent">Post an update</label><br />
              <textarea
                id="newContent"
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Share progress, ask questions, or provide feedback..."
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>
            {postError && <p style={{ color: 'red' }}>{postError}</p>}
            <button type="submit" style={{ marginTop: '8px', padding: '6px 16px', borderRadius: '4px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Post Update
            </button>
          </form>
        )}

        {deal.status === 'completed' && (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
            This deal is completed. No further updates can be posted.
          </p>
        )}
      </section>
    </div>
  );
}
