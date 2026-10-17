import { agent37 } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; responseId: string }> };

// Add a message to an in-flight turn (sent from the composer while the expert answers).
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id, responseId } = await params;
    await requireAgentAccess(id);
    const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 8000) return json({ error: { message: "Message vide ou trop long." } }, 400);

    return json(await agent37.steerResponse(id, responseId, text));
  } catch (e) {
    return handleError(e);
  }
}
