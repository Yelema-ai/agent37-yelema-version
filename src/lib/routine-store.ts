import "server-only";
import { claudeCron } from "@/lib/claude-cron";
import { hermesCron } from "@/lib/hermes-cron";
import { runtimeCapabilities } from "@/lib/runtime-capabilities";

export type RoutineStore = Pick<typeof hermesCron, "list" | "create" | "update" | "setEnabled" | "hermesName" | "remove" | "runNow">;

/** Where an instance keeps its routines: Hermes's own scheduler, or the experts' `jobs.json` under Claude Code. */
export async function routinesOf(agentId: string): Promise<RoutineStore> {
  const caps = await runtimeCapabilities(agentId);
  return caps?.capabilities.includes("routines") ? (claudeCron as RoutineStore) : hermesCron;
}
