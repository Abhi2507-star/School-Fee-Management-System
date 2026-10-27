# Backup & Disaster Recovery Procedure

## 1. Mandatory Encryption Configuration (`BACKUP_ENCRYPTION_KEY_HEX`)
- The backup utility (`scripts/backup/backup-db.js`) requires a valid 64-character hexadecimal AES-256 key (`32` bytes) in `BACKUP_ENCRYPTION_KEY_HEX`.
- **No Hardcoded Fallback**: If `BACKUP_ENCRYPTION_KEY_HEX` is missing, malformed, or set to a known weak/placeholder value, the backup script fails safely with a non-zero exit code (`1`) and refuses to write unencrypted or weakly encrypted student financial data.
- Generate a unique key on the school Windows computer using:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 2. Automated Local & External USB Backup Policy
- Every day at **05:30 PM IST**, Windows Task Scheduler runs `scripts/backup/backup-db.js`.
- The script runs `pg_dump`, compresses the SQL snapshot with GZIP, encrypts it with **AES-256-GCM**, writes a `.sha256` checksum file, verifies the written archive on disk by re-computing its SHA-256 hash and decrypting/decompressing the payload in memory, stores a copy in `D:\SVSS_Backups\Daily`, and mirrors a verified copy to the external USB drive (`E:\SVSS_External_Backups`).

## 3. Step-by-Step Disaster Recovery & Restoration
1. **Install or Repair PostgreSQL 16**: Ensure `postgresql-x64-16` is running and create an empty `svss_fee_db` database.
2. **Verify Backup Integrity**:
   ```powershell
   node scripts/restore/restore-db.js --verify-only --file "E:\SVSS_External_Backups\svss_fee_db_YYYY-MM-DD.sql.gz.enc"
   ```
3. **Restore the Encrypted Backup**:
   Decrypt and pipe into `psql` using `restore-db.js`, then restore your `.env` configuration.
4. **Verify Restored Ledger & Receipt Sequence**:
   - Check `/api/v1/health`.
   - Open the **Receipt Register** and confirm the last receipt number matches the last physical printed receipt before the backup timestamp.
