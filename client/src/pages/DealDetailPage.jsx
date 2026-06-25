import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dealService from '../services/dealService';
import updateService from '../services/updateService';
import reviewService from '../services/reviewService';
import Layout from '../components/Layout';

const STATUS_CLASSES = {
  active:           'bg-blue-100 text-blue-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  disputed:         'bg-red-100 text-red-800',
  completed:        'bg-green-100 text-green-800',
};

const STATUS_LABELS = {
  active:           'Active',
  pending_approval: 'Pending Approval',
  disputed:         'Disputed',
  completed:        'Completed',
};

// Updates can be posted while deal is in any non-completed state
const UPDATES_ALLOWED_STATUSES = new Set(['active', 'pending_approval', 'disputed']);

export default function DealDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [updates, setUpdates] = useState([]);
  const [updatesError, setUpdatesError] = useState('');
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState('');

  // One shared error state for all status-transition actions
  const [actionError, setActionError] = useState('');

  const [existingReview, setExistingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    async function fetchDeal() {
      try {
        const data = await dealService.getDeal(id, token);
        setDeal(data);

        if (data.status === 'completed' && user?.role === 'client') {
          try {
            const { reviews } = await reviewService.getProviderReviews(data.providerId, token);
            const matchingReview = reviews.find(
              (r) => r.dealId === id || r.dealId?._id === id || r.dealId?.toString() === id
            );
            if (matchingReview) setExistingReview(matchingReview);
          } catch {
            // Silently ignore — review form will show instead
          }
        }
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
  }, [id, token, user?.role]);

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

  // Generic helper to run a deal action and update local state
  async function runDealAction(actionFn) {
    setActionError('');
    try {
      const updatedDeal = await actionFn(id, token);
      setDeal(updatedDeal);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewError('');
    try {
      const savedReview = await reviewService.submitReview(
        { dealId: id, rating: reviewRating, comment: reviewComment },
        token
      );
      setExistingReview(savedReview);
    } catch (err) {
      setReviewError(err.message);
    }
  }

  const backPath = user?.role === 'client' ? '/client/deals' : '/provider/deals';

  if (loading) return <Layout><p className="text-gray-500">Loading…</p></Layout>;
  if (error) return <Layout><p className="text-sm text-red-600">{error}</p></Layout>;
  if (!deal) return null;

  const canPostUpdates = UPDATES_ALLOWED_STATUSES.has(deal.status);

  return (
    <Layout>
      <div className="mb-4">
        <Link to={backPath} className="text-sm text-indigo-600 hover:underline">← Back to deals</Link>
      </div>

      {/* Deal header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_CLASSES[deal.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[deal.status] ?? deal.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Agreed Budget</p>
            <p className="text-sm font-semibold text-gray-900">${deal.agreedBudget}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Timeline</p>
            <p className="text-sm font-semibold text-gray-900">{deal.agreedTimeline}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Client</p>
            <p className="text-sm font-medium text-gray-900">{deal.clientName}</p>
            <p className="text-xs text-gray-500">{deal.clientCompany}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Provider</p>
            <p className="text-sm font-medium text-gray-900">{deal.providerName}</p>
            <p className="text-xs text-gray-500">{deal.providerCompany}</p>
          </div>
        </div>

        {/* ── Status-action area ── */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

          {/* ACTIVE — provider submits, client waits */}
          {deal.status === 'active' && user?.role === 'provider' && (
            <button
              onClick={() => runDealAction(dealService.submitForApproval)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Submit Work for Approval
            </button>
          )}
          {deal.status === 'active' && user?.role === 'client' && (
            <p className="text-sm text-gray-500">Waiting for the provider to submit work for approval.</p>
          )}

          {/* PENDING APPROVAL — client approves or disputes, provider waits */}
          {deal.status === 'pending_approval' && user?.role === 'client' && (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-3 text-sm text-yellow-800">
                The provider has submitted work for your approval.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => runDealAction(dealService.approveCompletion)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Approve &amp; Complete
                </button>
                <button
                  onClick={() => runDealAction(dealService.raiseDispute)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Raise a Dispute
                </button>
              </div>
            </div>
          )}
          {deal.status === 'pending_approval' && user?.role === 'provider' && (
            <p className="text-sm text-gray-500">Work submitted. Waiting for client approval.</p>
          )}

          {/* DISPUTED — both see banner and resolve button; provider also sees guidance */}
          {deal.status === 'disputed' && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3 text-sm text-red-800 font-medium">
                ⚠ This deal is under dispute.
              </div>
              {user?.role === 'provider' && (
                <p className="text-sm text-gray-600 mb-3">
                  The client has raised a dispute. Please address their concerns and resubmit.
                </p>
              )}
              <button
                onClick={() => runDealAction(dealService.resolveDispute)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Resolve Dispute
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deal Room thread */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Deal Room</h2>

        {updatesError && <p className="text-sm text-red-600 mb-3">{updatesError}</p>}

        <div className="space-y-3 mb-5">
          {updates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No updates yet. Start the conversation.</p>
          ) : (
            updates.map((update) => {
              const isCurrentUser = update.authorRole === user?.role;
              return (
                <div key={update._id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm rounded-xl px-4 py-3 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className={`text-xs mb-1 ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {update.authorName} · {new Date(update.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canPostUpdates && (
          <form onSubmit={handlePostUpdate} className="border-t border-gray-100 pt-4">
            <textarea
              id="newContent"
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Share progress, ask questions, or provide feedback…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            />
            {postError && <p className="text-sm text-red-600 mb-2">{postError}</p>}
            <button type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Post Update
            </button>
          </form>
        )}

        {deal.status === 'completed' && (
          <p className="text-sm text-gray-400 italic border-t border-gray-100 pt-4">
            This deal is completed. No further updates can be posted.
          </p>
        )}
      </div>

      {/* Review section — only visible when deal is completed */}
      {deal.status === 'completed' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Review</h2>

          {user?.role === 'provider' && (
            <p className="text-sm text-gray-500">The client will leave a review once the deal is completed.</p>
          )}

          {user?.role === 'client' && existingReview && (
            <div>
              <p className="text-xs text-green-600 font-medium mb-2">✓ Review submitted</p>
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`text-xl ${i < existingReview.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700">{existingReview.comment}</p>
            </div>
          )}

          {user?.role === 'client' && !existingReview && (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      className={`text-3xl leading-none transition-colors ${star <= reviewRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comment (min 10 characters)
                </label>
                <textarea
                  id="reviewComment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
              <button type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Submit Review
              </button>
            </form>
          )}
        </div>
      )}
    </Layout>
  );
}
