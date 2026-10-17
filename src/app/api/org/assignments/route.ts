import { backoffice } from "@/lib/backoffice";
import { handleError, json, readJson } from "@/lib/http";
import type { OrgAssignmentDraft } from "@/lib/memory";
import { billingToken as adminToken } from "../../billing/_admin";
import { noStore } from "../../mail/_session";

// `POST /api/org/assignments` — an admin places a member, or one of their experts, in a unit.
export async function POST(request: Request) {
  try {
    const { unit, member, profile, role } = await readJson<OrgAssignmentDraft>(request);
    return noStore(json(await backoffice.createAssignment(await adminToken(), { unit, member, profile, role })));
  } catch (e) {
    return handleError(e);
  }
}
