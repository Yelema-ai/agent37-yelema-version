import { instanceFetch } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { parseToolsFile, TOOLS_FILE_MAX_BYTES } from "@/lib/expert-tools";
import { ApiError, handleError, json } from "@/lib/http";
import { DEFAULT_PROFILE, resolveProfile } from "@/lib/profiles";
import { upstreamErrorMessage } from "../../../_helpers";

type Ctx = { params: Promise<{ id: string; profile: string }> };

const UNAVAILABLE = "La liste des outils de cet expert est indisponible pour l’instant. Réessayez dans un instant.";

// The tools an expert's pack recommends, read from its profile on the instance (outside the drive:
// the path is built here from a checked profile, never taken from the caller). No file = no list.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id, profile: raw } = await params;
    const { row } = await requireAgentAccess(id);
    const profile = await resolveProfile(row, raw);
    if (profile === DEFAULT_PROFILE) throw new ApiError(400, "invalid_request", "Expert inconnu");

    const path = `~/.hermes/profiles/${profile}/outils-recommandes.json`;
    const res = await instanceFetch(id, `/v1/files/content?path=${encodeURIComponent(path)}`);
    if (res.status === 404) {
      await res.body?.cancel().catch(() => undefined);
      return json({ outils: [] });
    }
    if (!res.ok) throw new ApiError(502, "tools_unavailable", await upstreamErrorMessage(res, "expert-tools", UNAVAILABLE));
    if (Number(res.headers.get("content-length") ?? 0) > TOOLS_FILE_MAX_BYTES) {
      await res.body?.cancel().catch(() => undefined);
      console.error(`[expert-tools] oversized file on ${id}/${profile}`);
      return json({ outils: [] });
    }

    const outils = parseToolsFile(await res.text());
    if (!outils) console.error(`[expert-tools] unreadable file on ${id}/${profile}`);
    return json({ outils: outils ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
