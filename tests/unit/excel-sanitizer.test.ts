import { describe, it, expect } from 'vitest';
import { sanitizeSpreadsheetText } from '../../apps/api/src/exports/spreadsheet-sanitizer.js';

describe('Excel Formula Injection Sanitizer', () => {
  it('prefixes dangerous formula triggers with a single quote', () => {
    expect(sanitizeSpreadsheetText('=1+1')).toBe("'=1+1");
    expect(sanitizeSpreadsheetText('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(sanitizeSpreadsheetText('-400')).toBe("'-400");
    expect(sanitizeSpreadsheetText('@HYPERLINK("http://evil")')).toBe("'@HYPERLINK(\"http://evil\")");
    expect(sanitizeSpreadsheetText('\t=1+1')).toBe("'\t=1+1");
    expect(sanitizeSpreadsheetText('\r=1+1')).toBe("'\r=1+1");
    expect(sanitizeSpreadsheetText('Normal Student Name')).toBe('Normal Student Name');
    expect(sanitizeSpreadsheetText(null)).toBe('');
  });
});
