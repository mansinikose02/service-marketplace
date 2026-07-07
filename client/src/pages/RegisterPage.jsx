import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    company: '',
  });
  const [error, setError] = useState('');
  const [registeredMessage, setRegisteredMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setRegisteredMessage('');
    setIsSubmitting(true);
    try {
      await authService.register(formData);
      try {
        const { token, user } = await authService.login({
          email: formData.email,
          password: formData.password,
        });
        login(user, token);
        navigate(`/${user.role}/dashboard`);
      } catch {
        setRegisteredMessage('Account created! Please log in to continue.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fade-in min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dealtable
          </span>
          <p className="text-gray-500 text-sm mt-2">Create your account</p>
        </div>

        <div className="bg-white shadow-2xl border-0 rounded-3xl p-10">
          {registeredMessage ? (
            <div className="text-center space-y-4">
              <p className="text-green-700 font-medium">{registeredMessage}</p>
              <Link to="/login" className="text-indigo-600 hover:underline text-sm font-semibold">
                Go to login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  id="name" name="name" type="text" required
                  value={formData.name} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password" name="password" type="password" required
                  value={formData.password} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Role selector — two clickable cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'client', label: 'Client', description: 'I need services' },
                    { value: 'provider', label: 'Provider', description: 'I offer services' },
                  ].map(({ value, label, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: value }))}
                      className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        formData.role === value
                          ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  id="company" name="company" type="text" required
                  value={formData.company} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-200"
              >
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
