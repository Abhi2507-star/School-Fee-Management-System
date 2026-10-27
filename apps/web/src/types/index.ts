export type RoleCode = 'ADMINISTRATOR' | 'ACCOUNTANT' | 'CASHIER' | 'AUDITOR';

export interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
}

export interface StudentRecord {
  id: string;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  guardianName: string;
  guardianRelationship: string;
  primaryContactNumber: string;
  secondaryContactNumber?: string;
  address: string;
  admissionDate: string;
  status: 'ACTIVE' | 'PROMOTED' | 'TRANSFERRED' | 'WITHDRAWN' | 'ALUMNI' | 'INACTIVE';
  usesTransport: boolean;
  transportRoute?: string;
  className: string;
  sectionName: string;
  academicYear: string;
}

export interface ChargeBalanceItem {
  chargeId: string;
  feeHeadCode: string;
  feeHeadName: string;
  feePeriodCode: string;
  feePeriodLabel: string;
  dueDate: string;
  originalAmount: string;
  concessionAmount: string;
  adjustmentAmount: string;
  netPayableAmount: string;
  clearedPaidAmount: string;
  outstandingAmount: string;
  derivedStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'CANCELLED';
  daysOverdue: number;
}
