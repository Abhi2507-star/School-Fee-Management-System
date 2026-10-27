import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AcademicSessionProvider } from './hooks/useAcademicSession';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';
import { resolveRoleRouteAccess } from './utils/workflows';
import { LoginPage } from './pages/LoginPage';
import { InitialSetupPage } from './pages/InitialSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { FeeStructuresPage } from './pages/FeeStructuresPage';
import { PaymentCollectionPage } from './pages/PaymentCollectionPage';
import { ReceiptsRegisterPage } from './pages/ReceiptsRegisterPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsAndExportsPage } from './pages/ReportsAndExportsPage';
import { AdministrationPage } from './pages/AdministrationPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading, initialSetupRequired } = useAuth();
  const { lang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Never expose administrative menus or pages while authentication/role is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-sm font-medium">
        {t('loading')}
      </div>
    );
  }
  if (initialSetupRequired) {
    return <Navigate to="/setup" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const fullPath = `${location.pathname}${location.search || ''}`;
  const access = resolveRoleRouteAccess(fullPath, user.roles || []);

  if (!access.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div
          role="alert"
          className="max-w-md w-full bg-white p-6 rounded border-2 border-red-300 shadow-sm space-y-4 text-center"
        >
          <div className="text-base font-extrabold text-red-800">
            {lang === 'hi' ? 'अनुमति नहीं है (Access Denied)' : 'Access Denied'}
          </div>
          <p className="text-xs text-slate-700">
            {lang === 'hi' ? access.reasonHi : access.reasonEn}
          </p>
          <button
            type="button"
            onClick={() => navigate(access.redirectTo || '/', { replace: true })}
            className="bg-svss-navy hover:bg-blue-900 text-white px-4 py-2 rounded text-xs font-bold"
          >
            {lang === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएँ' : 'Return to Authorized Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AcademicSessionProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/setup" element={<InitialSetupPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/collect" element={<ProtectedRoute><PaymentCollectionPage /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
                <Route path="/students/:id" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
                <Route path="/fee-structures" element={<ProtectedRoute><FeeStructuresPage /></ProtectedRoute>} />
                <Route path="/receipts" element={<ProtectedRoute><ReceiptsRegisterPage /></ProtectedRoute>} />
                <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsAndExportsPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdministrationPage /></ProtectedRoute>} />
                <Route path="*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              </Routes>
            </BrowserRouter>
          </AcademicSessionProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
