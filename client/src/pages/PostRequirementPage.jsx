import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import { VALID_CATEGORIES } from '../constants/categories';

const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  budgetMin: '',
  budgetMax: '',
  timeline: '',
};

export default function PostRequirementPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        budgetMin: form.budgetMin !== '' ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax !== '' ? Number(form.budgetMax) : undefined,
      };
      await requirementService.createRequirement(payload, token);
      navigate('/client/requirements');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Post a Requirement</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label><br />
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="category">Category</label><br />
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
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
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="budgetMin">Budget Min ($)</label><br />
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            value={form.budgetMin}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="budgetMax">Budget Max ($)</label><br />
          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            value={form.budgetMax}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="timeline">Timeline</label><br />
          <input
            id="timeline"
            name="timeline"
            type="text"
            value={form.timeline}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Post Requirement</button>
      </form>
    </div>
  );
}
