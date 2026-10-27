# Troubleshooting & Database Upgrade Guide

## 1. Application Shows "DEGRADED / Local PostgreSQL Unreachable"
- Open Windows Services (`services.msc`), locate `postgresql-x64-16`, and click **Start**.
- Run `.\scripts\windows\start-prod.ps1` to verify `/api/v1/health` returns `HEALTHY`.

## 2. Safe Database Migration & Upgrade Process
1. Trigger an immediate encrypted backup: `npm run backup:now`.
2. Pull or extract the updated application release.
3. Run `npm run db:migrate:deploy` (never run `prisma migrate reset` on production).
4. Restart the service and verify `/api/v1/health`.
