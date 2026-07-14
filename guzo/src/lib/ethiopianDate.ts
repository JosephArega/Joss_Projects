import { Calendar, Lang } from '../types';

// Beyene–Kudlek algorithm; era = Amete Mihret (ዓ.ም.).
const ETHIOPIC_EPOCH_JDN = 1723856;

const ETH_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን',
];
const ETH_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];
const GC_MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const GC_MONTHS_AM = [
  'ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
  'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር',
];

function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

export interface EthDate {
  year: number;
  month: number; // 1–13 (13 = Pagume)
  day: number;
}

export function toEthiopian(date: Date): EthDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - ETHIOPIC_EPOCH_JDN) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - ETHIOPIC_EPOCH_JDN) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

export function formatDate(date: Date, calendar: Calendar, lang: Lang): string {
  if (calendar === 'ec') {
    const e = toEthiopian(date);
    const month = (lang === 'am' ? ETH_MONTHS_AM : ETH_MONTHS_EN)[e.month - 1];
    return `${month} ${e.day}, ${e.year} ${lang === 'am' ? 'ዓ.ም.' : 'E.C.'}`;
  }
  const month = (lang === 'am' ? GC_MONTHS_AM : GC_MONTHS_EN)[date.getMonth()];
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}
