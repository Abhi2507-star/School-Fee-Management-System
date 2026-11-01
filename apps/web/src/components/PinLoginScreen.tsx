import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { UserRole } from '../types';
import { apiRequest } from '../services/api';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle, School } from 'lucide-react';

interface PinLoginScreenProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const PinLoginScreen: React.FC<PinLoginScreenProps> = ({ onLoginSuccess }) => {
  const { lang, toggleLang, t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<UserRole>('COLLECTOR');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError('');
      if (next.length === 4) {
        verifyPin(next, selectedRole);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const verifyPin = async (testPin: string, role: UserRole) => {
    setIsVerifying(true);
    try {
      const res = await apiRequest<{ success: boolean; role: UserRole }>('/auth/pin', {
        method: 'POST',
        body: JSON.stringify({ pin: testPin }),
      });

      if (res.success && res.role === role) {
        onLoginSuccess(res.role);
      } else if (res.success && res.role !== role) {
        setError(
          lang === 'hi'
            ? `यह पिन ${res.role === 'ADMIN' ? 'Admin' : 'Collector'} का है। कृपया ऊपर सही टैब चुनें।`
            : `This PIN belongs to ${res.role}. Please select the matching role above.`
        );
        setPin('');
      } else {
        setError(lang === 'hi' ? 'गलत 4-अंकों का पिन दर्ज किया गया!' : 'Invalid 4-digit PIN!');
        setPin('');
      }
    } catch {
      // Local fallback for offline mode
      if (role === 'COLLECTOR' && testPin === '1111') {
        onLoginSuccess('COLLECTOR');
      } else if (role === 'ADMIN' && testPin === '9999') {
        onLoginSuccess('ADMIN');
      } else {
        setError(lang === 'hi' ? 'गलत पिन दर्ज किया गया!' : 'Invalid PIN entered!');
        setPin('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50/40 to-blue-50/50 flex flex-col justify-between p-4">
      {/* Top Bar with Language Toggle */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-md">
            <School size={22} />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-sm md:text-base leading-tight">
              {t('schoolName')}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {t('schoolSub')}
            </p>
          </div>
        </div>

        <button
          onClick={toggleLang}
          className="px-3.5 py-1.5 rounded-xl border-2 border-orange-600 bg-white hover:bg-orange-50 text-orange-700 font-extrabold text-xs shadow-sm transition transform active:scale-95 flex items-center gap-1.5"
        >
          <span>🌐</span>
          <span>{lang === 'hi' ? 'English' : 'हिंदी'}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-2 shadow-inner">
            <KeyRound size={26} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {t('pinTitle')}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'hi' ? 'कृपया अपनी भूमिका चुनें और 4 अंकों का पिन दर्ज करें' : 'Select your role and enter your 4-digit PIN'}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('COLLECTOR');
              setPin('');
              setError('');
            }}
            className={`py-3 px-2.5 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
              selectedRole === 'COLLECTOR'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck size={18} />
            <span>{t('collectorRole')}</span>
            <span className="text-[10px] font-normal opacity-90">(PIN: 1111)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('ADMIN');
              setPin('');
              setError('');
            }}
            className={`py-3 px-2.5 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
              selectedRole === 'ADMIN'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheck size={18} />
            <span>{t('adminRole')}</span>
            <span className="text-[10px] font-normal opacity-90">(PIN: 9999)</span>
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-4 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > i
                  ? selectedRole === 'COLLECTOR'
                    ? 'bg-orange-600 scale-125'
                    : 'bg-blue-800 scale-125'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 justify-center font-medium animate-shake">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Big Touch Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="py-3.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold rounded-2xl border border-slate-200 shadow-sm transition active:scale-95"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-2xl transition active:scale-95"
          >
            {lang === 'hi' ? 'साफ़ (Clear)' : 'Clear'}
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold rounded-2xl border border-slate-200 shadow-sm transition active:scale-95"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black rounded-2xl transition active:scale-95 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-3">
        © 2026 {t('schoolName')} — {t('tagline')}
      </footer>
    </div>
  );
};

