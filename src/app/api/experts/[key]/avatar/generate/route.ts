import { backoffice } from "@/lib/backoffice";
import { expertLookRefusal } from "@/lib/expert-looks";
import { noStore, settingsError, settingsToken } from "../../../../llm/_shared";
import { relayedForm } from "../_form";

type Ctx = { params: Promise<{ key: string }> };

// The image model takes up to a minute.
export const maxDuration = 120;

// `POST /api/experts/{key}/avatar/generate` — a portrait drawn from the expert's face (or from a
// `reference` photo), in the pose, outfit, accessory and background chosen. The answer is a draft:
// it becomes the expert's picture only through `PUT …/avatar` with its `draftId`.
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    const token = await settingsToken();
    const form = await relayedForm(request, ["position", "style", "accessory", "background"], ["reference"]);
    return noStore(await backoffice.generateExpertAvatar(token, key, form));
  } catch (e) {
    return settingsError(e, expertLookRefusal);
  }
}
