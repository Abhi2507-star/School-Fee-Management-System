import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StaffUser } from '../types';
import { apiRequest, setCsrfToken } from '../services/api';

export interface InitialAdminSetupPayload {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
  schoolAddressLine1?: string;
  primaryPhone?: string;
  receiptPrefix?: string;
}

export interface LoginResult {
  user: StaffUser;
  redirectTo: string;
  dashboardType: 'ADMIN_DASHBOARD' | 'FEE_COLLECTOR_DASHBOARD';
}

interface AuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  initialSetupRequired: boolean;
  sessionNotice: string;
  clearSessionNotice: () => void;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  setupInitialAdmin: (payload: InitialAdminSetupPayload) => Promise<void>;
  updateDisplayName: (fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [initialSetupRequired, setInitialSetupRequired] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');

  const clearSessionNotice = useCallback(() => setSessionNotice(''), []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const setupStatus = await apiRequest<{ initialSetupRequired: boolean }>('/auth/setup-status');
      setInitialSetupRequired(Boolean(setupStatus.initialSetupRequired));

      if (setupStatus.initialSetupRequired) {
        setUser(null);
        return;
      }

      const me = await apiRequest<{ user: StaffUser; csrfToken: string }>('/auth/me');
      setUser(me.user);
      setCsrfToken(me.csrfToken);
    } catch {
      setUser(null);
      setCsrfToken('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    const onSessionExpired = (ev: Event) => {
      const customEv = ev as CustomEvent<{ message?: string }>;
      setUser(null);
      setCsrfToken('');
      setSessionNotice(
        customEv.detail?.message ||
          'आपका सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें। (Your session has expired. Please sign in again.)'
      );
    };
    window.addEventListener('svss:session-expired', onSessionExpired);
    return () => window.removeEventListener('svss:session-expired', onSessionExpired);
  }, []);

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    setSessionNotice('');
    const res = await apiRequest<{
      user: StaffUser;
      csrfToken: string;
      redirectTo?: string;
      dashboardType?: 'ADMIN_DASHBOARD' | 'FEE_COLLECTOR_DASHBOARD';
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: identifier, identifier, password }),
    });
    setCsrfToken(res.csrfToken);
    const me = await apiRequest<{ user: StaffUser; csrfToken: string }>('/auth/me');
    setUser(me.user);
    setInitialSetupRequired(false);
    const isAdmin = me.user.roles.includes('ADMINISTRATOR');
    return {
      user: me.user,
      redirectTo: res.redirectTo || '/',
      dashboardType: res.dashboardType || (isAdmin ? 'ADMIN_DASHBOARD' : 'FEE_COLLECTOR_DASHBOARD'),
    };
  };

  const setupInitialAdmin = async (payload: InitialAdminSetupPayload) => {
    await apiRequest('/auth/setup-initial-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setInitialSetupRequired(false);
    await login(payload.username, payload.password);
  };

  const updateDisplayName = async (fullName: string) => {
    const res = await apiRequest<{ user: { fullName: string } }>('/auth/me/display-name', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: fullName.trim() }),
    });
    setUser((prev) => (prev ? { ...prev, fullName: res.user.fullName } : prev));
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setCsrfToken('');
    }
  };

  const hasPermission = (perm: string) => {
    if (!user) return false;
    return user.permissions.includes(perm) || user.roles.includes('ADMINISTRATOR');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialSetupRequired,
        sessionNotice,
        clearSessionNotice,
        login,
        setupInitialAdmin,
        updateDisplayName,
        logout,
        refreshAuth,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
