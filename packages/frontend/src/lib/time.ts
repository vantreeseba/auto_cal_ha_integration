/** Time formatting helpers shared by the cards. */

/** Guards against `new Date("…")` having failed on a stricter parser. */
export function isValidDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatClock(date: Date, locale?: string): string {
  if (!isValidDate(date)) return "--:--";
  try {
    return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  } catch {
    // WebViews built without full ICU throw on locales/options rather than
    // falling back, so format by hand instead of losing the whole render.
    return `${date.getHours()}:${pad(date.getMinutes())}`;
  }
}

/** 0 → "0m", 95 min → "1h 35m", 3 days → "3d 4h". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "0m";
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
  const elapsed = now.getTime() - start.getTime();
  if (!Number.isFinite(span) || !Number.isFinite(elapsed) || span <= 0) return 1;
  return Math.min(1, Math.max(0, elapsed / span));
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
