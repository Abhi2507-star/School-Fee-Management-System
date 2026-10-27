export function formatRupees(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatISTDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toPaiseInt(val: string | number | null | undefined): number {
  const s = String(val ?? '0').trim();
  const num = Number(s);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromPaiseInt(paise: number): string {
  const neg = paise < 0;
  const abs = Math.abs(Math.round(paise));
  return (neg ? '-' : '') + (abs / 100).toFixed(2);
}
