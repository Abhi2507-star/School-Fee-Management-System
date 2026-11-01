import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { apiRequest } from '../services/api';
import { KeyRound, Lock, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

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

    if (newAdminPin && newAdminPin !== confirmAdminPin) {
      setErrorMsg(lang === 'hi' ? 'नया एडमिन पिन और पुष्टि पिन मेल नहीं खा रहे हैं।' : 'New Admin PIN and confirmation do not match.');
      return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-none">
                {lang === 'hi' ? 'सुरक्षा एवं पिन सेटिंग' : 'Security & PIN Settings'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-none">
                {lang === 'hi' ? 'लॉगिन पासवर्ड / पिन बदलें' : 'Change Login PINs / Passwords'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-bold text-xs">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Admin PIN Verification */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-600" />
              <span>{lang === 'hi' ? '1. वर्तमान एडमिन पिन (Current Admin PIN)' : '1. Current Admin PIN'}</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              maxLength={8}
              value={currentAdminPin}
              onChange={(e) => setCurrentAdminPin(e.target.value)}
              placeholder={lang === 'hi' ? 'डिफ़ॉल्ट: 9999' : 'Default: 9999'}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[10px] text-slate-500">
              {lang === 'hi' ? '* सुरक्षा सत्यापन हेतु वर्तमान एडमिन पिन आवश्यक है।' : '* Required to verify authorization.'}
            </p>
          </div>

          {/* Section: Change Admin PIN */}
          <div className="border border-indigo-100 bg-indigo-50/40 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
              <KeyRound size={14} className="text-indigo-600" />
              <span>{lang === 'hi' ? '2. नया एडमिन पिन (New Admin PIN)' : '2. New Admin PIN'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  {lang === 'hi' ? 'नया पिन' : 'New PIN'}
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  placeholder="e.g. 8888"
                  className="w-full border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  {lang === 'hi' ? 'पिन पुष्टि' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={confirmAdminPin}
                  onChange={(e) => setConfirmAdminPin(e.target.value)}
                  placeholder="e.g. 8888"
                  className="w-full border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Change Fee Collector PIN */}
          <div className="border border-emerald-100 bg-emerald-50/40 p-3.5 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
              <KeyRound size={14} className="text-emerald-600" />
              <span>{lang === 'hi' ? '3. फीस जमाकर्ता पिन (Collector PIN)' : '3. Fee Collector PIN'}</span>
            </div>
            <input
              type="password"
              maxLength={8}
              value={newCollectorPin}
              onChange={(e) => setNewCollectorPin(e.target.value)}
              placeholder={lang === 'hi' ? 'नया कलेक्टर पिन (डिफ़ॉल्ट 1111 था)' : 'New Collector PIN (was 1111)'}
              className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-emerald-800">
              {lang === 'hi'
                ? '* केवल वही पिन बदलें जिसे बदलना चाहते हैं।'
                : '* Leave blank if you do not want to change it.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition"
            >
              {isLoading
                ? lang === 'hi' ? 'सेव हो रहा है...' : 'Saving...'
                : lang === 'hi' ? 'पासवर्ड सुरक्षित करें (Save)' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
