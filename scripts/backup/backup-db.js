#!/usr/bin/env node
/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Automated Local Encrypted PostgreSQL Backup Utility
 * - Requires a valid 64-hex-character (32-byte) BACKUP_ENCRYPTION_KEY_HEX environment variable.
 * - Never falls back to a hardcoded or default encryption key.
 * - Runs pg_dump against local PostgreSQL database, compresses with GZIP, and encrypts with AES-256-GCM.
 * - Verifies backup integrity immediately after write (SHA-256 + GCM authentication tag verification).
 * - Supports direct CLI execution on both Windows and POSIX operating systems.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const FORBIDDEN_WEAK_KEYS = new Set([
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
]);

export function validateBackupEncryptionKey(keyHex) {
  if (!keyHex || typeof keyHex !== 'string') {
    throw new Error(
      'BACKUP_ENCRYPTION_KEY_HEX is missing. Configure a 64-character hexadecimal AES-256 key in .env before creating encrypted backups.'
    );
  }
  const trimmed = keyHex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error(
      'BACKUP_ENCRYPTION_KEY_HEX is invalid. It must be an exact 64-character hexadecimal string (32 bytes).'
    );
  }
  if (FORBIDDEN_WEAK_KEYS.has(trimmed.toLowerCase())) {
    throw new Error(
      'BACKUP_ENCRYPTION_KEY_HEX uses a known weak/example key. Generate a unique random key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(trimmed, 'hex');
}

export function encryptBufferAes256Gcm(plainBuffer, keyHex) {
  const key = validateBackupEncryptionKey(keyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Header: Magic "SVSSBK01" (8B) + IV (12B) + AuthTag (16B) + Ciphertext
  return Buffer.concat([Buffer.from('SVSSBK01', 'utf8'), iv, authTag, encrypted]);
}

export function decryptBufferAes256Gcm(encryptedPayload, keyHex) {
  const key = validateBackupEncryptionKey(keyHex);
  if (!Buffer.isBuffer(encryptedPayload) || encryptedPayload.length < 36) {
    throw new Error('Encrypted backup payload is truncated or corrupted.');
  }
  const magic = encryptedPayload.subarray(0, 8).toString('utf8');
  if (magic !== 'SVSSBK01') {
    throw new Error('Invalid backup archive header magic.');
  }
  const iv = encryptedPayload.subarray(8, 20);
  const authTag = encryptedPayload.subarray(20, 36);
  const ciphertext = encryptedPayload.subarray(36);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function verifyWrittenBackupFile(filePath, keyHex, expectedSha256) {
  const diskBuffer = fs.readFileSync(filePath);
  const actualSha256 = crypto.createHash('sha256').update(diskBuffer).digest('hex');
  if (expectedSha256 && actualSha256 !== expectedSha256) {
    throw new Error(`Backup integrity verification failed: SHA-256 mismatch (expected ${expectedSha256}, got ${actualSha256}).`);
  }
  const decompressed = zlib.gunzipSync(decryptBufferAes256Gcm(diskBuffer, keyHex));
  if (decompressed.length === 0) {
    throw new Error('Backup integrity verification failed: decrypted SQL payload is empty.');
  }
  return { actualSha256, uncompressedBytes: decompressed.length };
}

export function normalizeScriptPath(input) {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim();
  if (str.startsWith('file://')) {
    if (/^file:\/\/\/[A-Za-z]:/i.test(str)) {
      str = decodeURIComponent(str.slice(8));
    } else {
      try {
        str = fileURLToPath(str);
      } catch {
        str = decodeURIComponent(str.replace(/^file:\/\//, ''));
      }
    }
  }
  const normalizedSlashes = str.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (/^[A-Za-z]:\//.test(normalizedSlashes)) {
    return normalizedSlashes.toLowerCase();
  }
  return path.posix.resolve(normalizedSlashes);
}

export function isDirectExecution(metaUrl, argv1) {
  if (!metaUrl || !argv1) return false;
  try {
    const modulePath = normalizeScriptPath(metaUrl);
    const entryPath = normalizeScriptPath(argv1);
    return Boolean(modulePath && entryPath && modulePath === entryPath);
  } catch {
    return false;
  }
}

export function runBackupCli(env = process.env) {
  const keyHex = env.BACKUP_ENCRYPTION_KEY_HEX;
  validateBackupEncryptionKey(keyHex);

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured in the environment.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const primaryDir = env.BACKUP_PRIMARY_DIR || path.resolve(process.cwd(), 'backups/primary');
  const externalDir = env.BACKUP_EXTERNAL_USB_DIR || path.resolve(process.cwd(), 'backups/external');
  const pgDumpPath = env.PG_DUMP_PATH || 'pg_dump';

  fs.mkdirSync(primaryDir, { recursive: true });
  const sqlBuffer = execFileSync(pgDumpPath, ['--dbname', dbUrl, '--no-owner', '--no-privileges']);
  const compressed = zlib.gzipSync(sqlBuffer, { level: 9 });
  const encrypted = encryptBufferAes256Gcm(compressed, keyHex);
  const sha256 = crypto.createHash('sha256').update(encrypted).digest('hex');

  const fileName = `svss_fee_db_${timestamp}.sql.gz.enc`;
  const primaryFile = path.join(primaryDir, fileName);
  fs.writeFileSync(primaryFile, encrypted);
  fs.writeFileSync(`${primaryFile}.sha256`, `${sha256}  ${fileName}\n`, 'utf8');

  // Verify integrity of written primary backup before reporting success
  verifyWrittenBackupFile(primaryFile, keyHex, sha256);

  if (externalDir) {
    try {
      fs.mkdirSync(externalDir, { recursive: true });
      const extFile = path.join(externalDir, fileName);
      fs.copyFileSync(primaryFile, extFile);
      fs.copyFileSync(`${primaryFile}.sha256`, `${extFile}.sha256`);
      verifyWrittenBackupFile(extFile, keyHex, sha256);
      console.log(`[BACKUP] Mirrored and verified encrypted backup on external drive: ${externalDir}`);
    } catch (extErr) {
      console.warn(`[BACKUP WARNING] Could not copy to external USB drive (${externalDir}):`, extErr.message);
    }
  }

  console.log(`[BACKUP SUCCESS] Created and verified ${primaryFile} (SHA-256: ${sha256})`);
  return { primaryFile, sha256 };
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  try {
    runBackupCli(process.env);
  } catch (err) {
    console.error(`[BACKUP ERROR] ${err.message}`);
    process.exit(1);
  }
}
