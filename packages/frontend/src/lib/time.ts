/** Time formatting helpers shared by the cards. */

export function formatClock(date: Date, locale?: string): string {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/** 0 → "0m", 95 min → "1h 35m", 3 days → "3d 4h". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

/** How far through `[start, end]` we are, clamped to 0…1. */
export function progressFraction(start: Date, end: Date, now: Date): number {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / span));
}

export function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
