import { agent37, Agent37Error } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { scanTree } from "@/lib/deliverables";
import { assertInDrive, isDriveRoot } from "@/lib/drive";
import { ApiError, handleError, json } from "@/lib/http";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// An expert's folder three levels deep (subjects, deliverables, their sources and archives) in one
// call, for the Livrables tab. A folder that does not exist yet answers `tree: null`.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id);
    const path = assertInDrive(new URL(request.url).searchParams.get("path"));
    if (isDriveRoot(path)) throw new ApiError(400, "invalid_path", "Choisissez le dossier d’un expert");

    let first;
    try {
      first = await agent37.listFiles(id, path);
    } catch (e) {
      if (e instanceof Agent37Error && e.status === 404) return json({ tree: null, complete: true });
      throw e;
    }
    const root = { name: first.path.split("/").pop() ?? "", path: first.path, type: "directory" as const, size: null, modified: 0, hidden: false };
    const { tree, complete } = await scanTree(root, async (p) =>
      p === first.path ? first.entries : (await agent37.listFiles(id, p)).entries
    );
    return json({ tree, complete: complete && !first.truncated });
  } catch (e) {
    return handleError(e);
  }
}
