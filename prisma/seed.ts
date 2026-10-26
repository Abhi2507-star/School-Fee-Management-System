/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Database Seed Script
 * Populates canonical roles, permissions, classes (LKG to Class 12), sections,
 * default 11 fee heads, and academic year 2026–27.
 * NOTE: Does NOT create a hardcoded production admin password. Initial administrator
 * credentials are created via the interactive CLI setup or First-Run Setup Wizard.
 * Synthetic student/fee seed data is loaded ONLY when SEED_DEV_SAMPLE=true.
 */
import { PrismaClient, RoleCode, FeeFrequency, LateFeeRuleType } from '@prisma/client';

const prisma = new PrismaClient();

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

export const ROLE_PERMISSION_MATRIX: Record<RoleCode, string[]> = {
  ADMINISTRATOR: CANONICAL_PERMISSIONS.map((p) => p.code),
  ACCOUNTANT: [
    'STUDENT_VIEW',
    'STUDENT_WRITE',
    'FEE_STRUCTURE_VIEW',
    'FEE_STRUCTURE_MANAGE',
    'CONCESSION_REQUEST',
    'PAYMENT_COLLECT',
    'RECEIPT_PRINT',
    'REVERSAL_REQUEST',
    'REPORTS_VIEW_DAILY',
    'REPORTS_VIEW_ALL',
    'REPORTS_EXPORT_EXCEL',
  ],
  CASHIER: [
    'STUDENT_VIEW',
    'FEE_STRUCTURE_VIEW',
    'PAYMENT_COLLECT',
    'RECEIPT_PRINT',
    'REPORTS_VIEW_DAILY',
  ],
  AUDITOR: [
    'STUDENT_VIEW',
    'FEE_STRUCTURE_VIEW',
    'RECEIPT_PRINT',
    'REPORTS_VIEW_DAILY',
    'REPORTS_VIEW_ALL',
    'REPORTS_EXPORT_EXCEL',
    'AUDIT_LOG_VIEW',
  ],
};

export const SCHOOL_CLASSES = [
  { code: 'LKG', name: 'LKG', displayOrder: 1, stream: 'Pre-Primary', sections: ['A', 'B'] },
  { code: 'UKG', name: 'UKG', displayOrder: 2, stream: 'Pre-Primary', sections: ['A', 'B'] },
  { code: 'CLASS_1', name: 'Class 1', displayOrder: 3, stream: 'Primary', sections: ['A', 'B'] },
  { code: 'CLASS_2', name: 'Class 2', displayOrder: 4, stream: 'Primary', sections: ['A', 'B'] },
  { code: 'CLASS_3', name: 'Class 3', displayOrder: 5, stream: 'Primary', sections: ['A', 'B'] },
  { code: 'CLASS_4', name: 'Class 4', displayOrder: 6, stream: 'Primary', sections: ['A', 'B'] },
  { code: 'CLASS_5', name: 'Class 5', displayOrder: 7, stream: 'Primary', sections: ['A', 'B'] },
  { code: 'CLASS_6', name: 'Class 6', displayOrder: 8, stream: 'Middle', sections: ['A', 'B'] },
  { code: 'CLASS_7', name: 'Class 7', displayOrder: 9, stream: 'Middle', sections: ['A', 'B'] },
  { code: 'CLASS_8', name: 'Class 8', displayOrder: 10, stream: 'Middle', sections: ['A', 'B'] },
  { code: 'CLASS_9', name: 'Class 9', displayOrder: 11, stream: 'Secondary', sections: ['A', 'B'] },
  { code: 'CLASS_10', name: 'Class 10', displayOrder: 12, stream: 'Secondary', sections: ['A', 'B'] },
  { code: 'CLASS_11', name: 'Class 11', displayOrder: 13, stream: 'Senior Secondary', sections: ['Science-A', 'Commerce-A', 'Arts-A'] },
  { code: 'CLASS_12', name: 'Class 12', displayOrder: 14, stream: 'Senior Secondary', sections: ['Science-A', 'Commerce-A', 'Arts-A'] },
];

export const DEFAULT_FEE_HEADS = [
  { code: 'ADMISSION', name: 'Admission Fee', defaultFrequency: FeeFrequency.ONE_TIME, isOptional: false, isRefundable: false, displayOrder: 1 },
  { code: 'REGISTRATION', name: 'Registration Fee', defaultFrequency: FeeFrequency.ONE_TIME, isOptional: false, isRefundable: false, displayOrder: 2 },
  { code: 'TUITION', name: 'Tuition Fee', defaultFrequency: FeeFrequency.MONTHLY, isOptional: false, isRefundable: false, displayOrder: 3 },
  { code: 'ANNUAL', name: 'Annual Fee', defaultFrequency: FeeFrequency.ANNUAL, isOptional: false, isRefundable: false, displayOrder: 4 },
  { code: 'EXAMINATION', name: 'Examination Fee', defaultFrequency: FeeFrequency.HALF_YEARLY, isOptional: false, isRefundable: false, displayOrder: 5 },
  { code: 'COMPUTER', name: 'Computer Fee', defaultFrequency: FeeFrequency.MONTHLY, isOptional: false, isRefundable: false, displayOrder: 6 },
  { code: 'LABORATORY', name: 'Laboratory Fee', defaultFrequency: FeeFrequency.MONTHLY, isOptional: true, isRefundable: false, displayOrder: 7 },
  { code: 'TRANSPORT', name: 'Transport Fee', defaultFrequency: FeeFrequency.MONTHLY, isOptional: true, isRefundable: false, displayOrder: 8 },
  { code: 'LIBRARY', name: 'Library Fee', defaultFrequency: FeeFrequency.QUARTERLY, isOptional: false, isRefundable: false, displayOrder: 9 },
  { code: 'ACTIVITY', name: 'Activity Fee', defaultFrequency: FeeFrequency.QUARTERLY, isOptional: false, isRefundable: false, displayOrder: 10 },
  { code: 'MISCELLANEOUS', name: 'Miscellaneous Fee', defaultFrequency: FeeFrequency.ONE_TIME, isOptional: true, isRefundable: false, displayOrder: 11 },
  { code: 'LATE_FEE', name: 'Late Payment Fine', defaultFrequency: FeeFrequency.ONE_TIME, isOptional: true, isRefundable: false, displayOrder: 12 },
];

