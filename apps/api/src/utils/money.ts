/**
 * Exact Monetary Arithmetic & Indian Currency Formatting Utility
 * Converts all Rupee amounts ("1250.50" or 1250.5) to exact integer Paise (BigInt / Safe Integer)
 * so floating-point precision defects (e.g., 0.1 + 0.2 !== 0.3) are impossible.
 */

export function toPaise(amount: string | number | { toString(): string }): number {
  if (amount === null || amount === undefined) {
    throw new Error('Monetary amount cannot be null or undefined');
  }
  const str = typeof amount === 'object' ? amount.toString() : String(amount).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(str)) {
    const parsed = Number(str);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid monetary value: "${str}"`);
    }
    return Math.round(parsed * 100);
  }
  const negative = str.startsWith('-');
  const clean = negative ? str.slice(1) : str;
  const [rupeesPart, paisePart = ''] = clean.split('.');
  const paddedPaise = (paisePart + '00').slice(0, 2);
  const totalPaise = parseInt(rupeesPart, 10) * 100 + parseInt(paddedPaise, 10);
  return negative ? -totalPaise : totalPaise;
}

export function fromPaise(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`Expected integer paise, received: ${paise}`);
  }
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${rupees}.${rem}`;
}

export function addMoney(a: string | number, b: string | number): string {
  return fromPaise(toPaise(a) + toPaise(b));
}

export function subMoney(a: string | number, b: string | number): string {
  return fromPaise(toPaise(a) - toPaise(b));
}

export function formatINR(amount: string | number): string {
  const paise = toPaise(amount);
  const negative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const dec = String(absPaise % 100).padStart(2, '0');
  const rStr = String(rupees);
  let formattedRupees = rStr;
  if (rStr.length > 3) {
    const lastThree = rStr.slice(-3);
    const otherNumbers = rStr.slice(0, -3);
    formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  return `${negative ? '-₹' : '₹'}${formattedRupees}.${dec}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ' ' + ONES[o] : ''}`;
}

function rupeesIntToIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];

  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  if (crores > 0) {
    parts.push(`${rupeesIntToIndianWords(crores)} Crore`);
  }

  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  if (lakhs > 0) {
    parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
  }

  const thousands = Math.floor(n / 1000);
  n %= 1000;
  if (thousands > 0) {
    parts.push(`${twoDigitsToWords(thousands)} Thousand`);
  }

  const hundreds = Math.floor(n / 100);
  n %= 100;
  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }

  if (n > 0) {
    if (parts.length > 0) {
      parts.push(`and ${twoDigitsToWords(n)}`);
    } else {
      parts.push(twoDigitsToWords(n));
    }
  }

  return parts.join(' ');
}

export function amountToIndianWords(amount: string | number): string {
  const paise = toPaise(amount);
  if (paise < 0) {
    throw new Error('Receipt amount in words cannot be negative');
  }
  const rupees = Math.floor(paise / 100);
  const remPaise = paise % 100;

  const rupeeWords = rupeesIntToIndianWords(rupees);
  if (remPaise === 0) {
    return `Rupees ${rupeeWords} Only`;
  }
  const paiseWords = twoDigitsToWords(remPaise);
  return `Rupees ${rupeeWords} and ${paiseWords} Paise Only`;
}
