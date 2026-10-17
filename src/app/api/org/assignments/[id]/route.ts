import { backoffice } from "@/lib/backoffice";
import { handleError, json, readJson } from "@/lib/http";
import type { OrgRole } from "@/lib/memory";
import { billingToken as adminToken } from "../../../billing/_admin";
import { noStore } from "../../../mail/_session";

// `PATCH` / `DELETE /api/org/assignments/{id}` — an admin changes a place (role, unit) or removes it.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role, unit } = await readJson<{ role?: OrgRole; unit?: string }>(request);
    return noStore(json(await backoffice.updateAssignment(await adminToken(), (await params).id, { role, unit })));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return noStore(json(await backoffice.deleteAssignment(await adminToken(), (await params).id)));
  } catch (e) {
    return handleError(e);
  }
}
