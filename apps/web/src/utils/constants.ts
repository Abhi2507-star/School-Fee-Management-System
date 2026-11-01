export interface FeeHeadDef {
  id: string;
  labelEn: string;
  labelHi: string;
  shortEn: string;
  shortHi: string;
  isExam?: boolean;
}

export const FEE_HEADS_LIST: FeeHeadDef[] = [
  { id: 'ADMISSION', labelEn: 'Admission Fee', labelHi: 'प्रवेश शुल्क', shortEn: 'Adm', shortHi: 'प्रवेश' },
  { id: 'APRIL', labelEn: 'April Fee', labelHi: 'अप्रैल माह', shortEn: 'Apr', shortHi: 'अप्रैल' },
  { id: 'MAY', labelEn: 'May Fee', labelHi: 'मई माह', shortEn: 'May', shortHi: 'मई' },
  { id: 'JUNE', labelEn: 'June Fee', labelHi: 'जून माह', shortEn: 'Jun', shortHi: 'जून' },
  { id: 'JULY', labelEn: 'July Fee', labelHi: 'जुलाई माह', shortEn: 'Jul', shortHi: 'जुलाई' },
  { id: 'AUGUST', labelEn: 'August Fee', labelHi: 'अगस्त माह', shortEn: 'Aug', shortHi: 'अगस्त' },
  { id: 'QUARTERLY_EXAM', labelEn: 'Quarterly Exam', labelHi: 'त्रैमासिक परीक्षा', shortEn: 'Exam-1', shortHi: 'त्रैमासिक', isExam: true },
  { id: 'SEPTEMBER', labelEn: 'September Fee', labelHi: 'सितम्बर माह', shortEn: 'Sep', shortHi: 'सितम्बर' },
  { id: 'OCTOBER', labelEn: 'October Fee', labelHi: 'अक्टूबर माह', shortEn: 'Oct', shortHi: 'अक्टूबर' },
  { id: 'NOVEMBER', labelEn: 'November Fee', labelHi: 'नवम्बर माह', shortEn: 'Nov', shortHi: 'नवम्बर' },
  { id: 'DECEMBER', labelEn: 'December Fee', labelHi: 'दिसम्बर माह', shortEn: 'Dec', shortHi: 'दिसम्बर' },
  { id: 'HALF_YEARLY_EXAM', labelEn: 'Half Yearly Exam', labelHi: 'अर्धवार्षिक परीक्षा', shortEn: 'Exam-2', shortHi: 'अर्धवार्षिक', isExam: true },
  { id: 'JANUARY', labelEn: 'January Fee', labelHi: 'जनवरी माह', shortEn: 'Jan', shortHi: 'जनवरी' },
  { id: 'FEBRUARY', labelEn: 'February Fee', labelHi: 'फरवरी माह', shortEn: 'Feb', shortHi: 'फरवरी' },
  { id: 'MARCH', labelEn: 'March Fee', labelHi: 'मार्च माह', shortEn: 'Mar', shortHi: 'मार्च' },
  { id: 'ANNUAL_EXAM', labelEn: 'Annual Exam', labelHi: 'वार्षिक परीक्षा', shortEn: 'Exam-3', shortHi: 'वार्षिक', isExam: true },
];

export const OLD_BALANCE_HEAD: FeeHeadDef = {
  id: 'OLD_BALANCE',
  labelEn: 'Previous Class Due',
  labelHi: 'पिछली कक्षा का बकाया',
  shortEn: 'Old Due',
  shortHi: 'पिछला बकाया',
};

export const ACADEMIC_MONTHS = [
  { id: 'APRIL', nameEn: 'April', nameHi: 'अप्रैल' },
  { id: 'MAY', nameEn: 'May', nameHi: 'मई' },
  { id: 'JUNE', nameEn: 'June', nameHi: 'जून' },
  { id: 'JULY', nameEn: 'July', nameHi: 'जुलाई' },
  { id: 'AUGUST', nameEn: 'August', nameHi: 'अगस्त' },
  { id: 'SEPTEMBER', nameEn: 'September', nameHi: 'सितम्बर' },
  { id: 'OCTOBER', nameEn: 'October', nameHi: 'अक्टूबर' },
  { id: 'NOVEMBER', nameEn: 'November', nameHi: 'नवम्बर' },
  { id: 'DECEMBER', nameEn: 'December', nameHi: 'दिसम्बर' },
  { id: 'JANUARY', nameEn: 'January', nameHi: 'जनवरी' },
  { id: 'FEBRUARY', nameEn: 'February', nameHi: 'फरवरी' },
  { id: 'MARCH', nameEn: 'March', nameHi: 'मार्च' },
];

export const COMMON_VILLAGES = [
  'Kammarpur',
  'Pahadpur Kalan',
  'Hinduabad',
  'Tahirpur',
  'Haripur',
  'Khalispur Gopalpur',
  'Amremau',
];

