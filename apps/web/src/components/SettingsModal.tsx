import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { apiRequest } from '../services/api';
import { KeyRound, Lock, CheckCircle2, AlertCircle, X, ShieldAlert, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();

  const [currentAdminPin, setCurrentAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');
  const [newCollectorPin, setNewCollectorPin] = useState('');

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showCollectorPin, setShowCollectorPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!currentAdminPin.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया वर्तमान एडमिन पिन दर्ज करें।' : 'Please enter current Admin PIN.');
      return;
    }

    if (newAdminPin) {
      if (newAdminPin.trim().length < 4) {
        setErrorMsg(lang === 'hi' ? 'नया एडमिन पिन कम से कम 4 अंकों का होना चाहिए।' : 'New Admin PIN must be at least 4 digits.');
        return;
      }
      if (newAdminPin !== confirmAdminPin) {
        setErrorMsg(lang === 'hi' ? 'नया एडमिन पिन और पुष्टि पिन मेल नहीं खा रहे हैं।' : 'New Admin PIN and confirmation do not match.');
        return;
      }
    }

    if (newCollectorPin) {
      if (newCollectorPin.trim().length < 4) {
        setErrorMsg(lang === 'hi' ? 'नया कलेक्टर पिन कम से कम 4 अंकों का होना चाहिए।' : 'New Collector PIN must be at least 4 digits.');
        return;
      }
    }

    if (!newAdminPin && !newCollectorPin) {
      setErrorMsg(lang === 'hi' ? 'कृपया बदलने के लिए नया एडमिन या कलेक्टर पिन दर्ज करें।' : 'Please enter a new Admin or Collector PIN to change.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/settings/pins', {
        method: 'POST',
        body: JSON.stringify({
          current_admin_pin: currentAdminPin.trim(),
          new_admin_pin: newAdminPin.trim() || undefined,
          new_collector_pin: newCollectorPin.trim() || undefined,
        }),
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setCurrentAdminPin('');
        setNewAdminPin('');
        setConfirmAdminPin('');
        setNewCollectorPin('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating PINs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-xs">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight leading-none">
                {lang === 'hi' ? 'सुरक्षा एवं पिन सेटिंग' : 'Security & PIN Settings'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                {lang === 'hi' ? 'लॉगिन पासवर्ड / पिन बदलें' : 'Change Login PINs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-3.5 sm:p-4 space-y-3">
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 font-bold text-xs">
              <AlertCircle size={15} className="text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Admin PIN Verification */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
            <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-amber-600" />
                <span>{lang === 'hi' ? '1. वर्तमान एडमिन पिन' : '1. Current Admin PIN'}</span>
                <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
              >
                {showCurrentPin ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showCurrentPin ? (lang === 'hi' ? 'छुपाएं' : 'Hide') : (lang === 'hi' ? 'देखें' : 'Show')}</span>
              </button>
            </label>
            <input
              type={showCurrentPin ? 'text' : 'password'}
              required
              maxLength={8}
              value={currentAdminPin}
              onChange={(e) => setCurrentAdminPin(e.target.value)}
              placeholder={lang === 'hi' ? 'वर्तमान एडमिन पिन दर्ज करें' : 'Enter current PIN'}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[10px] text-slate-500">
              {lang === 'hi' ? '* प्राधिकरण हेतु वर्तमान एडमिन पिन दर्ज करें।' : '* Required for authorization.'}
            </p>
          </div>

          {/* Section: Change Admin PIN */}
          <div className="border border-indigo-100 bg-indigo-50/40 p-2.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-indigo-950">
              <div className="flex items-center gap-1.5">
                <KeyRound size={13} className="text-indigo-600" />
                <span>{lang === 'hi' ? '2. नया एडमिन पिन' : '2. New Admin PIN'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="text-[10px] text-indigo-600 hover:text-indigo-900 flex items-center gap-0.5"
              >
                {showNewPin ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showNewPin ? (lang === 'hi' ? 'छुपाएं' : 'Hide') : (lang === 'hi' ? 'देखें' : 'Show')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  {lang === 'hi' ? 'नया पिन' : 'New PIN'}
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  maxLength={8}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  placeholder="e.g. 9999"
                  className="w-full border border-indigo-200 rounded-lg px-2 py-1 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  {lang === 'hi' ? 'पिन पुष्टि' : 'Confirm'}
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  maxLength={8}
                  value={confirmAdminPin}
                  onChange={(e) => setConfirmAdminPin(e.target.value)}
                  placeholder="e.g. 9999"
                  className="w-full border border-indigo-200 rounded-lg px-2 py-1 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Change Fee Collector PIN */}
          <div className="border border-emerald-100 bg-emerald-50/40 p-2.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-black text-emerald-950">
              <div className="flex items-center gap-1.5">
                <KeyRound size={13} className="text-emerald-600" />
                <span>{lang === 'hi' ? '3. नया कलेक्टर पिन' : '3. Collector PIN'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectorPin(!showCollectorPin)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
              >
                {showCollectorPin ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showCollectorPin ? (lang === 'hi' ? 'छुपाएं' : 'Hide') : (lang === 'hi' ? 'देखें' : 'Show')}</span>
              </button>
            </div>
            <input
              type={showCollectorPin ? 'text' : 'password'}
              maxLength={8}
              value={newCollectorPin}
              onChange={(e) => setNewCollectorPin(e.target.value)}
              placeholder={lang === 'hi' ? 'नया कलेक्टर पिन (वैकल्पिक)' : 'Enter new Collector PIN'}
              className="w-full border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-emerald-800">
              {lang === 'hi'
                ? '* केवल वही पिन भरें जिसे बदलना हो (कम से कम 4 अंक)।'
                : '* Leave blank if unchanged (min 4 digits).'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-xs transition"
            >
              {isLoading
                ? lang === 'hi' ? 'सेव हो रहा है...' : 'Saving...'
                : lang === 'hi' ? 'सुरक्षित करें' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

