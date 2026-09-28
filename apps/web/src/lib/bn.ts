// ============================================================
// Path: apps/web/src/lib/bn.ts
// ============================================================

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

export const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const BN_WEEKDAYS_SHORT = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];

export function formatBnDate(iso: string): string {
  const d = new Date(iso);
  return `${toBnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBnDigits(d.getFullYear())}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${toBnDigits(minutes)} মিনিট`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${toBnDigits(h)} ঘণ্টা`;
  return `${toBnDigits(h)} ঘণ্টা ${toBnDigits(m)} মিনিট`;
}

export function formatMinutesShort(minutes: number): string {
  if (minutes < 60) return `${toBnDigits(minutes)}মি`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${toBnDigits(h)}ঘ` : `${toBnDigits(h)}ঘ ${toBnDigits(m)}মি`;
}

export function greetingBn(): string {
  const h = new Date().getHours();
  if (h < 12) return 'শুভ সকাল';
  if (h < 16) return 'শুভ দুপুর';
  if (h < 19) return 'শুভ বিকেল';
  if (h < 21) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

export function relativeBnTime(dateISO: string): string {
  const diff = Date.now() - new Date(dateISO).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'এখনই';
  if (mins < 60) return `${toBnDigits(mins)} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${toBnDigits(hrs)} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${toBnDigits(days)} দিন আগে`;
  return formatBnDate(dateISO);
}