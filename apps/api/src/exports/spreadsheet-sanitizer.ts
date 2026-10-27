/**
 * Spreadsheet Formula-Injection Sanitizer
 * Prefixes untrusted text cells starting with =, +, -, @, tab, or carriage return
 * with a leading single quote so Excel / Calc never evaluates them as formulas.
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function sanitizeSpreadsheetText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  if (str.length === 0) return '';
  if (FORMULA_TRIGGERS.has(str[0])) {
    return `'${str}`;
  }
  return str;
}
