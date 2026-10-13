import { readLogin, startLogin } from "../../_login";

// `POST|GET /api/llm/own/provider-login` — the signed-in user signs their own subscription in with
// a model provider, inside their instance, then asks where the approval stands. This is not the
// sign-in to this app.
export const POST = (request: Request) => startLogin(request, { kind: "own" });
export const GET = () => readLogin({ kind: "own" });
