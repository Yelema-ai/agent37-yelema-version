// The `jobs.json` of a Claude Code expert as the Routines tab shows it. Pure: `node --test` runs it.
import { splitPrompt, summarize, type Routine } from "./routines.ts";

export type ClaudeJob = {
  id: string;
  name?: string | null;
  prompt: string;
  enabled: boolean;
  schedule: { kind: "cron"; expr: string } | { kind: "once"; run_at: string };
  run_requested_at?: string;
  [extra: string]: unknown;
};
export type JobRuns = Record<string, { lastRunAt?: string; ok?: boolean }>;
type Fields = { name: string; prompt: string; schedule: string };

const ISO = /^\d{4}-\d{2}-\d{2}T/;
const scheduleOf = (s: string): ClaudeJob["schedule"] => (ISO.test(s) ? { kind: "once", run_at: new Date(s).toISOString() } : { kind: "cron", expr: s.trim().split(/\s+/).join(" ") });

export function jobsToRoutines(jobs: ClaudeJob[], profile: string, expertName: string, runs: JobRuns): Routine[] {
  return jobs.map((j) => {
    const { task, skills, attachment } = splitPrompt(j.prompt ?? "");
    const lastRunAt = runs[`${profile}/${j.id}`]?.lastRunAt ?? null;
    return {
      id: j.id,
      name: (j.name ?? "").replace(` (${expertName})`, "").trim() || summarize(task),
      task,
      summary: summarize(task),
      skills,
      attachment,
      schedule: j.schedule.kind === "once" ? j.schedule.run_at : j.schedule.expr,
      enabled: j.enabled,
      // Shipped with the expert's pack, never turned on nor run: a suggestion.
      suggested: !j.enabled && !lastRunAt && j.created_by !== "app",
      lastRunAt,
      nextRunAt: j.enabled && j.schedule.kind === "once" ? j.schedule.run_at : null,
    };
  });
}

/** A new routine: an id from its name, unique among the expert's. */
export function newJob(fields: Fields, taken: Set<string>): ClaudeJob {
  const base = fields.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "routine";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return { id, name: fields.name, prompt: fields.prompt, enabled: true, schedule: scheduleOf(fields.schedule), created_by: "app" };
}

/** The form's fields over a job; a pending « run now » is kept, the rest of the pack's fields too. */
export function patchJob(job: ClaudeJob, fields: Fields): ClaudeJob {
  return { ...job, name: fields.name, prompt: fields.prompt, schedule: scheduleOf(fields.schedule) };
}
