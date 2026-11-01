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
  const [isLocked, setIsLocked] = useState(false);

  const handleDigit = (digit: string) => {
    if (isLocked || isVerifying) return;
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
    if (isLocked || isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (isLocked || isVerifying) return;
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
            ? `यह पिन ${res.role === 'ADMIN' ? 'प्रधानाचार्य / Admin' : 'फीस जमाकर्ता'} का है। कृपया ऊपर सही भूमिका चुनें।`
            : `This PIN belongs to ${res.role}. Please select the matching role above.`
        );
        setPin('');
      } else {
        setError(lang === 'hi' ? 'गलत पिन दर्ज किया गया!' : 'Invalid PIN entered!');
        setPin('');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'गलत पिन दर्ज किया गया!';
      setError(errorMsg);
      setPin('');
      if (err?.status === 429 || errorMsg.includes('लॉक') || errorMsg.includes('locked')) {
        setIsLocked(true);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-gradient-to-br from-slate-100 via-orange-50/30 to-blue-50/40 flex flex-col justify-between p-2 sm:p-3 overflow-hidden select-none">
      {/* Top Bar with Language Toggle */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-1 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="SVSS Logo"
            className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 shadow-xs border border-slate-200"
          />
          <div>
            <h1 className="font-black text-slate-900 text-xs sm:text-sm leading-tight">
              {t('schoolName')}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium leading-none">
              {t('schoolSub')}
            </p>
          </div>
        </div>

        <button
          onClick={toggleLang}
          className="px-2.5 py-1 rounded-lg border border-orange-500 bg-white hover:bg-orange-50 text-orange-700 font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1"
        >
          <span>🌐</span>
          <span>{lang === 'hi' ? 'English' : 'हिंदी'}</span>
        </button>
      </header>

      {/* Main Login Card - Compact & Guaranteed to fit on 768p and scaled screens */}
      <main className="max-w-[320px] w-full mx-auto my-auto bg-white rounded-xl shadow-md border border-slate-200/90 p-3.5 space-y-2.5">
        <div className="text-center space-y-0.5">
          <div className="inline-flex items-center justify-center gap-1.5 text-orange-600 font-black text-xs sm:text-sm">
            <KeyRound size={15} />
            <span>{t('pinTitle')}</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {lang === 'hi' ? 'भूमिका चुनें और 4 अंकों का पिन दर्ज करें' : 'Select role and enter 4-digit PIN'}
          </p>
        </div>

        {/* Role Selector Tabs - Clean, no duplicate labels */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('COLLECTOR');
              setPin('');
              setError('');
            }}
            className={`py-1.5 px-2 rounded-md transition flex flex-col items-center justify-center leading-tight ${
              selectedRole === 'COLLECTOR'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-1">
              <UserCheck size={14} />
              <span className="font-extrabold text-xs">{t('collectorRole')}</span>
            </div>
            <span className="text-[9px] opacity-75">{lang === 'hi' ? 'Fee Collector' : 'फीस जमाकर्ता'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('ADMIN');
              setPin('');
              setError('');
            }}
            className={`py-1.5 px-2 rounded-md transition flex flex-col items-center justify-center leading-tight ${
              selectedRole === 'ADMIN'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} />
              <span className="font-extrabold text-xs">{t('adminRole')}</span>
            </div>
            <span className="text-[9px] opacity-75">{lang === 'hi' ? 'Principal / Admin' : 'प्रधानाचार्य'}</span>
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-2.5 py-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                pin.length > i
                  ? selectedRole === 'COLLECTOR'
                    ? 'bg-orange-600 scale-110 ring-2 ring-orange-200'
                    : 'bg-blue-800 scale-110 ring-2 ring-blue-200'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-1.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-center gap-1 justify-center font-medium animate-shake">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad - Compact touch buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-10 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-base font-bold rounded-lg border border-slate-200 shadow-xs transition active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition active:scale-95 flex items-center justify-center"
          >
            {lang === 'hi' ? 'साफ़' : 'Clear'}
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-10 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-base font-bold rounded-lg border border-slate-200 shadow-xs transition active:scale-95 flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition active:scale-95 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-400 py-1 shrink-0">
        © 2026 {t('schoolName')} — {t('tagline')}
      </footer>
    </div>
  );
};