// ============================================================================
// STANDARDIZED CLASS LIST: LKG to Class 12 (14 classes)
// This is the SINGLE source of truth for class ordering across the entire app.
// Database values: "LKG", "UKG", "Class 1" ... "Class 12"
// ============================================================================
export const CLASSES_LIST = [
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

// Bilingual display labels for each class
export const CLASS_LABELS: Record<string, { hi: string; en: string; short: string }> = {
  'LKG':      { hi: 'एल.के.जी.',   en: 'LKG',       short: 'LKG' },
  'UKG':      { hi: 'यू.के.जी.',    en: 'UKG',       short: 'UKG' },
  'Class 1':  { hi: 'कक्षा 1',     en: 'Class 1',   short: '1st' },
  'Class 2':  { hi: 'कक्षा 2',     en: 'Class 2',   short: '2nd' },
  'Class 3':  { hi: 'कक्षा 3',     en: 'Class 3',   short: '3rd' },
  'Class 4':  { hi: 'कक्षा 4',     en: 'Class 4',   short: '4th' },
  'Class 5':  { hi: 'कक्षा 5',     en: 'Class 5',   short: '5th' },
  'Class 6':  { hi: 'कक्षा 6',     en: 'Class 6',   short: '6th' },
  'Class 7':  { hi: 'कक्षा 7',     en: 'Class 7',   short: '7th' },
  'Class 8':  { hi: 'कक्षा 8',     en: 'Class 8',   short: '8th' },
  'Class 9':  { hi: 'कक्षा 9',     en: 'Class 9',   short: '9th' },
  'Class 10': { hi: 'कक्षा 10',    en: 'Class 10',  short: '10th' },
  'Class 11': { hi: 'कक्षा 11',    en: 'Class 11',  short: '11th' },
  'Class 12': { hi: 'कक्षा 12',    en: 'Class 12',  short: '12th' },
};

/**
 * Returns the next class in the promotion sequence.
 * LKG → UKG → Class 1 → ... → Class 11 → Class 12 → GRADUATED
 * Returns null if already at the end (Class 12).
 */
export function getNextClass(currentClass: string): string | null {
  const idx = CLASSES_LIST.indexOf(currentClass);
  if (idx === -1) return null;
  if (idx === CLASSES_LIST.length - 1) return null; // Class 12 → Graduated (handled separately)
  return CLASSES_LIST[idx + 1];
}

/**
 * Returns bilingual display label for a class.
 */
export function getClassLabel(className: string, lang: 'hi' | 'en'): string {
  const label = CLASS_LABELS[className];
  if (!label) return className;
  return lang === 'hi' ? `${label.hi} (${label.en})` : label.en;
}

/**
 * Returns the short pill label for a class (e.g., "LKG", "1st", "10th").
 */
export function getClassShortLabel(className: string): string {
  return CLASS_LABELS[className]?.short || className;
}

export const SESSIONS_LIST = [
  '2026-27',
  '2027-28',
  '2025-26',
];

export function isHeadApplicableForJoinedMonth(headId: string, joinedMonth: string = 'APRIL'): boolean {
  if (headId === 'ADMISSION' || headId === 'OLD_BALANCE') return true;
  const monthIds = ACADEMIC_MONTHS.map((m) => m.id);
  const joinIdx = monthIds.indexOf((joinedMonth || 'APRIL').toUpperCase());
  if (joinIdx === -1) return true;

  const monthIdx = monthIds.indexOf(headId.toUpperCase());
  if (monthIdx !== -1) {
    return monthIdx >= joinIdx;
  }

  if (headId === 'QUARTERLY_EXAM') return joinIdx <= 4;
  if (headId === 'HALF_YEARLY_EXAM') return joinIdx <= 7;
  if (headId === 'ANNUAL_EXAM') return true;

  return true;
}

export function amountToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : 'and ' + inWords(n % 100));
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  return 'Rupees ' + inWords(Math.round(num)).trim() + ' Only';
}

export function formatDateIndian(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function generateWhatsAppDueMessage({
  studentName,
  fatherName,
  className,
  previousClassDue,
  currentClassDue,
  unpaidMonthsText,
  totalDue,
}: {
  studentName: string;
  fatherName: string;
  className: string;
  previousClassDue: number;
  currentClassDue: number;
  unpaidMonthsText: string;
  totalDue: number;
}): string {
  let msg = `नमस्कार, स्वामी विवेकानन्द शिक्षण संस्थान (Swami Vivekanand Sikshan Sansthan) से सूचना: आपके बच्चे ${studentName} (पिता: श्री ${fatherName}, कक्षा: ${className}) की फीस बकाया है।\n`;
  if (previousClassDue > 0) {
    msg += `• पिछली कक्षा का बकाया (Previous Class Due): ₹${previousClassDue}\n`;
  }
  msg += `• इस कक्षा का बकाया (Current Due - ${unpaidMonthsText || 'महीने की फीस'}): ₹${currentClassDue}\n`;
  msg += `• कुल बकाया राशि (Total Pending Fee): ₹${totalDue}\n`;
  msg += `कृपया विद्यालय में जल्द से जल्द फीस जमा कराने का कष्ट करें। धन्यवाद!`;
  return msg;
}

export function getWhatsAppDueUrl(mobile: string, message: string): string {
  const cleanPhone = (mobile || '').replace(/\D/g, '');
  const phoneWith91 = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return phoneWith91 ? `https://wa.me/${phoneWith91}?text=${encodeURIComponent(message)}` : '';
}
