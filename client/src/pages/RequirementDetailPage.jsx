import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import bidService from '../services/bidService';
import dealService from '../services/dealService';
import { VALID_CATEGORIES } from '../constants/categories';
import Layout from '../components/Layout';

const STATUS_CLASSES = {
  open:   'bg-blue-100 text-blue-800',
  sealed: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
};

const BID_STATUS_CLASSES = {
  pending:  'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-gray-100 text-gray-600',
};

export default function RequirementDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [editForm, setEditForm] = useState({});
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [closeError, setCloseError] = useState('');

  const [bids, setBids] = useState([]);
  const [bidsError, setBidsError] = useState('');
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
      setUpdateSuccess('Requirement updated.');
    } catch (err) {
      setUpdateError(err.message);
    }
  }

  async function handleClose() {
    setCloseError('');
    if (!window.confirm('Close this requirement? This cannot be undone.')) return;
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
    if (!window.confirm('Accept this proposal and create a deal?')) return;
    try {
      await dealService.acceptBid(bidId, token);
      setRequirement((prev) => ({ ...prev, status: 'sealed' }));
      const refreshedBids = await bidService.getBidsForRequirement(id, token);
      setBids(refreshedBids);
      setDealCreatedMessage('Deal created!');
    } catch (err) {
      setAcceptError(err.message);
    }
  }

  if (loading) return <Layout><p className="text-gray-500">Loading…</p></Layout>;
  if (fetchError) return <Layout><p className="text-sm text-red-600">{fetchError}</p></Layout>;
  if (!requirement) return null;

  const isOpen = requirement.status === 'open';

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/client/requirements" className="text-sm text-indigo-600 hover:underline">← Back</Link>
      </div>

      {/* Requirement info card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{requirement.title}</h1>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_CLASSES[requirement.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {requirement.status}
          </span>
        </div>
        <p className="text-sm text-indigo-600 font-medium mt-1">{requirement.category}</p>
        <p className="text-sm text-gray-700 mt-3">{requirement.description}</p>
        <div className="flex gap-6 mt-4 text-sm text-gray-500">
          <span>💰 ${requirement.budgetMin}–${requirement.budgetMax}</span>
          <span>📅 {requirement.timeline}</span>
        </div>
        {isOpen && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Close Requirement
            </button>
            {closeError && <p className="text-sm text-red-600">{closeError}</p>}
          </div>
        )}
      </div>

      {/* Edit form card — only when open */}
      {isOpen && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Requirement</h2>
          {updateError && <p className="text-sm text-red-600 mb-3">{updateError}</p>}
          {updateSuccess && <p className="text-sm text-green-600 mb-3">{updateSuccess}</p>}
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input id="title" name="title" type="text" value={editForm.title ?? ''} onChange={handleEditChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select id="category" name="category" value={editForm.category ?? ''} onChange={handleEditChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select a category</option>
                {VALID_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea id="description" name="description" rows={5} value={editForm.description ?? ''} onChange={handleEditChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700 mb-1">Budget Min ($)</label>
                <input id="budgetMin" name="budgetMin" type="number" value={editForm.budgetMin ?? ''} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700 mb-1">Budget Max ($)</label>
                <input id="budgetMax" name="budgetMax" type="number" value={editForm.budgetMax ?? ''} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <input id="timeline" name="timeline" type="text" value={editForm.timeline ?? ''} onChange={handleEditChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Proposals section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Proposals</h2>
        {bidsError && <p className="text-sm text-red-600 mb-2">{bidsError}</p>}
        {acceptError && <p className="text-sm text-red-600 mb-2">{acceptError}</p>}
        {dealCreatedMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3 flex items-center gap-2 text-sm text-green-800">
            ✅ {dealCreatedMessage}{' '}
            <Link to="/client/deals" className="font-medium underline">Go to My Deals</Link>
          </div>
        )}
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No proposals yet.</p>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => (
              <div key={bid._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Link
                      to={`/providers/${bid.providerId}`}
                      className="text-sm font-semibold text-indigo-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bid.providerName}
                    </Link>
                    <p className="text-xs text-gray-500">{bid.providerCompany}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>💰 ${bid.proposedBudget}</span>
                      <span>📅 {bid.proposedTimeline}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{bid.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${BID_STATUS_CLASSES[bid.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {bid.status}
                    </span>
                    {isOpen && bid.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptBid(bid._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
