# Local Windows Installation & First-Run Setup Guide

## 1. Hardware & Operating System Prerequisites
- **OS**: Windows 10 Pro / Windows 11 (64-bit) or Windows Server 2019/2022.
- **CPU & RAM**: Intel Core i3/i5 (or AMD Ryzen equivalent), minimum 8 GB RAM.
- **Storage**: 256 GB SSD + 1 dedicated external USB Flash/Hard Drive (mapped as `E:\`) for off-disk daily encrypted backups.
- **UPS**: Line-interactive UPS providing at least 20 minutes of battery backup for the school server PC.

## 2. Software Installation (Exact Versions)
1. **PostgreSQL 16.x (Windows x64 Installer)**:
   - Install as local Windows service (`postgresql-x64-16`), bound strictly to `127.0.0.1` on port `5432`.
   - Create database `svss_fee_db` and role `svss_app`:
     ```sql
     CREATE ROLE svss_app WITH LOGIN PASSWORD 'YOUR_STRONG_LOCAL_DB_PASSWORD';
     CREATE DATABASE svss_fee_db OWNER svss_app ENCODING 'UTF8';
     ```
2. **Node.js 20 LTS (or 18.20 LTS)**:
   - Verify with `node -v` and `npm -v`.

## 3. Application Configuration & Database Migration
1. Copy `.env.example` to `.env` in the repository root and set `DATABASE_URL`, `SESSION_SECRET`, `CSRF_SECRET`, and `BACKUP_ENCRYPTION_KEY_HEX`.
2. Install workspace dependencies and apply the canonical Prisma migrations:
   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:seed
   npm run build
   ```

## 4. Registering Automatic Windows Startup & Daily Backup Tasks
Run PowerShell as Administrator once:
```powershell
.\scripts\windows\install-windows-service.ps1
.\scripts\windows\register-backup-task.ps1
```

## 5. First-Run Administrator Credential Setup
Open `http://localhost:3000` in Microsoft Edge or Google Chrome. Complete the **Initial Administrator Setup** screen to create your personal Administrator username and password. There is no default production admin password.
