// An expert's day-zero preparation (`_memoire/jour-zero.json`, written by the expert itself) and the
// readiness the page shows. Shared by the BFF and the expert header: no imports.

export const JOUR_ZERO_CHECK_IDS = ["outils", "competences", "entreprise", "charte", "canaux"] as const;
export type JourZeroCheckId = (typeof JOUR_ZERO_CHECK_IDS)[number];

export interface JourZeroCheck {
  id: JourZeroCheckId;
  label: string;
  ok: boolean;
  detail: string;
}

export interface JourZero {
  date: string | null;
  pret: boolean;
  checks: JourZeroCheck[];
  /** No file yet: the expert has not prepared. */
  absent?: true;
}

export const JOUR_ZERO_MAX_BYTES = 16 * 1024;
export const JOUR_ZERO_ABSENT: JourZero = { date: null, pret: false, checks: [], absent: true };

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v.trim() : null);

function parseCheck(raw: unknown): JourZeroCheck | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const label = text(c.label, 80);
  const detail = c.detail === undefined ? "" : text(c.detail, 400);
  if (!JOUR_ZERO_CHECK_IDS.includes(c.id as JourZeroCheckId) || !label || detail === null || typeof c.ok !== "boolean") return null;
  return { id: c.id as JourZeroCheckId, label, ok: c.ok, detail };
}

/** The file's text as a version-1 preparation; null when it is not one (a bad check alone is dropped). */
export function parseJourZero(body: string): JourZero | null {
  if (body.length > JOUR_ZERO_MAX_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 || typeof d.pret !== "boolean" || !Array.isArray(d.checks)) return null;
  const date = typeof d.date === "string" && !Number.isNaN(Date.parse(d.date)) ? d.date : null;
  const seen = new Set<string>();
  const checks = d.checks.slice(0, JOUR_ZERO_CHECK_IDS.length * 2).flatMap((raw) => {
    const c = parseCheck(raw);
    if (!c || seen.has(c.id)) return [];
    seen.add(c.id);
    return [c];
  });
  return { date, pret: d.pret, checks };
}

export type Readiness = { state: "ready" | "partial" | "absent"; label: string };

/** « Prêt », « Préparation 3/5 » or « Pas encore préparé ». */
export function readiness(jz: JourZero): Readiness {
  if (jz.absent || (!jz.pret && jz.checks.length === 0)) return { state: "absent", label: "Pas encore préparé" };
  const ok = jz.checks.filter((c) => c.ok).length;
  if (jz.pret && ok === jz.checks.length) return { state: "ready", label: "Prêt" };
  return { state: "partial", label: `Préparation ${ok}/${jz.checks.length || JOUR_ZERO_CHECK_IDS.length}` };
}
