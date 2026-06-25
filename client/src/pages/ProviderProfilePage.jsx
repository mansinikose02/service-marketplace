import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import { VALID_CATEGORIES } from '../constants/categories';

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
  const [pitchComplete, setPitchComplete] = useState(null);

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
        // 404 means no profile yet — leave empty form, no error shown
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
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading profile...</p>;

  return (
    <div>
      <h1>Provider Profile</h1>

      {pitchComplete !== null && (
        <span style={{ marginBottom: '1rem', display: 'inline-block', padding: '2px 10px', borderRadius: '12px', background: pitchComplete ? '#d1fae5' : '#fee2e2', color: pitchComplete ? '#065f46' : '#991b1b' }}>
          {pitchComplete ? 'Complete' : 'Incomplete'}
        </span>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="pitch">Pitch</label><br />
          <textarea
            id="pitch"
            name="pitch"
            rows={6}
            value={form.pitch}
            onChange={handleChange}
          />
        </div>

        <div>
          <fieldset>
            <legend>Categories</legend>
            {VALID_CATEGORIES.map((cat) => (
              <label key={cat} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={form.categories.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                {' '}{cat}
              </label>
            ))}
          </fieldset>
        </div>

        <div>
          <label htmlFor="capacity">Capacity (concurrent projects)</label><br />
          <input
            id="capacity"
            name="capacity"
            type="number"
            value={form.capacity}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="teamSize">Team Size</label><br />
          <input
            id="teamSize"
            name="teamSize"
            type="number"
            value={form.teamSize}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="typicalBudgetMin">Typical Budget Min ($)</label><br />
          <input
            id="typicalBudgetMin"
            name="typicalBudgetMin"
            type="number"
            value={form.typicalBudgetMin}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="typicalBudgetMax">Typical Budget Max ($)</label><br />
          <input
            id="typicalBudgetMax"
            name="typicalBudgetMax"
            type="number"
            value={form.typicalBudgetMax}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="websiteUrl">Website URL</label><br />
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="text"
            value={form.websiteUrl}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
}
