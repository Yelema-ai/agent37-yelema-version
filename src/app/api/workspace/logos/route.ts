import { backoffice } from "@/lib/backoffice";
import { handleError, json } from "@/lib/http";
import { logoChanged } from "../_principal";
import { mailToken as sessionToken, noStore } from "../../mail/_session";

// `POST /api/workspace/logos` — one more image of the company's logo (multipart, field `file`),
// relayed as it came: the back office checks the caller is an admin, the file's real type and size.
export async function POST(request: Request) {
  try {
    const t = await sessionToken();
    return noStore(json(await logoChanged(t, await backoffice.addLogo(t, await request.formData()))));
  } catch (e) {
    return handleError(e);
  }
}
