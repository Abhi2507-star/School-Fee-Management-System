/**
 * Canonical System Permissions for Swami Vivekanand SFMS
 * Centralized within API source to satisfy TypeScript rootDir constraints.
 */
export const CANONICAL_PERMISSIONS = [
  { code: 'STAFF_MANAGE', module: 'ADMIN', description: 'Create, update, lock/unlock, and deactivate staff accounts and roles' },
  { code: 'SETTINGS_MANAGE', module: 'ADMIN', description: 'Configure school identity, logo, receipt prefix, and accounting policies' },
  { code: 'ACADEMIC_MANAGE', module: 'ACADEMIC', description: 'Manage academic years, classes, sections, and promotions' },
  { code: 'STUDENT_VIEW', module: 'STUDENT', description: 'Search and view student profiles, academic history, and fee ledgers' },
  { code: 'STUDENT_WRITE', module: 'STUDENT', description: 'Register new students, edit profiles, and manage enrollments' },
  { code: 'FEE_STRUCTURE_VIEW', module: 'FEE', description: 'View fee heads, class fee structures, and installment schedules' },
  { code: 'FEE_STRUCTURE_MANAGE', module: 'FEE', description: 'Create/version fee structures, configure fee heads, and generate charges' },
  { code: 'CONCESSION_REQUEST', module: 'FEE', description: 'Submit student concession or late-fee waiver requests' },
  { code: 'CONCESSION_APPROVE', module: 'FEE', description: 'Approve or reject student concessions and late-fee waivers' },
  { code: 'PAYMENT_COLLECT', module: 'PAYMENT', description: 'Record Cash and UPI fee payments' },
  { code: 'RECEIPT_PRINT', module: 'RECEIPT', description: 'Generate, print, download PDF, and reprint official fee receipts' },
  { code: 'REVERSAL_REQUEST', module: 'CORRECTION', description: 'Submit payment reversal or refund requests with mandatory reason' },
  { code: 'REVERSAL_APPROVE', module: 'CORRECTION', description: 'Approve or reject payment reversals and refunds (maker-checker enforced)' },
  { code: 'REPORTS_VIEW_DAILY', module: 'REPORT', description: 'View permitted daily collection and cashier registers' },
  { code: 'REPORTS_VIEW_ALL', module: 'REPORT', description: 'View all 14 financial, outstanding, defaulter, and reconciliation reports' },
  { code: 'REPORTS_EXPORT_EXCEL', module: 'EXPORT', description: 'Export financial and student registers to Excel (.xlsx) and PDF' },
  { code: 'AUDIT_LOG_VIEW', module: 'AUDIT', description: 'Inspect immutable security and financial audit trail logs' },
  { code: 'BACKUP_MANAGE', module: 'BACKUP', description: 'Trigger local encrypted backups and verify restoration readiness' },
] as const;
