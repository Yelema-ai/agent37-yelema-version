import { backoffice } from "@/lib/backoffice";
import { handleError, json } from "@/lib/http";
import { mailToken as sessionToken, noStore } from "../../mail/_session";

// `POST /api/workspace/logo` — the company's logo (multipart, field `file`), relayed as it came: the
// back office checks the caller is an admin, the file's real type and its size. `DELETE` removes it.
export async function POST(request: Request) {
  try {
    return noStore(json(await backoffice.uploadLogo(await sessionToken(), await request.formData())));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    return noStore(json(await backoffice.removeLogo(await sessionToken())));
  } catch (e) {
    return handleError(e);
  }
}
