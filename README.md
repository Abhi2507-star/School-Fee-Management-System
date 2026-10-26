# Swami Vivekanand Sikshan Sansthan — School Fee Management System (SFMS)

A complete, local-first, offline-capable School Fee Management System (LKG to Class 12) engineered for **Swami Vivekanand Sikshan Sansthan, Prayagraj**.

## Key Capabilities

1. **100% Local-First & Offline Architecture (`₹0/month` Hosting Cost)**:
   - Runs locally on the school's Windows workstation (`http://localhost:3000`) and across the school office LAN (`http://<school-pc-ip>:3000`).
   - Primary database is a local PostgreSQL 16 instance bound strictly to `127.0.0.1`.
   - Zero dependency on cloud databases, external authentication APIs, or paid SaaS services.
2. **Academic & Student Management (LKG to Class 12)**:
   - Supports multiple sections per class, stable student identities across academic sessions (`2025-26`, `2026-27`), promotions, transfers, withdrawals, readmissions, and a 9-tab student profile & ledger view.
3. **Configurable Fee Engine & Non-Destructive Versioning**:
   - 12 default configurable fee heads (Admission, Registration, Tuition, Annual, Examination, Computer, Laboratory, Transport, Library, Activity, Miscellaneous, Late Fee).
   - Supports Monthly, Quarterly, Half-Yearly, Annual, One-Time, and Custom installment schedules.
   - Modifying a fee structure creates a new version (`v2`, `v3`) without silently overwriting historical student charges.
   - Idempotent charge generation (`@@unique([enrollmentId, feeHeadId, feePeriodCode])`).
4. **Strict Accounting Ledger & Atomic Payment Collection**:
   - Outstanding balance is never stored as a freely editable field; it is always derived from `Valid Charges - Approved Concessions/Adjustments - Valid Cleared Payments Allocated`.
   - Every payment executes inside a `Serializable` PostgreSQL transaction with `SELECT ... FOR UPDATE` row locking on student charges, idempotency key validation, and server-side sequential receipt numbering (`SVSS/2026-27/000001`).
   - Supports Cash and UPI fee collection with atomic receipt generation (strictly blocks storage of card numbers, CVV, or PIN).
5. **Print-Ready A4 & 80mm Thermal Receipts + Offline ExcelJS Exports**:
   - Generates A4 and 80mm thermal receipts with Indian Rupee amount-in-words (`Lakhs`/`Crores`) and optional `REPRINT COPY` markers.
   - Exports all 7 required registers to `.xlsx` offline via `ExcelJS` with formula-injection sanitization.
6. **Maker-Checker Approvals, Database Triggers & Encrypted Backups**:
   - PostgreSQL triggers block `DELETE` on `payments`, `receipts`, and `audit_logs`.
   - Dual-control maker-checker workflows prevent a requester from approving their own reversal or refund.
   - Automated daily AES-256-GCM encrypted `pg_dump` backups to local disk and external USB drive.

## Repository Structure

```text
swami-vivekanand-fee-management/
├── apps/
│   ├── api/                 # Express + TypeScript + Prisma + PDFKit + ExcelJS Backend
│   └── web/                 # React 18 + Vite + TypeScript + Tailwind CSS Frontend
├── prisma/
│   ├── schema.prisma        # Canonical 20+ table PostgreSQL schema (NUMERIC(12,2))
│   ├── migrations/          # SQL migrations & financial immutability triggers
│   └── seed.ts              # Roles, RBAC permissions, LKG–Class 12, and Fee Heads
├── scripts/
│   ├── backup/              # AES-256-GCM encrypted pg_dump backup utility
│   ├── restore/             # SHA-256 checksum & database restoration verifier
│   └── windows/             # PowerShell startup, Windows service & scheduled tasks
├── tests/                   # Financial, RBAC security, offline & E2E test suites
└── docs/                    # Installation, User Guide, Backup/DR, Security & Troubleshooting
```
