import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  validateBackupEncryptionKey,
  encryptBufferAes256Gcm,
  decryptBufferAes256Gcm,
  isDirectExecution,
} from '../../scripts/backup/backup-db.js';

describe('Backup Encryption & Direct Execution Validation (Problem 9)', () => {
  it('rejects missing, malformed, or weak hardcoded keys', () => {
    expect(() => validateBackupEncryptionKey(undefined)).toThrow(/missing/);
    expect(() => validateBackupEncryptionKey('invalid')).toThrow(/64-character hexadecimal/);
    expect(() =>
      validateBackupEncryptionKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    ).toThrow(/weak\/example key/);
  });

  it('encrypts and decrypts payloads with AES-256-GCM and detects Windows & POSIX direct execution', () => {
    const keyHex = crypto.randomBytes(32).toString('hex');
    const plain = Buffer.from('SELECT * FROM receipts;', 'utf8');
    const enc = encryptBufferAes256Gcm(plain, keyHex);
    const dec = decryptBufferAes256Gcm(enc, keyHex);
    expect(dec.toString('utf8')).toBe('SELECT * FROM receipts;');

    expect(
      isDirectExecution(
        'file:///C:/SVSS/scripts/backup/backup-db.js',
        'C:\\SVSS\\scripts\\backup\\backup-db.js'
      )
    ).toBe(true);
    expect(
      isDirectExecution(
        'file:///C:/SVSS/scripts/backup/backup-db.js',
        'C:\\SVSS\\scripts\\restore\\restore-db.js'
      )
    ).toBe(false);
  });
});
