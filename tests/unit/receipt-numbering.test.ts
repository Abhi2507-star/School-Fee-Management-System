import { describe, it, expect } from 'vitest';
import { formatReceiptNumber, amountToIndianWords } from '../../apps/api/src/services/ledger-engine.js';

describe('Receipt Numbering & Indian Words Formatting', () => {
  it('generates sequential server-side receipt numbers with custom prefix', () => {
    expect(formatReceiptNumber('SVSS', '2026-27', 1)).toBe('SVSS/2026-27/000001');
    expect(formatReceiptNumber('SVSS-PRJ', '2026-27', 1054)).toBe('SVSS-PRJ/2026-27/001054');
  });

  it('converts rupee and paise amounts to Indian words accurately', () => {
    expect(amountToIndianWords('0.00')).toBe('Rupees Zero Only');
    expect(amountToIndianWords('6000.00')).toBe('Rupees Six Thousand Only');
    expect(amountToIndianWords('2000.00')).toBe('Rupees Two Thousand Only');
  });
});
