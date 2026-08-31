/**
 * Activity types have colours in Auto Cal's GraphQL API, but the iCal feed the
 * calendar entities are built from does not carry them. Rather than make the
 * card do its own authenticated API calls, we derive a stable colour from the
 * activity name — and let the user pin exact colours via `activity_colors`.
 */

export type ColorOverrides = Record<string, string>;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0; // keep it a 32-bit int
  }
  return Math.abs(h);
}

/** A saturated mid-lightness hue — legible on both light and dark themes. */
export function colorForActivity(
  activity: string | null | undefined,
  overrides: ColorOverrides = {},
): string {
  if (!activity) return "var(--secondary-text-color)";

  for (const [name, color] of Object.entries(overrides)) {
    if (name.toLowerCase() === activity.toLowerCase()) return color;
  }

  return `hsl(${hash(activity.toLowerCase()) % 360}, 58%, 52%)`;
}
