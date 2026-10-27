import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { useAuth } from './useAuth';

export interface AcademicYearItem {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
}

interface AcademicSessionContextValue {
  academicYears: AcademicYearItem[];
  selectedAcademicYearId: string;
  selectedAcademicYear: AcademicYearItem | null;
  setSelectedAcademicYearId: (id: string) => void;
  isLoadingYears: boolean;
}

const AcademicSessionContext = createContext<AcademicSessionContextValue | undefined>(undefined);

export const AcademicSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedAcademicYearId, setSelectedAcademicYearIdState] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiRequest<{ academicYears: AcademicYearItem[] }>('/academic-years'),
    enabled: Boolean(user),
  });

  const academicYears = data?.academicYears || [];

  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const current = academicYears.find((y) => y.isCurrent) || academicYears[0];
      setSelectedAcademicYearIdState(current.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const selectedAcademicYear =
    academicYears.find((y) => y.id === selectedAcademicYearId) ||
    academicYears.find((y) => y.isCurrent) ||
    academicYears[0] ||
    null;

  return (
    <AcademicSessionContext.Provider
      value={{
        academicYears,
        selectedAcademicYearId: selectedAcademicYear?.id || selectedAcademicYearId,
        selectedAcademicYear,
        setSelectedAcademicYearId: setSelectedAcademicYearIdState,
        isLoadingYears: isLoading,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
};

export function useAcademicSession() {
  const ctx = useContext(AcademicSessionContext);
  if (!ctx) throw new Error('useAcademicSession must be used inside AcademicSessionProvider');
  return ctx;
}
