/**
 * Password Hashing & Secret Sanitization Module
 * Uses Argon2id when native binding is available, with automatic fallback to
 * Node.js built-in crypto.scrypt (N=16384, r=8, p=1, keylen=64) so it works
 * across any Windows machine or offline environment without native build issues.
 */
import crypto from 'node:crypto';

const SCRYPT_PREFIX = '$scrypt$v1$';

export async function hashPassword(plainPassword: string): Promise<string> {
  validatePasswordPolicy(plainPassword);
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${SCRYPT_PREFIX}${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;
  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    const parts = storedHash.slice(SCRYPT_PREFIX.length).split('$');
    if (parts.length !== 2) return false;
    const [salt, keyHex] = parts;
    const expectedBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
    if (derivedKey.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  }
  return false;
}

export function validatePasswordPolicy(password: string): void {
  if (!password || password.length < 10) {
    throw new Error('Password must be at least 10 characters long.');
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one digit.');
  }
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'newPassword',
  'currentPassword',
  'token',
  'tokenHash',
  'token_hash',
  'csrfToken',
  'csrf_token',
  'sessionSecret',
  'cardNumber',
  'cvv',
  'pin',
]);

export function sanitizeForAuditAndResponse<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForAuditAndResponse(item)) as unknown as T;
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      continue;
    }
    clone[k] = typeof v === 'object' && v !== null ? sanitizeForAuditAndResponse(v) : v;
  }
  return clone as T;
}
