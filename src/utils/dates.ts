const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parsePortugueseDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${yearText}-${monthText}-${dayText}`;
}

export function formatPortugueseDate(isoDate: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(year, month - 1, day));
}

export function formatDateForInput(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function differenceInDays(fromIso: string, toDate = new Date()) {
  const [year, month, day] = fromIso.split('-').map(Number);
  const from = Date.UTC(year, month - 1, day);
  const to = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((to - from) / DAY_MS);
}

export function nextAnniversary(startIso: string, today = new Date()) {
  const [year, month, day] = startIso.split('-').map(Number);
  const thisYear = today.getFullYear();
  let date = new Date(thisYear, month - 1, day);

  if (date.getMonth() !== month - 1) {
    date = new Date(thisYear, month, 0);
  }
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    date = new Date(thisYear + 1, month - 1, day);
    if (date.getMonth() !== month - 1) {
      date = new Date(thisYear + 1, month, 0);
    }
  }

  return {
    date: toIsoDate(date),
    years: date.getFullYear() - year,
    daysRemaining: Math.max(0, differenceInDays(toIsoDate(today), date)),
  };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function monthDayOffset(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}
