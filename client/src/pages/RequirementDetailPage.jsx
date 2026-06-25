import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import bidService from '../services/bidService';
import dealService from '../services/dealService';
import { VALID_CATEGORIES } from '../constants/categories';

const BID_STATUS_COLORS = {
  pending:  { background: '#dbeafe', color: '#1e40af' },
  accepted: { background: '#d1fae5', color: '#065f46' },
  declined: { background: '#fee2e2', color: '#991b1b' },
};

export default function RequirementDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({});
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Close state
  const [closeError, setCloseError] = useState('');

  // Proposals (bids) state
  const [bids, setBids] = useState([]);
  const [bidsError, setBidsError] = useState('');

  // Accept bid state
  const [acceptError, setAcceptError] = useState('');
  const [dealCreatedMessage, setDealCreatedMessage] = useState('');

  useEffect(() => {
    async function fetchRequirement() {
      try {
        const data = await requirementService.getRequirement(id, token);
        setRequirement(data);
        setEditForm({
          title: data.title,
          category: data.category,
          description: data.description,
          budgetMin: data.budgetMin,
          budgetMax: data.budgetMax,
          timeline: data.timeline,
        });
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchBids() {
      try {
        const data = await bidService.getBidsForRequirement(id, token);
        setBids(data);
      } catch (err) {
        setBidsError(err.message);
      }
    }

    fetchRequirement();
    fetchBids();
  }, [id, token]);

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    try {
      const payload = {
        ...editForm,
        budgetMin: editForm.budgetMin !== '' ? Number(editForm.budgetMin) : undefined,
        budgetMax: editForm.budgetMax !== '' ? Number(editForm.budgetMax) : undefined,
      };
      const updated = await requirementService.updateRequirement(id, payload, token);
      setRequirement(updated);
      setUpdateSuccess('Requirement updated successfully.');
    } catch (err) {
      setUpdateError(err.message);
    }
  }

  async function handleClose() {
    setCloseError('');
    const confirmed = window.confirm(
      'Are you sure you want to close this requirement? This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      const updated = await requirementService.closeRequirement(id, token);
      setRequirement(updated);
    } catch (err) {
      setCloseError(err.message);
    }
  }

  async function handleAcceptBid(bidId) {
    setAcceptError('');
    setDealCreatedMessage('');
    const confirmed = window.confirm('Accept this proposal and create a deal?');
    if (!confirmed) return;
    try {
      await dealService.acceptBid(bidId, token);
      // Seal the requirement in local state so edit/close controls hide immediately
      setRequirement((prev) => ({ ...prev, status: 'sealed' }));
      // Re-fetch bids so all statuses (accepted/declined) update in the UI
      const refreshedBids = await bidService.getBidsForRequirement(id, token);
      setBids(refreshedBids);
      setDealCreatedMessage('Deal created! ');
    } catch (err) {
      setAcceptError(err.message);
    }
  }

  if (loading) return <p>Loading requirement...</p>;
  if (fetchError) return <p style={{ color: 'red' }}>{fetchError}</p>;
  if (!requirement) return null;

  const isOpen = requirement.status === 'open';

  return (
    <div>
      <h1>{requirement.title}</h1>

      {/* Display fields */}
      <p><strong>Category:</strong> {requirement.category}</p>
      <p><strong>Status:</strong> {requirement.status}</p>
      <p><strong>Description:</strong> {requirement.description}</p>
      <p><strong>Budget:</strong> ${requirement.budgetMin} – ${requirement.budgetMax}</p>
      <p><strong>Timeline:</strong> {requirement.timeline}</p>

      {/* Close button — only when open */}
      {isOpen && (
        <div style={{ margin: '1rem 0' }}>
          <button
            onClick={handleClose}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Close Requirement
          </button>
          {closeError && <p style={{ color: 'red' }}>{closeError}</p>}
        </div>
      )}

      {/* Edit form — only when open */}
      {isOpen && (
        <div>
          <h2>Edit Requirement</h2>

          {updateError && <p style={{ color: 'red' }}>{updateError}</p>}
          {updateSuccess && <p style={{ color: 'green' }}>{updateSuccess}</p>}

          <form onSubmit={handleUpdate}>
            <div>
              <label htmlFor="title">Title</label><br />
              <input
                id="title"
                name="title"
                type="text"
                value={editForm.title ?? ''}
                onChange={handleEditChange}
              />
            </div>

            <div>
              <label htmlFor="category">Category</label><br />
              <select
                id="category"
                name="category"
                value={editForm.category ?? ''}
                onChange={handleEditChange}
              >
                <option value="">Select a category</option>
                {VALID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description">Description</label><br />
              <textarea
                id="description"
                name="description"
                rows={6}
                value={editForm.description ?? ''}
                onChange={handleEditChange}
              />
            </div>

            <div>
              <label htmlFor="budgetMin">Budget Min ($)</label><br />
              <input
                id="budgetMin"
                name="budgetMin"
                type="number"
                value={editForm.budgetMin ?? ''}
                onChange={handleEditChange}
              />
            </div>

            <div>
              <label htmlFor="budgetMax">Budget Max ($)</label><br />
              <input
                id="budgetMax"
                name="budgetMax"
                type="number"
                value={editForm.budgetMax ?? ''}
                onChange={handleEditChange}
              />
            </div>

            <div>
              <label htmlFor="timeline">Timeline</label><br />
              <input
                id="timeline"
                name="timeline"
                type="text"
                value={editForm.timeline ?? ''}
                onChange={handleEditChange}
              />
            </div>

            <button type="submit">Save Changes</button>
          </form>
        </div>
      )}

      {/* Proposals — read-only except for Accept button when requirement is open */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Proposals</h2>
        {bidsError && <p style={{ color: 'red' }}>{bidsError}</p>}
        {acceptError && <p style={{ color: 'red' }}>{acceptError}</p>}
        {dealCreatedMessage && (
          <p style={{ color: 'green' }}>
            {dealCreatedMessage}
            <Link to="/client/deals">Go to My Deals</Link>
          </p>
        )}
        {bids.length === 0 ? (
          <p>No proposals yet.</p>
        ) : (
          bids.map((bid) => (
            <div
              key={bid._id}
              style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}
            >
              <p><strong>{bid.providerName}</strong> — {bid.providerCompany}</p>
              <p><strong>Proposed Budget:</strong> ${bid.proposedBudget}</p>
              <p><strong>Proposed Timeline:</strong> {bid.proposedTimeline}</p>
              <p><strong>Message:</strong> {bid.message}</p>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                ...(BID_STATUS_COLORS[bid.status] ?? {}),
              }}>
                {bid.status}
              </span>
              {/* Accept button — only for pending bids while requirement is still open */}
              {isOpen && bid.status === 'pending' && (
                <button
                  onClick={() => handleAcceptBid(bid._id)}
                  style={{ marginLeft: '12px', background: '#16a34a', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Accept Proposal
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
