import { readLogin, startLogin } from "../../../_login";

type Ctx = { params: Promise<{ memberId: string }> };

// `POST|GET /api/llm/members/{memberId}/provider-login` — an admin starts, for a member, the
// sign-in of a subscription inside that member's instance. The account's holder approves it.
export async function POST(request: Request, { params }: Ctx) {
  return startLogin(request, { kind: "member", id: (await params).memberId });
}

export async function GET(_request: Request, { params }: Ctx) {
  return readLogin({ kind: "member", id: (await params).memberId });
}
