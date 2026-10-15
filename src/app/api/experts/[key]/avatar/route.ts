import { backoffice } from "@/lib/backoffice";
import { expertLookRefusal } from "@/lib/expert-looks";
import { ApiError } from "@/lib/http";
import { noStore, settingsError, settingsToken } from "../../../llm/_shared";
import { relayedForm } from "./_form";

type Ctx = { params: Promise<{ key: string }> };

// `PUT /api/experts/{key}/avatar` — the expert's picture, for this member: a file (`file`) or a
// portrait the studio drew (`draftId`). `DELETE` goes back to the catalogue's.
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    const token = await settingsToken();
    const form = await relayedForm(request, ["draftId"], ["file"]);
    if (!form.has("file") && !form.has("draftId")) throw new ApiError(400, "bad_request", "Choisissez une image.");
    return noStore(await backoffice.setExpertAvatar(token, key, form));
  } catch (e) {
    return settingsError(e, expertLookRefusal);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    return noStore(await backoffice.resetExpertAvatar(await settingsToken(), key));
  } catch (e) {
    return settingsError(e, expertLookRefusal);
  }
}
