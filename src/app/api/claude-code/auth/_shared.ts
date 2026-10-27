import { BackofficeError } from "@/lib/backoffice";
import { claudeAuthRefusal } from "@/lib/claude-code-auth";
import { ApiError } from "@/lib/http";
import { settingsError } from "../../llm/_shared";

// Le membre visé par un administrateur (`?member=`), sinon soi-même ; le back-office vérifie le droit.
export function memberOf(request: Request): string | null {
  const member = new URL(request.url).searchParams.get("member");
  if (member !== null && !/^\d{1,12}$/.test(member)) throw new ApiError(404, "not_found", "Ce membre est introuvable.");
  return member;
}

export const claudeAuthError = (e: unknown) => settingsError(e, (code) => claudeAuthRefusal(code));
export const isNotClaudeCode = (e: unknown): boolean => e instanceof BackofficeError && e.code === "not_claude_code";
