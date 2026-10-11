import { backoffice } from "@/lib/backoffice";
import { handleError } from "@/lib/http";
import { mailToken as sessionToken } from "../../../../mail/_session";

export const maxDuration = 120;

// `GET /api/memory/items/{id}/file` — the document of a deposit, piped from the back office and
// always as a download. The back office refuses a member who does not read its compartment.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const upstream = await backoffice.memoryDocument(await sessionToken(), (await params).id);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
