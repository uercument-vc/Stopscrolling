import type { DateKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saate göre "YYYY-MM-DD". */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Haftanın pazartesisi (Türkiye'de hafta pazartesi başlar). */
export function startOfWeek(key: DateKey): DateKey {
  const date = fromDateKey(key);
  const offset = (date.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function weekDays(key: DateKey): DateKey[] {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const WEEKDAY_INITIALS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

/** "9 Kasım Pazartesi" */
export function formatLongDate(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${WEEKDAYS[date.getDay()]}`;
}

/** "Bugün", "Yarın", "12 Kasım" */
export function formatRelativeDay(key: DateKey, today: DateKey): string {
  if (key === today) return 'Bugün';
  if (key === addDays(today, 1)) return 'Yarın';
  if (key === addDays(today, -1)) return 'Dün';
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
