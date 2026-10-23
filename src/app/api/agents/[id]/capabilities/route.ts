import { agent37 } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// What this instance's runtime offers, so the workspace hides what it cannot serve. Without the
// runtime gateway every instance is Hermes: everything is offered.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id);
    const caps = await agent37.capabilities(id);
    return json({ runtime: caps?.runtime ?? "hermes", hermesTools: caps ? caps.capabilities.includes("hermesTools") : true });
  } catch (e) {
    return handleError(e);
  }
}
