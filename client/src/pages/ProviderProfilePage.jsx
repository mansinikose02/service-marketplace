import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import { VALID_CATEGORIES } from '../constants/categories';
import Layout from '../components/Layout';

const EMPTY_FORM = {
  pitch: '',
  categories: [],
  capacity: '',
  teamSize: '',
  typicalBudgetMin: '',
  typicalBudgetMax: '',
  websiteUrl: '',
};

export default function ProviderProfilePage() {
  const { token } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [pitchComplete, setPitchComplete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await profileService.getOwnProfile(token);
        setForm({
          pitch: data.pitch ?? '',
          categories: data.categories ?? [],
          capacity: data.capacity ?? '',
          teamSize: data.teamSize ?? '',
          typicalBudgetMin: data.typicalBudgetMin ?? '',
          typicalBudgetMax: data.typicalBudgetMax ?? '',
          websiteUrl: data.websiteUrl ?? '',
        });
        setPitchComplete(data.pitchComplete ?? false);
      } catch (err) {
        if (!err.message.includes('not found') && !err.message.includes('404')) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCategoryToggle(cat) {
    setForm((prev) => {
      const already = prev.categories.includes(cat);
      return {
        ...prev,
        categories: already
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaveSuccess('');
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        capacity: form.capacity !== '' ? Number(form.capacity) : undefined,
        teamSize: form.teamSize !== '' ? Number(form.teamSize) : undefined,
        typicalBudgetMin: form.typicalBudgetMin !== '' ? Number(form.typicalBudgetMin) : undefined,
        typicalBudgetMax: form.typicalBudgetMax !== '' ? Number(form.typicalBudgetMax) : undefined,
      };
      const data = await profileService.upsertProfile(payload, token);
      setPitchComplete(data.pitchComplete ?? false);
      setSaveSuccess('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <Layout><p className="text-gray-500">Loading…</p></Layout>;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Provider Profile</h1>
        {pitchComplete !== null && (
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${pitchComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {pitchComplete ? '✓ Profile Complete' : '⚠ Profile Incomplete'}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {saveSuccess && <p className="text-sm text-green-600 mb-4">{saveSuccess}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pitch" className="block text-sm font-medium text-gray-700 mb-1">
              Pitch <span className="text-gray-400 font-normal">(min 100 characters)</span>
            </label>
            <textarea
              id="pitch"
              name="pitch"
              rows={6}
              value={form.pitch}
              onChange={handleChange}
              placeholder="Describe your services, experience, and what makes you stand out…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Categories <span className="text-gray-400 font-normal">(1–5)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VALID_CATEGORIES.map((cat) => {
                const selected = form.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      selected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {selected && <span className="mr-1">✓</span>}{cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">Capacity (concurrent projects)</label>
              <input id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <input id="teamSize" name="teamSize" type="number" value={form.teamSize} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="typicalBudgetMin" className="block text-sm font-medium text-gray-700 mb-1">Typical Budget Min ($)</label>
              <input id="typicalBudgetMin" name="typicalBudgetMin" type="number" value={form.typicalBudgetMin} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="typicalBudgetMax" className="block text-sm font-medium text-gray-700 mb-1">Typical Budget Max ($)</label>
              <input id="typicalBudgetMax" name="typicalBudgetMax" type="number" value={form.typicalBudgetMax} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input id="websiteUrl" name="websiteUrl" type="text" value={form.websiteUrl} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
