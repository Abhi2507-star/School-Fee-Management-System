#!/usr/bin/env node
/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Encrypted Backup Verification & Restoration Utility
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { decryptBufferAes256Gcm, validateBackupEncryptionKey, isDirectExecution } from '../backup/backup-db.js';

export function verifyAndExtractBackup(encryptedFilePath, keyHex, expectedSha256) {
  validateBackupEncryptionKey(keyHex);
  const payload = fs.readFileSync(encryptedFilePath);
  const actualSha256 = crypto.createHash('sha256').update(payload).digest('hex');
  if (expectedSha256 && actualSha256 !== expectedSha256.trim()) {
    throw new Error(`Backup SHA-256 mismatch! Expected ${expectedSha256}, got ${actualSha256}`);
  }
  const compressed = decryptBufferAes256Gcm(payload, keyHex);
  const sqlText = zlib.gunzipSync(compressed).toString('utf8');
  return { actualSha256, sqlText };
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  try {
    const fileIdx = process.argv.indexOf('--file');
    const targetFile = fileIdx !== -1 ? process.argv[fileIdx + 1] : null;
    if (!targetFile) {
      throw new Error('Usage: node scripts/restore/restore-db.js --verify-only --file <path-to-backup.sql.gz.enc>');
    }
    const { actualSha256, sqlText } = verifyAndExtractBackup(
      targetFile,
      process.env.BACKUP_ENCRYPTION_KEY_HEX,
      null
    );
    console.log(`[RESTORE VERIFIED] Backup ${targetFile} is valid (SHA-256: ${actualSha256}, SQL size: ${sqlText.length} bytes).`);
  } catch (err) {
    console.error(`[RESTORE ERROR] ${err.message}`);
    process.exit(1);
  }
}
