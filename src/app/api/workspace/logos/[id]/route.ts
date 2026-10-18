import { backoffice } from "@/lib/backoffice";
import { handleError, json } from "@/lib/http";
import { mailToken as sessionToken, noStore } from "../../../mail/_session";

// `PATCH /api/workspace/logos/{id}` makes that image the main logo (the one in the bar);
// `DELETE` removes it. The back office decides which image takes over when the main one goes.
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return noStore(json(await backoffice.setMainLogo(await sessionToken(), (await params).id)));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return noStore(json(await backoffice.removeLogoImage(await sessionToken(), (await params).id)));
  } catch (e) {
    return handleError(e);
  }
}
