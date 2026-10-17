// Dates for a list: "il y a 3 heures", "dans 2 jours", and the full date beside it. No imports.

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];
const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function relativeFr(at: number, now = Date.now()): string {
  const diff = at - now;
  if (Math.abs(diff) < 60_000) return "à l’instant";
  const [unit, ms] = UNITS.find(([, ms]) => Math.abs(diff) >= ms)!;
  return relative.format(Math.round(diff / ms), unit);
}

// "16 oct. 2026, 09:00", in the routines' time zone (UTC, Abidjan's all year).
export function absoluteFr(at: number): string {
  return new Date(at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
