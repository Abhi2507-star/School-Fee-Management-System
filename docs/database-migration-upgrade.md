# Database Migration and Version Upgrade Guide

## Canonical Schema Policy
- `prisma/schema.prisma` and `prisma/migrations/` are the single source of truth for the PostgreSQL schema.
- Monetary columns strictly use `NUMERIC(12, 2)`.
- Historical financial records (`payments`, `receipts`, `audit_logs`) are protected by PostgreSQL `BEFORE DELETE` triggers.

## Upgrading an Existing School Installation
1. **Run Encrypted Pre-Upgrade Backup**:
   ```powershell
   npm run backup:now
   ```
2. **Apply Pending Non-Destructive Migrations**:
   ```powershell
   npm run db:migrate:deploy
   npm run db:generate
   ```
3. **Rebuild and Restart**:
   ```powershell
   npm run build
   .\scripts\windows\start-prod.ps1
   ```
