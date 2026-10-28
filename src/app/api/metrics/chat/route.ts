import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { isTimingRecord } from "@/lib/chat-timing";

// How long one chat turn took, sent by the browser when it ends (lib/chat-timing). One line in the
// host's logs, for Yelema's team to read where the wait goes; nothing kept here, nothing of what
// was said. Signed-in members only, and a record of the expected shape only.
export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const body = await request.json().catch(() => null);
    if (!isTimingRecord(body)) return new Response(null, { status: 400 });
    console.info(`[latence] ${JSON.stringify({ ...body, user: user.id })}`);
    return new Response(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
