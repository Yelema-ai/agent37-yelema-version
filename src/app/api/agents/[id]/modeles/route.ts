import { requireAgentAccess } from "@/lib/auth";
import { handleError, json, ApiError } from "@/lib/http";
import {
  getInstanceModelConfig,
  saveInstanceProviderKey,
  deleteInstanceProviderKey,
} from "@/lib/models";

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id, "member");

    const config = await getInstanceModelConfig(id);
    return json(config);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id, "member");

    const body = (await request.json().catch(() => ({}))) as {
      providerId?: string;
      apiKey?: string;
      oauthCode?: string;
      codeVerifier?: string;
      oauthToken?: string;
      authMethod?: "api_key" | "oauth";
      model?: string;
      baseUrl?: string;
      customName?: string;
      setActive?: boolean;
    };

    if (!body.providerId || typeof body.providerId !== "string") {
      throw new ApiError(400, "invalid_provider", "Le fournisseur de modèle est requis.");
    }

    await saveInstanceProviderKey(id, {
      providerId: body.providerId,
      apiKey: body.apiKey,
      oauthCode: body.oauthCode,
      codeVerifier: body.codeVerifier,
      oauthToken: body.oauthToken,
      authMethod: body.authMethod,
      model: body.model,
      baseUrl: body.baseUrl,
      customName: body.customName,
      setActive: body.setActive ?? true,
    });

    const updated = await getInstanceModelConfig(id);
    return json({ success: true, config: updated }, 200);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id, "member");

    const { searchParams } = new URL(request.url);
    let providerId = searchParams.get("providerId");
    if (!providerId) {
      const body = (await request.json().catch(() => ({}))) as { providerId?: string };
      providerId = body.providerId || null;
    }

    if (!providerId) {
      throw new ApiError(400, "invalid_request", "Le fournisseur à supprimer est requis.");
    }

    await deleteInstanceProviderKey(id, providerId);
    const updated = await getInstanceModelConfig(id);
    return json({ success: true, config: updated });
  } catch (e) {
    return handleError(e);
  }
}
