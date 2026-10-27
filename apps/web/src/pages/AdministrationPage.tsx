import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatISTDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { formatRoleLabel } from '../utils/workflows';
import type { RoleCode } from '../types';

export const AdministrationPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // New Staff Account Form State
  const [staffUsername, setStaffUsername] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<RoleCode>('CASHIER');
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [resetPasswordByStaffId, setResetPasswordByStaffId] = useState<Record<string, string>>({});
  const [isResettingPasswordId, setIsResettingPasswordId] = useState<string | null>(null);
  const [displayNameByStaffId, setDisplayNameByStaffId] = useState<Record<string, string>>({});
  const [isUpdatingNameId, setIsUpdatingNameId] = useState<string | null>(null);

  // School Settings Form State
  const [schoolName, setSchoolName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [receiptPrefix, setReceiptPrefix] = useState('SVSS');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: staffData } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => apiRequest<{ staff: any[] }>('/auth/staff'),
    enabled: hasPermission('STAFF_MANAGE'),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => apiRequest<{ settings: any }>('/settings'),
  });

  const { data: backupsData } = useQuery({
    queryKey: ['admin-backups'],
    queryFn: () => apiRequest<{ encryptionConfigured: boolean; backups: any[] }>('/settings/backups'),
    enabled: hasPermission('BACKUP_MANAGE'),
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiRequest<{ auditLogs: any[] }>('/reports/audit-logs'),
    enabled: hasPermission('AUDIT_LOG_VIEW'),
  });

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setSchoolName(s.schoolName || 'SWAMI VIVEKANAND SIKSHAN SANSTHAN');
      setAddressLine1(s.addressLine1 || '');
      setPrimaryPhone(s.primaryPhone || '');
      setReceiptPrefix(s.receiptPrefix || 'SVSS');
    }
  }, [settingsData]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingStaff) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsSavingStaff(true);
    try {
      await apiRequest('/auth/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: staffUsername.trim(),
          fullName: staffFullName.trim(),
          email: staffEmail.trim() || undefined,
          phone: staffPhone.trim() || undefined,
          password: staffPassword,
          roleCode: staffRole,
        }),
      });
      setStaffUsername('');
      setStaffFullName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      setFeedbackMsg(`Created staff account "${staffUsername.trim()}" (${staffRole}).`);
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create staff account.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleUpdateStaffDisplayName = async (staffId: string, username: string) => {
    const nextName = (displayNameByStaffId[staffId] || '').trim();
    if (nextName.length < 2) {
      setErrorMsg('Display name must be at least 2 characters long.');
      return;
    }
    setErrorMsg('');
    setFeedbackMsg('');
    setIsUpdatingNameId(staffId);
    try {
      await apiRequest(`/auth/staff/${staffId}/display-name`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName: nextName }),
      });
      setDisplayNameByStaffId((prev) => ({ ...prev, [staffId]: '' }));
      setFeedbackMsg(`Updated display name for "${username}" to "${nextName}" without changing login credentials or historical receipts.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update display name.');
    } finally {
      setIsUpdatingNameId(null);
    }
  };

  const handleResetStaffPassword = async (staffId: string, username: string) => {
    const nextPassword = (resetPasswordByStaffId[staffId] || '').trim();
    if (nextPassword.length < 10) {
      setErrorMsg('New password must be at least 10 characters long.');
      return;
    }
    setErrorMsg('');
    setFeedbackMsg('');
    setIsResettingPasswordId(staffId);
    try {
      await apiRequest(`/auth/staff/${staffId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword: nextPassword }),
      });
      setResetPasswordByStaffId((prev) => ({ ...prev, [staffId]: '' }));
      setFeedbackMsg(`Password updated and active sessions revoked for "${username}".`);
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset staff password.');
    } finally {
      setIsResettingPasswordId(null);
    }
  };

  const handleToggleStaffStatus = async (staffId: string, nextActive: boolean) => {
    setErrorMsg('');
    setFeedbackMsg('');
    try {
      await apiRequest(`/auth/staff/${staffId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      setFeedbackMsg(`Staff account ${nextActive ? 'activated' : 'deactivated'}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update staff account status.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsSavingSettings(true);
    try {
      await apiRequest('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          addressLine1: addressLine1.trim(),
          primaryPhone: primaryPhone.trim(),
          receiptPrefix: receiptPrefix.trim().toUpperCase(),
        }),
      });
      setFeedbackMsg('Saved school settings and accounting policies.');
      await queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update school settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <AdminLayout title="School Administration, Staff Accounts, Backups & Audit Trail" breadcrumbs={['Administration']}>
      <div className="space-y-6 text-xs">
        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-medium">
            {feedbackMsg}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-800 rounded font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Account Management */}
          {hasPermission('STAFF_MANAGE') && (
            <div className="bg-white p-4 rounded border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
                Staff Accounts & Role-Based Access Control
              </h3>

              <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded border">
                <input
                  type="text"
                  required
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="Username (e.g. cashier.office)"
                  className="border rounded px-2.5 py-1.5"
                />
                <input
                  type="text"
                  required
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Full Name"
                  className="border rounded px-2.5 py-1.5"
                />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Password (min 10 chars)"
                  className="border rounded px-2.5 py-1.5"
                />
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as RoleCode)}
                  className="border rounded px-2.5 py-1.5 bg-white font-semibold"
                >
                  <option value="CASHIER">Fee Collector (फीस संग्रहकर्ता)</option>
                  <option value="ADMINISTRATOR">Admin (प्रशासक)</option>
                </select>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="md:col-span-2 bg-svss-navy hover:bg-blue-900 disabled:opacity-50 text-white py-1.5 rounded font-bold"
                >
                  {isSavingStaff ? 'Creating Staff Account...' : '+ Create Individual Staff Account'}
                </button>
              </form>

              <div className="space-y-2">
                {(staffData?.staff || []).map((st: any) => (
                  <div key={st.id} className="p-2.5 border rounded flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">
                        {st.fullName} ({st.username})
                      </div>
                      <div className="text-slate-500">
                        Role: {(st.roles || []).map((r: string) => formatRoleLabel(r)).join(', ')} • Status: {st.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={displayNameByStaffId[st.id] ?? ''}
                          onChange={(e) =>
                            setDisplayNameByStaffId((prev) => ({ ...prev, [st.id]: e.target.value }))
                          }
                          placeholder={`Update display name (${st.fullName})`}
                          className="border rounded px-2 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={isUpdatingNameId === st.id}
                          onClick={() => handleUpdateStaffDisplayName(st.id, st.username)}
                          className="bg-blue-900 hover:bg-blue-800 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                        >
                          {isUpdatingNameId === st.id ? 'Saving...' : 'Update Display Name'}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <input
                          type="password"
                          value={resetPasswordByStaffId[st.id] || ''}
                          onChange={(e) =>
                            setResetPasswordByStaffId((prev) => ({ ...prev, [st.id]: e.target.value }))
                          }
                          placeholder="New password (min 10 chars)"
                          className="border rounded px-2 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={isResettingPasswordId === st.id}
                          onClick={() => handleResetStaffPassword(st.id, st.username)}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                        >
                          {isResettingPasswordId === st.id ? 'Updating...' : 'Reset Password'}
                        </button>
                      </div>
                    </div>
                    {st.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(st.id, !st.isActive)}
                        className={`px-2.5 py-1 rounded font-semibold ${
                          st.isActive ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {st.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* School Configuration & Backup Status */}
          <div className="space-y-6">
            {hasPermission('SETTINGS_MANAGE') && (
              <form onSubmit={handleSaveSettings} className="bg-white p-4 rounded border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
                  School Identity & Receipt Policy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">School Name</label>
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Receipt Prefix</label>
                    <input
                      type="text"
                      required
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Address Line 1</label>
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Primary Phone</label>
                    <input
                      type="text"
                      required
                      value={primaryPhone}
                      onChange={(e) => setPrimaryPhone(e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold"
                >
                  {isSavingSettings ? 'Saving...' : 'Save School Settings'}
                </button>
              </form>
            )}

            {hasPermission('BACKUP_MANAGE') && (
              <div className="bg-white p-4 rounded border border-slate-200 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
                  Verified Local Encrypted Backups
                </h3>
                <div className="text-slate-600">
                  Encryption Key Configured:{' '}
                  <strong className={backupsData?.encryptionConfigured ? 'text-emerald-700' : 'text-red-700'}>
                    {backupsData?.encryptionConfigured ? 'Yes (64-hex AES-256-GCM)' : 'Missing / Invalid in .env'}
                  </strong>
                </div>
                {(backupsData?.backups || []).length === 0 ? (
                  <div className="text-slate-500 py-2">
                    No backup execution records logged yet. Run <code>npm run backup:now</code> on the host machine.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(backupsData?.backups || []).map((b: any) => (
                      <div key={b.id} className="p-2 border rounded flex justify-between">
                        <span className="font-mono">{b.backupFileName}</span>
                        <span className="font-semibold text-emerald-700">
                          {b.status} • {b.completedAt ? formatISTDate(b.completedAt) : 'In Progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Immutable Audit Log Viewer */}
        {hasPermission('AUDIT_LOG_VIEW') && (
          <div className="bg-white p-4 rounded border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Immutable Security & Financial Audit Logs</h3>
            <div className="space-y-2">
              {(auditData?.auditLogs || []).map((log: any) => (
                <div key={log.id} className="p-2.5 border border-slate-100 rounded flex justify-between">
                  <div>
                    <span className="font-bold text-svss-navy">[{log.action}]</span>{' '}
                    <span className="text-slate-800">{log.summary}</span>
                  </div>
                  <div className="text-slate-500 shrink-0 ml-4">
                    {log.actorUsername} ({log.actorRole}) • {formatISTDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