async function main() {
  console.log('Seeding Swami Vivekanand Sikshan Sansthan baseline master records...');

  // 1. Ensure SchoolSettings singleton
  await prisma.schoolSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      schoolName: 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
      schoolSubtitle: 'Recognized Co-Educational English & Hindi Medium School (LKG to Class 12)',
      addressLine1: 'Haripur, Karaudi Kalan, Kadipur',
      addressLine2: 'Sultanpur, Uttar Pradesh 228161, India',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      pincode: '228161',
      primaryPhone: '+91-532-2400108',
      receiptPrefix: 'SVSS',
      timezone: 'Asia/Kolkata',
    },
  });

  // 2. Seed Permissions
  for (const perm of CANONICAL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
  }

  // 3. Seed Roles & Role-Permission mappings
  const roleDescriptions: Record<RoleCode, { name: string; description: string }> = {
    ADMINISTRATOR: {
      name: 'Admin',
      description: 'Full school fee management, student records, fee structures, approvals, reports, backups, and staff administration.',
    },
    CASHIER: {
      name: 'Fee Collector',
      description: 'Simplified everyday fee collection: search students, view fee ledger, collect payments, issue/reprint receipts, and view daily collection reports.',
    },
    ACCOUNTANT: {
      name: 'Fee Collector (Legacy Accountant Mapped)',
      description: 'Legacy role preserved for historical audit records; mapped to Fee Collector permissions unless promoted to Admin.',
    },
    AUDITOR: {
      name: 'Fee Collector (Legacy Auditor Mapped)',
      description: 'Legacy role preserved for historical audit records.',
    },
  };

  for (const roleCode of Object.keys(roleDescriptions) as RoleCode[]) {
    const info = roleDescriptions[roleCode];
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: { name: info.name, description: info.description },
      create: { code: roleCode, name: info.name, description: info.description, isSystemRole: true },
    });

    const allowedCodes = ROLE_PERMISSION_MATRIX[roleCode];
    const perms = await prisma.permission.findMany({ where: { code: { in: allowedCodes } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // 4. Seed Academic Years (2025-26 historical + 2026-27 current)
  await prisma.academicYear.upsert({
    where: { code: '2025-26' },
    update: {},
    create: {
      code: '2025-26',
      name: 'Academic Session 2025–26',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isCurrent: false,
      isActive: true,
    },
  });

  const currentYear = await prisma.academicYear.upsert({
    where: { code: '2026-27' },
    update: { isCurrent: true },
    create: {
      code: '2026-27',
      name: 'Academic Session 2026–27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
      isActive: true,
    },
  });

  await prisma.receiptSequence.upsert({
    where: { academicYearId_prefix: { academicYearId: currentYear.id, prefix: 'SVSS' } },
    update: {},
    create: { academicYearId: currentYear.id, prefix: 'SVSS', lastNumber: 0 },
  });

  // 5. Seed Classes (LKG to Class 12) and Multiple Sections per Class
  for (const cls of SCHOOL_CLASSES) {
    const createdClass = await prisma.schoolClass.upsert({
      where: { code: cls.code },
      update: { name: cls.name, displayOrder: cls.displayOrder, stream: cls.stream },
      create: { code: cls.code, name: cls.name, displayOrder: cls.displayOrder, stream: cls.stream, isActive: true },
    });

    for (let i = 0; i < cls.sections.length; i++) {
      const secName = cls.sections[i];
      await prisma.section.upsert({
        where: { classId_name: { classId: createdClass.id, name: secName } },
        update: {},
        create: {
          classId: createdClass.id,
          name: secName,
          capacity: 45,
          roomNumber: `${cls.displayOrder}0${i + 1}`,
          isActive: true,
        },
      });
    }
  }

  // 6. Seed Default Fee Heads
  for (const head of DEFAULT_FEE_HEADS) {
    await prisma.feeHead.upsert({
      where: { code: head.code },
      update: {
        name: head.name,
        defaultFrequency: head.defaultFrequency,
        isOptional: head.isOptional,
        isRefundable: head.isRefundable,
        displayOrder: head.displayOrder,
      },
      create: head,
    });
  }

  console.log('Master seed complete. Run initial administrator setup wizard on first launch.');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
