import { ApiError } from "@/lib/http";
import { MAX_UPLOAD_BYTES, TOO_LARGE } from "@/lib/upload-limit";

// Only the fields the back office reads go on, and no file over the limit: it checks the real type
// and size again, and the prompt of a generated portrait is written there, never here.
export async function relayedForm(request: Request, fields: readonly string[], files: readonly string[]): Promise<FormData> {
  const form = await request.formData().catch(() => null);
  if (!form) throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
  const out = new FormData();
  for (const name of fields) {
    const value = form.get(name);
    if (typeof value === "string" && value.length <= 64) out.append(name, value);
  }
  for (const name of files) {
    const file = form.get(name);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "too_large", TOO_LARGE);
    out.append(name, file, file.name || name);
  }
  return out;
}
