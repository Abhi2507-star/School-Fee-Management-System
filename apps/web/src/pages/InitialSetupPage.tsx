import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const InitialSetupPage: React.FC = () => {
  const { user, loading, initialSetupRequired, setupInitialAdmin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolAddressLine1, setSchoolAddressLine1] = useState('Haripur, Karaudi Kalan, Kadipur');
  const [primaryPhone, setPrimaryPhone] = useState('+91-532-2400108');
  const [receiptPrefix, setReceiptPrefix] = useState('SVSS');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-sm">
        Checking system initialization status...
      </div>
    );
  }

  // Ensure initial setup is available ONLY when the system has not yet been initialized
  if (!initialSetupRequired) {
    return <Navigate to={user ? '/' : '/login'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (password.length < 10) {
      setErrorMsg('Administrator password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupInitialAdmin({
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        schoolAddressLine1: schoolAddressLine1.trim() || undefined,
        primaryPhone: primaryPhone.trim() || undefined,
        receiptPrefix: receiptPrefix.trim().toUpperCase() || 'SVSS',
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Initial administrator setup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-svss-navy text-white p-5 border-b-4 border-svss-saffron">
          <h1 className="font-bold text-base uppercase tracking-wide">
            Swami Vivekanand Sikshan Sansthan — First-Run Administrator Setup
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Create the primary Administrator account and verify school receipt configuration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div role="alert" className="p-3 rounded bg-red-50 border border-red-300 text-red-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="setup-username" className="block font-semibold text-slate-700 mb-1">
                Administrator Username *
              </label>
              <input
                id="setup-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. principal.admin"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-fullname" className="block font-semibold text-slate-700 mb-1">
                Administrator Full Name *
              </label>
              <input
                id="setup-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-email" className="block font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                id="setup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-phone" className="block font-semibold text-slate-700 mb-1">
                Staff Contact Number (Optional)
              </label>
              <input
                id="setup-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-password" className="block font-semibold text-slate-700 mb-1">
                Password (min 10 chars, upper/lower/digit) *
              </label>
              <input
                id="setup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-confirm-password" className="block font-semibold text-slate-700 mb-1">
                Confirm Password *
              </label>
              <input
                id="setup-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-address" className="block font-semibold text-slate-700 mb-1">
                School Address Line 1
              </label>
              <input
                id="setup-address"
                type="text"
                value={schoolAddressLine1}
                onChange={(e) => setSchoolAddressLine1(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="setup-prefix" className="block font-semibold text-slate-700 mb-1">
                Receipt Number Prefix
              </label>
              <input
                id="setup-prefix"
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2.5 rounded text-sm mt-2"
          >
            {isSubmitting ? 'Configuring Administrator Account...' : 'Complete Initial Setup & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
