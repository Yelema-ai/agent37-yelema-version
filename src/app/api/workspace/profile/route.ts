import { backoffice } from "@/lib/backoffice";
import { handleError, json } from "@/lib/http";
import { mailToken as sessionToken, noStore } from "../../mail/_session";

// `GET /api/workspace/profile` — where the company profile stands: logo, presentation, documents.
export async function GET() {
  try {
    return noStore(json(await backoffice.companyProfile(await sessionToken())));
  } catch (e) {
    return handleError(e);
  }
}
