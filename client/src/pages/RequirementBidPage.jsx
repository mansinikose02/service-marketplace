import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import bidService from '../services/bidService';
import Layout from '../components/Layout';

export default function RequirementBidPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [requirement, setRequirement] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ proposedBudget: '', proposedTimeline: '', message: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRequirement() {
      try {
        const data = await requirementService.getRequirement(id, token);
        setRequirement(data);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRequirement();
  }, [id, token]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        proposedBudget: form.proposedBudget !== '' ? Number(form.proposedBudget) : undefined,
      };
      await bidService.submitBid(id, payload, token);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <Layout><p className="text-gray-500">Loading…</p></Layout>;
  if (fetchError) return <Layout><p className="text-sm text-red-600">{fetchError}</p></Layout>;
  if (!requirement) return null;

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/provider/requirements" className="text-sm text-indigo-600 hover:underline">← Back to requirements</Link>
      </div>

      {/* Requirement summary card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
          {requirement.category}
        </span>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{requirement.title}</h1>
        <p className="text-sm text-gray-600 mb-3">{requirement.description}</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <span>💰 ${requirement.budgetMin}–${requirement.budgetMax}</span>
          <span>📅 {requirement.timeline}</span>
          {requirement.clientCompany && <span>🏢 {requirement.clientCompany}</span>}
        </div>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">Proposal submitted</p>
          <p className="text-sm text-green-700 mt-1">You'll be notified when the client responds.</p>
          <Link to="/provider/bids" className="inline-block mt-4 text-sm text-indigo-600 hover:underline font-medium">
            View my bids →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit a Proposal</h2>

          {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="proposedBudget" className="block text-sm font-medium text-gray-700 mb-1">Proposed Budget ($)</label>
              <input id="proposedBudget" name="proposedBudget" type="number" value={form.proposedBudget} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="proposedTimeline" className="block text-sm font-medium text-gray-700 mb-1">Proposed Timeline</label>
              <input id="proposedTimeline" name="proposedTimeline" type="text" value={form.proposedTimeline} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message (min 10 characters)</label>
              <textarea id="message" name="message" rows={5} value={form.message} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Submitting…' : 'Submit Proposal'}
            </button>
          </form>
        </div>
      )}
    </Layout>
  );
}
