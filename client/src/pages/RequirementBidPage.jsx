import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import bidService from '../services/bidService';

export default function RequirementBidPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [requirement, setRequirement] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ proposedBudget: '', proposedTimeline: '', message: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
    try {
      const payload = {
        ...form,
        proposedBudget: form.proposedBudget !== '' ? Number(form.proposedBudget) : undefined,
      };
      await bidService.submitBid(id, payload, token);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  if (loading) return <p>Loading requirement...</p>;
  if (fetchError) return <p style={{ color: 'red' }}>{fetchError}</p>;
  if (!requirement) return null;

  return (
    <div>
      <h1>{requirement.title}</h1>
      <p><strong>Category:</strong> {requirement.category}</p>
      <p><strong>Description:</strong> {requirement.description}</p>
      <p><strong>Budget:</strong> ${requirement.budgetMin} – ${requirement.budgetMax}</p>
      <p><strong>Timeline:</strong> {requirement.timeline}</p>
      {requirement.clientCompany && (
        <p><strong>Client:</strong> {requirement.clientCompany}</p>
      )}

      <hr style={{ margin: '1.5rem 0' }} />

      {submitted ? (
        <p style={{ color: 'green' }}>Proposal submitted.</p>
      ) : (
        <div>
          <h2>Submit a Proposal</h2>

          {submitError && (
            <p style={{ color: submitError.includes('already bid') ? '#92400e' : 'red' }}>
              {submitError}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="proposedBudget">Proposed Budget ($)</label><br />
              <input
                id="proposedBudget"
                name="proposedBudget"
                type="number"
                value={form.proposedBudget}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="proposedTimeline">Proposed Timeline</label><br />
              <input
                id="proposedTimeline"
                name="proposedTimeline"
                type="text"
                value={form.proposedTimeline}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="message">Message (min 10 characters)</label><br />
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <button type="submit">Submit Proposal</button>
          </form>
        </div>
      )}
    </div>
  );
}
