/** Jours fériés français (métropole) pour une année donnée. */
export function frenchHolidayDates(year: number): Set<string> {
  const easter = easterSunday(year);
  const dates = [
    iso(year, 1, 1),
    iso(year, 5, 1),
    iso(year, 5, 8),
    iso(year, 7, 14),
    iso(year, 8, 15),
    iso(year, 11, 1),
    iso(year, 11, 11),
    iso(year, 12, 25),
    addDays(easter, 1), // Lundi de Pâques
    addDays(easter, 39), // Ascension
    addDays(easter, 50) // Lundi de Pentecôte
  ];
  return new Set(dates);
}

export function isFrenchHoliday(isoDate: string): boolean {
  const year = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  return frenchHolidayDates(year).has(isoDate);
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Algorithme de Meeus/Jones/Butcher → dimanche de Pâques. */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}
