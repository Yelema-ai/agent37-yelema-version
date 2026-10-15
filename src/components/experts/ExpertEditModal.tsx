"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Palette, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpertImage } from "@/components/experts/ExpertImage";
import { AvatarConfigModal } from "@/components/experts/AvatarConfigModal";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { apiFetch, readApiError } from "@/lib/api";
import type { ExpertAvatarDraft, ExpertLook } from "@/lib/backoffice";
import { EXPERT_NAME_MAX, EXPERT_NAME_RULE, expertName } from "@/lib/expert-looks";
import { MAX_UPLOAD_BYTES, TOO_LARGE } from "@/lib/upload-limit";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// How far the expert itself has got with its new name: the back office writes it in its SOUL.md
// in the background, and the expert introduces itself that way once it is there.
function identityNote(look: ExpertLook): string | null {
  const name = look.displayName ?? look.defaultName;
  if (look.identity.state === "pending") return `${name} apprend son nom. Cela prend une minute.`;
  if (look.identity.state === "failed") return `Le nom n’a pas encore pu être transmis à l’expert : enregistrez-le à nouveau dans un moment.`;
  return null;
}

/**
 * A member's own name and picture for one expert of their team, over the catalogue's: the name is
 * written in the expert itself (it introduces itself and signs that way); the picture is theirs to
 * import, or to have drawn by the studio from the expert's face. The drive folder and the e-mail
 * sender keep the catalogue's name.
 */
export function ExpertEditModal({ expertKey, open, onOpenChange }: { expertKey: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { reload } = useExpertsContext();
  const [look, setLook] = useState<ExpertLook | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"name" | "avatar" | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const url = `/api/experts/${encodeURIComponent(expertKey)}`;

  useEffect(() => {
    if (!open) return;
    setLook(null);
    apiFetch<ExpertLook>(url).then(
      (l) => {
        setLook(l);
        setName(l.displayName ?? l.defaultName);
      },
      (e: Error) => {
        toast.error(e.message);
        onOpenChange(false);
      }
    );
  }, [open, url, onOpenChange]);

  // Every change lands at once: the team and the chat read the new look again.
  const changed = (l: ExpertLook) => {
    setLook(l);
    reload();
  };

  async function run(what: "name" | "avatar", action: () => Promise<ExpertLook>, done: string) {
    setBusy(what);
    try {
      changed(await action());
      toast.success(done);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const sendAvatar = (form: FormData) =>
    run(
      "avatar",
      async () => {
        const res = await fetch(`${url}/avatar`, { method: "PUT", body: form });
        if (!res.ok) throw new Error(await readApiError(res, "L’image n’a pas pu être enregistrée."));
        return (await res.json()) as ExpertLook;
      },
      "Portrait enregistré."
    );

  const pickFile = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return void toast.error("Choisissez une image PNG, JPEG ou WebP.");
    if (file.size > MAX_UPLOAD_BYTES) return void toast.error(TOO_LARGE);
    const form = new FormData();
    form.set("file", file);
    void sendAvatar(form);
  };

  const applyDraft = (draft: ExpertAvatarDraft) => {
    const form = new FormData();
    form.set("draftId", draft.draftId);
    void sendAvatar(form);
  };

  const cleaned = expertName(name);
  const nameChanged = look !== null && cleaned !== null && cleaned !== (look.displayName ?? look.defaultName);

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!look || !cleaned || busy) return;
    // Its catalogue name again is the same as no name of the member's own.
    const displayName = cleaned === look.defaultName ? null : cleaned;
    void run("name", () => apiFetch<ExpertLook>(url, { method: "PATCH", body: JSON.stringify({ displayName }) }), `L’expert s’appelle désormais ${cleaned}.`);
  }

  const portrait = look?.avatarUrl ?? look?.defaultAvatarUrl ?? null;
  const note = look ? identityNote(look) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Personnaliser {look ? (look.displayName ?? look.defaultName) : "l’expert"}</DialogTitle>
          <DialogDescription>
            {look ? `${look.role ?? "Expert"} · nom d’origine : ${look.defaultName}` : "Chargement…"}
          </DialogDescription>

          {look ? (
            <div className="flex flex-col gap-5">
              <form onSubmit={saveName} className="flex flex-col gap-1.5">
                <Label htmlFor="expert-name">Son nom</Label>
                <div className="flex gap-2">
                  <Input id="expert-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={EXPERT_NAME_MAX} required autoComplete="off" />
                  <Button type="submit" disabled={!nameChanged || busy !== null} className="shrink-0">
                    {busy === "name" ? <Loader2 className="size-4 animate-spin" /> : "Renommer"}
                  </Button>
                </div>
                <p className="text-xs text-ink-3">
                  {cleaned || !name.trim() ? "Il se présentera et signera sous ce nom, dans la discussion, sur vos canaux et au téléphone." : EXPERT_NAME_RULE}
                </p>
                {note && <p className="text-xs font-medium text-ink-2">{note}</p>}
                {look.displayName && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run("name", () => apiFetch<ExpertLook>(url, { method: "PATCH", body: JSON.stringify({ displayName: null }) }), `L’expert reprend le nom de ${look.defaultName}.`)}
                    className="self-start text-xs font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                  >
                    Reprendre le nom {look.defaultName}
                  </button>
                )}
              </form>

              <div className="flex flex-col gap-3">
                <Label>Son portrait</Label>
                <div className="flex items-center gap-4">
                  {/* Fixed color on purpose: behind a portrait, in both themes. */}
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#8E6FB0]">
                    {portrait && <ExpertImage src={portrait} size={80} className="size-full object-cover object-[50%_15%]" />}
                    {busy === "avatar" && (
                      <div className="absolute inset-0 grid place-items-center bg-black/30">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setStudioOpen(true)} disabled={busy !== null} className="gap-1.5">
                      <Palette className="size-4" />
                      Studio portrait IA
                    </Button>
                    <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                    <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="gap-1.5">
                      <Upload className="size-4" />
                      Importer
                    </Button>
                    {look.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => void run("avatar", () => apiFetch<ExpertLook>(`${url}/avatar`, { method: "DELETE" }), "Portrait d’origine rétabli.")}
                        className="gap-1.5"
                      >
                        <RotateCcw className="size-4" />
                        Portrait d’origine
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-ink-3">Le studio garde son visage et change la pose, la tenue, l’accessoire et le fond. PNG, JPEG ou WebP de 4 Mo au plus pour une image importée.</p>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {look && studioOpen && (
        <AvatarConfigModal
          open
          onOpenChange={setStudioOpen}
          expertKey={expertKey}
          expertName={look.displayName ?? look.defaultName}
          currentAvatarUrl={portrait}
          onApplyAvatar={applyDraft}
        />
      )}
    </>
  );
}
