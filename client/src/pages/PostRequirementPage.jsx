import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import requirementService from '../services/requirementService';
import aiService from '../services/aiService';
import { VALID_CATEGORIES } from '../constants/categories';
import Layout from '../components/Layout';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [roughIdea, setRoughIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleGenerate() {
    setAiError('');
    setAiSuccess('');
    setIsGenerating(true);
    try {
      const generated = await aiService.generateRequirement(roughIdea, token);
      setForm({
        title: generated.title ?? '',
        category: VALID_CATEGORIES.includes(generated.category) ? generated.category : '',
        description: generated.description ?? '',
        budgetMin: generated.budgetMin != null ? String(generated.budgetMin) : '',
        budgetMax: generated.budgetMax != null ? String(generated.budgetMax) : '',
        timeline: generated.timeline ?? '',
      });
      setAiSuccess('Requirement generated! Review and edit before posting.');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="fade-in">
        <div className="mb-4">
          <Link to="/client/requirements" className="text-sm text-indigo-600 hover:underline">
            ← Back to requirements
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Post a Requirement</h1>

        {/* AI Assistant card — vivid gradient */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-bold text-white">AI Assistant</h2>
          </div>
          <p className="text-xs text-white/80 mb-4">
            Not sure how to write your requirement? Describe your need in plain language and let AI draft it for you.
          </p>

          <div className="mb-3">
            <label htmlFor="roughIdea" className="block text-sm font-medium text-white mb-1">
              Describe your need in plain language
            </label>
            <textarea
              id="roughIdea"
              rows={3}
              value={roughIdea}
              onChange={(e) => setRoughIdea(e.target.value)}
              placeholder="e.g. I need someone to build a fitness tracking mobile app with user login, workout logging, and progress charts"
              className="w-full bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {aiError && <p className="text-sm text-red-200 mb-2">{aiError}</p>}
          {aiSuccess && <p className="text-sm text-green-200 mb-2">✓ {aiSuccess}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || roughIdea.trim().length < 10}
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50 transition-all duration-200"
          >
            {isGenerating ? 'Generating…' : 'Generate Requirement with AI ✨'}
          </button>
        </div>

        {/* Main form card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select id="category" name="category" value={form.category} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select a category</option>
                {VALID_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea id="description" name="description" rows={5} value={form.description} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700 mb-1">Budget Min ($)</label>
                <input id="budgetMin" name="budgetMin" type="number" value={form.budgetMin} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700 mb-1">Budget Max ($)</label>
                <input id="budgetMax" name="budgetMax" type="number" value={form.budgetMax} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <input id="timeline" name="timeline" type="text" value={form.timeline} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-200">
              {isSubmitting ? 'Posting…' : 'Post Requirement'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
