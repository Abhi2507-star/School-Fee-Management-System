import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSION_MATRIX } from '../../prisma/seed.js';
import { sanitizeForAuditAndResponse } from '../../apps/api/src/security/password.js';

describe('Role-Based Access Control & Secret Redaction', () => {
  it('enforces strict role boundaries for Cashier and Auditor', () => {
    expect(ROLE_PERMISSION_MATRIX.CASHIER).toContain('PAYMENT_COLLECT');
    expect(ROLE_PERMISSION_MATRIX.CASHIER).not.toContain('REVERSAL_APPROVE');
    expect(ROLE_PERMISSION_MATRIX.CASHIER).not.toContain('FEE_STRUCTURE_MANAGE');
    expect(ROLE_PERMISSION_MATRIX.AUDITOR).not.toContain('PAYMENT_COLLECT');
    expect(ROLE_PERMISSION_MATRIX.AUDITOR).not.toContain('STUDENT_WRITE');
  });

  it('strips password hashes, CSRF tokens, and card numbers from responses and audit logs', () => {
    const raw = {
      id: 'u1',
      username: 'cashier1',
      passwordHash: '$scrypt$secret',
      tokenHash: '12345',
      cardNumber: '4111222233334444',
      cvv: '999',
    };
    const safe = sanitizeForAuditAndResponse(raw) as Record<string, unknown>;
    expect(safe.username).toBe('cashier1');
    expect(safe.passwordHash).toBeUndefined();
    expect(safe.tokenHash).toBeUndefined();
    expect(safe.cardNumber).toBeUndefined();
    expect(safe.cvv).toBeUndefined();
  });
});
