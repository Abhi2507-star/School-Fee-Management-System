/**
 * Server-Side Session & CSRF Token Utilities
 * Session tokens are random 32-byte values; only their SHA-256 hash is stored in PostgreSQL.
 */
import crypto from 'node:crypto';

export function generateSessionPair(): {
  rawSessionToken: string;
  tokenHash: string;
  csrfToken: string;
} {
  const rawSessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawSessionToken);
  const csrfToken = crypto.randomBytes(24).toString('hex');
  return { rawSessionToken, tokenHash, csrfToken };
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function verifyCsrfToken(expectedToken: string, providedToken?: string): boolean {
  if (!expectedToken || !providedToken) return false;
  const a = Buffer.from(expectedToken, 'utf8');
  const b = Buffer.from(providedToken, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
