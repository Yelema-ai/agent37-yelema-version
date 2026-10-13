import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { mcpError, noStore, settingsToken } from "../_shared";

// `PUT /api/mcp/settings` — an admin lets the members add their own tool servers, or stops it.
export async function PUT(request: Request) {
  try {
    const { membersMayAddMcp } = await readJson<{ membersMayAddMcp?: unknown }>(request);
    if (typeof membersMayAddMcp !== "boolean") throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
    return noStore(await backoffice.setMcpSettings(await settingsToken(), { membersMayAddMcp }));
  } catch (e) {
    return mcpError(e);
  }
}
