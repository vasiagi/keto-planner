const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the civil week containing `iso`, as YYYY-MM-DD. */
export function mondayOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, delta);
}

export function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const a = Date.UTC(sy, sm - 1, sd);
  const b = Date.UTC(ey, em - 1, ed);
  return Math.round((b - a) / 86_400_000);
}

export function formatCivil(iso: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatWeekday(iso: string): string {
  return formatCivil(iso, { weekday: "long", month: "short", day: "numeric" });
}

export function formatShort(iso: string): string {
  return formatCivil(iso, { month: "short", day: "numeric" });
}

export function weekdayLabels(weekStart: string): { iso: string; label: string; offset: number }[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const iso = addDays(weekStart, offset);
    return {
      iso,
      offset,
      label: formatCivil(iso, { weekday: "short", month: "short", day: "numeric" }),
    };
  });
}
