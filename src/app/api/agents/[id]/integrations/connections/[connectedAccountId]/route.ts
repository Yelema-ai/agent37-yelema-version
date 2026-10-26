import { requireAgentAccess } from "@/lib/auth";
import { ApiError, handleError, json, readJson } from "@/lib/http";
import { integrations } from "@/lib/integrations";

type Ctx = { params: Promise<{ id: string; connectedAccountId: string }> };

// The id ends up in a URL called with a workspace-wide key: only its plain form is accepted.
function plainId(connectedAccountId: string | undefined): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(connectedAccountId ?? "")) throw new ApiError(400, "invalid_request", "Compte inconnu");
  return connectedAccountId as string;
}

// `{ label?, isDefault? }`: the member renames the account, or makes it the tool's default for the experts.
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id, connectedAccountId } = await params;
    const accountId = plainId(connectedAccountId);
    const { row } = await requireAgentAccess(id);
    const { label, isDefault } = await readJson<{ label?: unknown; isDefault?: unknown }>(request);
    const body: { label?: string | null; isDefault?: boolean } = {};
    if (label === null || typeof label === "string") body.label = label;
    if (typeof isDefault === "boolean") body.isDefault = isDefault;
    return json(await integrations.updateAccount(row, accountId, body));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id, connectedAccountId } = await params;
    plainId(connectedAccountId);

    const { row } = await requireAgentAccess(id);
    return json(await integrations.disconnect(row, connectedAccountId));
  } catch (e) {
    return handleError(e);
  }
}
