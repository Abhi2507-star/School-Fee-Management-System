import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, loading, initialSetupRequired, sessionNotice, clearSessionNotice, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-sm">
        Verifying session status...
      </div>
    );
  }

  if (initialSetupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    clearSessionNotice();
    setIsSubmitting(true);
    try {
      const result = await login(identifier.trim(), password);
      navigate(result.redirectTo || '/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username/email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
        {/* Blue-and-white school header with SV logo/initials */}
        <div className="bg-svss-navy text-white p-6 border-b-4 border-svss-saffron text-center">
          <div className="w-14 h-14 mx-auto rounded-lg bg-svss-saffron flex items-center justify-center font-extrabold text-xl shadow">
            SV
          </div>
          <h1 className="font-extrabold text-base uppercase tracking-wide mt-3">
            Swami Vivekanand Sikshan Sansthan
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            Haripur, Karaudi Kalan, Kadipur, Sultanpur, Uttar Pradesh 228161
          </p>
          <p className="text-[11px] text-blue-200 mt-1 font-medium">
            स्कूल फीस प्रबंधन प्रणाली • स्टाफ लॉगिन (School Fee Management System)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {sessionNotice && (
            <div role="status" className="p-3 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
              {sessionNotice}
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 rounded bg-red-50 border border-red-300 text-red-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 mb-1">
              यूज़रनेम या ईमेल (Username or Email) *
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your username or email"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-svss-navy"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1">
              पासवर्ड (Password) *
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-svss-navy"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-svss-navy hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-2.5 rounded text-sm shadow-sm"
          >
            {isSubmitting ? 'लॉगिन हो रहा है (Signing In...)' : 'लॉगिन करें (Sign In)'}
          </button>
        </form>
      </div>
    </div>
  );
};
