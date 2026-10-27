import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatRupees } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { useAcademicSession } from '../hooks/useAcademicSession';

interface StructureItemDraft {
  feeHeadId: string;
  amount: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | 'CUSTOM';
  dueDayOfMonth: number;
  onlyForNewAdmission: boolean;
  onlyForTransportUsers: boolean;
}

export const FeeStructuresPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { academicYears, selectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const queryClient = useQueryClient();

  // Fee Head creation state
  const [headCode, setHeadCode] = useState('');
  const [headName, setHeadName] = useState('');
  const [headFreq, setHeadFreq] = useState<'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL'>('MONTHLY');
  const [headOptional, setHeadOptional] = useState(false);
  const [isSavingHead, setIsSavingHead] = useState(false);

  // Fee Structure Create / Edit (Version) state (Problem 6)
  const [showStructForm, setShowStructForm] = useState(false);
  const [editingVersionBase, setEditingVersionBase] = useState<any | null>(null);
  const [structAcademicYearId, setStructAcademicYearId] = useState('');
  const [structClassId, setStructClassId] = useState('');
  const [structName, setStructName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [changeReason, setChangeReason] = useState('Initial fee structure configuration');
  const [items, setItems] = useState<StructureItemDraft[]>([]);
  const [isSavingStruct, setIsSavingStruct] = useState(false);

  // Idempotent Charge Generation state
  const [genClassId, setGenClassId] = useState('');
  const [isGeneratingCharges, setIsGeneratingCharges] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: headsData } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => apiRequest<any>('/fee-heads'),
  });
  const feeHeads = headsData?.feeHeads || [];

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiRequest<{ classes: any[] }>('/classes'),
  });
  const classes = classesData?.classes || [];

  const { data: structData, isLoading: isLoadingStructs } = useQuery({
    queryKey: ['fee-structures', selectedAcademicYearId],
    queryFn: () =>
      apiRequest<any>(
        `/fee-structures${selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : ''}`
      ),
  });
  const feeStructures = structData?.feeStructures || [];

  useEffect(() => {
    if (selectedAcademicYearId) {
      setStructAcademicYearId(selectedAcademicYearId);
    }
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (classes.length > 0 && !structClassId) {
      setStructClassId(classes[0].id);
      setGenClassId(classes[0].id);
    }
  }, [classes, structClassId]);

  const openNewStructureForm = () => {
    setEditingVersionBase(null);
    setStructAcademicYearId(selectedAcademicYearId || academicYears[0]?.id || '');
    const defaultClass = classes[0];
    setStructClassId(defaultClass?.id || '');
    setStructName(
      defaultClass
        ? `${defaultClass.name} Fee Structure (${selectedAcademicYear?.code || 'Current'})`
        : 'Class Fee Structure'
    );
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setChangeReason('Initial fee structure configuration');
    setItems(
      feeHeads.slice(0, 2).map((h: any) => ({
        feeHeadId: h.id,
        amount: '1500.00',
        frequency: h.defaultFrequency || 'MONTHLY',
        dueDayOfMonth: 10,
        onlyForNewAdmission: false,
        onlyForTransportUsers: false,
      }))
    );
    setErrorMsg('');
    setShowStructForm(true);
  };

  const openEditVersionForm = (fs: any) => {
    setEditingVersionBase(fs);
    setStructAcademicYearId(fs.academicYearId);
    setStructClassId(fs.classId);
    setStructName(fs.name);
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setChangeReason('');
    setItems(
      (fs.items || []).map((it: any) => ({
        feeHeadId: it.feeHeadId,
        amount: String(it.amount),
        frequency: it.frequency,
        dueDayOfMonth: Number(it.dueDayOfMonth || 10),
        onlyForNewAdmission: Boolean(it.onlyForNewAdmission),
        onlyForTransportUsers: Boolean(it.onlyForTransportUsers),
      }))
    );
    setErrorMsg('');
    setShowStructForm(true);
  };

  const handleAddHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingHead || !headCode.trim() || !headName.trim()) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsSavingHead(true);
    try {
      await apiRequest('/fee-heads', {
        method: 'POST',
        body: JSON.stringify({
          code: headCode.trim().toUpperCase(),
          name: headName.trim(),
          defaultFrequency: headFreq,
          isOptional: headOptional,
        }),
      });
      setHeadCode('');
      setHeadName('');
      setFeedbackMsg(`Created fee head "${headName.trim()}".`);
      await queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create fee head.');
    } finally {
      setIsSavingHead(false);
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingStruct) return;
    setErrorMsg('');
    setFeedbackMsg('');

    if (!structAcademicYearId || !structClassId || !structName.trim() || changeReason.trim().length < 5) {
      setErrorMsg('Academic session, class, structure name, and a reason (min 5 chars) are required.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add at least one fee head item to the structure.');
      return;
    }

    const seenHeads = new Set<string>();
    for (const item of items) {
      if (!item.feeHeadId || !/^\d+(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) <= 0) {
        setErrorMsg('Each fee item must have a valid fee head and a positive rupee amount.');
        return;
      }
      if (seenHeads.has(item.feeHeadId)) {
        setErrorMsg('Duplicate fee heads in the same structure are not allowed.');
        return;
      }
      seenHeads.add(item.feeHeadId);
    }

    const existingForClass = feeStructures.find(
      (f: any) => f.academicYearId === structAcademicYearId && f.classId === structClassId && f.isCurrentVersion
    );
    if (existingForClass) {
      const confirmed = window.confirm(
        `A fee structure (${existingForClass.name} v${existingForClass.version}) already exists for this class and session. Saving will create v${existingForClass.version + 1} for future charge generation while preserving all historical student charges. Continue?`
      );
      if (!confirmed) return;
    }

    setIsSavingStruct(true);
    try {
      const res = await apiRequest<any>('/fee-structures', {
        method: 'POST',
        body: JSON.stringify({
          academicYearId: structAcademicYearId,
          classId: structClassId,
          name: structName.trim(),
          effectiveFrom,
          changeReason: changeReason.trim(),
          items,
        }),
      });
      setShowStructForm(false);
      setFeedbackMsg(
        `Saved "${res.feeStructure.name}" (Version v${res.feeStructure.version}). Historical student charges remain untouched.`
      );
      await queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save fee structure.');
    } finally {
      setIsSavingStruct(false);
    }
  };

  const handleGenerateCharges = async () => {
    if (!selectedAcademicYearId || !genClassId || isGeneratingCharges) return;
    const clsName = classes.find((c: any) => c.id === genClassId)?.name || 'Selected Class';
    const confirmed = window.confirm(
      `Generate installment charges for ${clsName} in session ${selectedAcademicYear?.code || ''}? Existing charges for the same period will be skipped idempotently.`
    );
    if (!confirmed) return;

    setErrorMsg('');
    setFeedbackMsg('');
    setIsGeneratingCharges(true);
    try {
      const res = await apiRequest<{
        createdCount: number;
        skippedDuplicateCount: number;
        enrollmentsProcessed: number;
      }>('/student-charges/generate', {
        method: 'POST',
        body: JSON.stringify({
          academicYearId: selectedAcademicYearId,
          classId: genClassId,
        }),
      });
      setFeedbackMsg(
        `Charge generation complete for ${res.enrollmentsProcessed} student(s): ${res.createdCount} new charge(s) created, ${res.skippedDuplicateCount} existing charge(s) preserved without duplication.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate student charges.');
    } finally {
      setIsGeneratingCharges(false);
    }
  };

  return (
    <AdminLayout
      title={`Configurable Fee Heads & Versioned Class Fee Structures (${selectedAcademicYear?.code || 'All'})`}
      breadcrumbs={['Fee Engine', selectedAcademicYear?.code || 'Session']}
      actions={
        hasPermission('FEE_STRUCTURE_MANAGE') ? (
          <button
            type="button"
            onClick={openNewStructureForm}
            className="bg-svss-navy hover:bg-blue-900 text-white px-3.5 py-1.5 rounded text-xs font-bold"
          >
            + Create / Revise Fee Structure
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded text-xs font-medium">
            {feedbackMsg}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Create / Edit Versioned Fee Structure Form (Problem 6) */}
        {showStructForm && (
          <form onSubmit={handleSaveStructure} className="bg-white p-5 rounded border-2 border-svss-navy space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-svss-navy">
                {editingVersionBase
                  ? `Create New Version from ${editingVersionBase.name} (v${editingVersionBase.version} → v${editingVersionBase.version + 1})`
                  : 'Create Class Fee Structure'}
              </h3>
              <button
                type="button"
                onClick={() => setShowStructForm(false)}
                className="text-slate-500 hover:text-slate-800 font-semibold"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Academic Session *</label>
                <select
                  value={structAcademicYearId}
                  onChange={(e) => setStructAcademicYearId(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5 bg-white"
                >
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Class *</label>
                <select
                  value={structClassId}
                  onChange={(e) => setStructClassId(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5 bg-white"
                >
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Structure Name *</label>
                <input
                  type="text"
                  required
                  value={structName}
                  onChange={(e) => setStructName(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Effective From *</label>
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block font-semibold mb-1">
                  Configuration / Revision Reason (Recorded in Audit Log) *
                </label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain why this fee structure or revision is being created..."
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Fee Head Line Items</span>
                <button
                  type="button"
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        feeHeadId: feeHeads[0]?.id || '',
                        amount: '1000.00',
                        frequency: 'MONTHLY',
                        dueDayOfMonth: 10,
                        onlyForNewAdmission: false,
                        onlyForTransportUsers: false,
                      },
                    ])
                  }
                  className="text-svss-navy font-bold hover:underline"
                >
                  + Add Fee Item Row
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center bg-slate-50 p-2 rounded border">
                  <select
                    value={item.feeHeadId}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, feeHeadId: e.target.value };
                      setItems(next);
                    }}
                    className="border rounded px-2 py-1 bg-white"
                  >
                    {feeHeads.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={item.amount}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, amount: e.target.value };
                      setItems(next);
                    }}
                    placeholder="Amount (₹)"
                    className="border rounded px-2 py-1 font-mono"
                  />

                  <select
                    value={item.frequency}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, frequency: e.target.value as any };
                      setItems(next);
                    }}
                    className="border rounded px-2 py-1 bg-white"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="ONE_TIME">ONE_TIME</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={item.dueDayOfMonth}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, dueDayOfMonth: Number(e.target.value) };
                      setItems(next);
                    }}
                    className="border rounded px-2 py-1"
                    title="Due Day of Month (1-28)"
                  />

                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={item.onlyForNewAdmission}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...item, onlyForNewAdmission: e.target.checked };
                        setItems(next);
                      }}
                    />
                    <span>New Adm Only</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-red-600 font-semibold text-right px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="submit"
                disabled={isSavingStruct}
                className="bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white px-5 py-1.5 rounded font-bold"
              >
                {isSavingStruct ? 'Saving Structure...' : 'Confirm & Save Fee Structure Version'}
              </button>
            </div>
          </form>
        )}

        {/* Idempotent Charge Generator Bar */}
        {hasPermission('FEE_STRUCTURE_MANAGE') && (
          <div className="bg-white p-4 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-800">Idempotent Student Charge Generator</div>
              <div className="text-slate-500">
                Generates student charges for active enrollments in {selectedAcademicYear?.code || 'the selected session'} without duplicating existing periods.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={genClassId}
                onChange={(e) => setGenClassId(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium"
              >
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isGeneratingCharges}
                onClick={handleGenerateCharges}
                className="bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold"
              >
                {isGeneratingCharges ? 'Generating...' : 'Generate Class Charges'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Configured Fee Heads</h3>
            {hasPermission('FEE_STRUCTURE_MANAGE') && (
              <form onSubmit={handleAddHead} className="space-y-2 bg-slate-50 p-3 rounded border text-xs">
                <div className="font-semibold text-slate-700">Add New Fee Head</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={headCode}
                    onChange={(e) => setHeadCode(e.target.value)}
                    placeholder="Code (e.g. SPORTS)"
                    className="border rounded px-2 py-1 uppercase font-mono"
                  />
                  <input
                    type="text"
                    required
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="Name (e.g. Sports Fee)"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={headFreq}
                    onChange={(e) => setHeadFreq(e.target.value as any)}
                    className="border rounded px-2 py-1 bg-white"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="ONE_TIME">ONE_TIME</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={headOptional}
                      onChange={(e) => setHeadOptional(e.target.checked)}
                    />
                    <span>Optional</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isSavingHead}
                    className="bg-svss-navy text-white px-3 py-1 rounded font-semibold"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2 text-xs">
              {feeHeads.map((h: any) => (
                <div key={h.id} className="p-2 border border-slate-200 rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800">{h.name}</div>
                    <div className="text-slate-500">Code: {h.code} • {h.defaultFrequency}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    {h.isOptional ? 'Optional' : 'Core'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Versioned Class Fee Structures ({selectedAcademicYear?.code || 'All Sessions'})
            </h3>
            {isLoadingStructs ? (
              <div className="text-xs text-slate-500 py-4">Loading fee structures...</div>
            ) : feeStructures.length === 0 ? (
              <div className="text-xs text-slate-500 py-4">
                No fee structures configured for this session yet.
              </div>
            ) : (
              <div className="space-y-4">
                {feeStructures.map((fs: any) => (
                  <div key={fs.id} className="border border-slate-200 rounded p-3">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <div>
                        <span className="font-bold text-sm text-svss-navy">{fs.name}</span>
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-50 text-svss-navy font-semibold">
                          v{fs.version} {fs.isCurrentVersion ? '(Current)' : '(Historical)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Session: {fs.academicYear?.code}</span>
                        {hasPermission('FEE_STRUCTURE_MANAGE') && fs.isCurrentVersion && (
                          <button
                            type="button"
                            onClick={() => openEditVersionForm(fs)}
                            className="text-xs font-semibold text-svss-navy hover:underline"
                          >
                            Edit / Revise (v{fs.version + 1})
                          </button>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b">
                          <th className="py-1 text-left">Fee Head</th>
                          <th className="py-1 text-left">Frequency</th>
                          <th className="py-1 text-left">Due Day</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(fs.items || []).map((item: any) => (
                          <tr key={item.id} className="border-b border-slate-50">
                            <td className="py-1 font-medium">{item.feeHead?.name}</td>
                            <td className="py-1">{item.frequency}</td>
                            <td className="py-1">Day {item.dueDayOfMonth}</td>
                            <td className="py-1 text-right font-mono">{formatRupees(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
