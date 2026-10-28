"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { apiFetch } from "@/lib/api";
import { MAX_UPLOAD_BYTES, TOO_LARGE } from "@/lib/upload-limit";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface Profile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * The user's own first name, last name, job title and photo; the back office computes the full
 * name. The photo is sent as soon as it is picked, and shows at once here and in the menu.
 */
export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { setUserAvatarUrl } = useWorkspace();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  // The picked file, shown while it is on its way.
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setProfile(null);
    setPreview(null);
    apiFetch<Profile>("/api/account").then(setProfile, (e: Error) => {
      toast.error(e.message);
      onOpenChange(false);
    });
  }, [open, onOpenChange]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const set = (k: "firstName" | "lastName" | "jobTitle") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => (p ? { ...p, [k]: e.target.value } : p));
  const valid = Boolean(profile?.firstName.trim() && profile.lastName.trim());

  async function changePhoto(action: () => Promise<Profile>, done: string) {
    setPhotoBusy(true);
    try {
      const next = await action();
      setProfile((p) => (p ? { ...p, avatarUrl: next.avatarUrl } : p));
      setUserAvatarUrl(next.avatarUrl);
      toast.success(done);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPhotoBusy(false);
      setPreview(null);
    }
  }

  function pickFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return void toast.error("Choisissez une image PNG, JPEG ou WebP.");
    if (file.size > MAX_UPLOAD_BYTES) return void toast.error(TOO_LARGE);
    setPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.set("file", file);
    void changePhoto(async () => {
      return apiFetch<Profile>("/api/account/avatar", { method: "PUT", body: form }, "La photo n’a pas pu être enregistrée");
    }, "Photo enregistrée.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !valid || saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ firstName: profile.firstName, lastName: profile.lastName, jobTitle: profile.jobTitle }),
      });
      toast.success("Profil enregistré.");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const shown = preview ?? profile?.avatarUrl ?? null;
  const initials = profile ? `${profile.firstName.trim()[0] ?? ""}${profile.lastName.trim()[0] ?? ""}`.toUpperCase() || "?" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Mon profil</DialogTitle>
        <DialogDescription>{profile?.email ?? "Chargement…"}</DialogDescription>
        {profile && (
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex items-center gap-4 pb-1">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                aria-label="Changer la photo"
                className="group relative grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-full bg-brand font-display text-2xl font-bold text-on-brand"
              >
                {shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shown} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="size-5 text-white" />
                </span>
                {photoBusy && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </span>
                )}
              </button>
              <div className="flex flex-col items-start gap-1.5">
                <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={photoBusy} className="gap-1.5">
                  <Camera className="size-4" />
                  {profile.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
                </Button>
                {profile.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={photoBusy}
                    onClick={() =>
                      void changePhoto(() => apiFetch<Profile>("/api/account/avatar", { method: "DELETE" }), "Photo retirée.")
                    }
                    className="gap-1.5 text-ink-3"
                  >
                    <Trash2 className="size-4" />
                    Retirer
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-first">Prénom</Label>
                <Input id="profile-first" value={profile.firstName} onChange={set("firstName")} maxLength={100} required autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-last">Nom</Label>
                <Input id="profile-last" value={profile.lastName} onChange={set("lastName")} maxLength={100} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-job">Fonction</Label>
              <Input id="profile-job" value={profile.jobTitle} onChange={set("jobTitle")} maxLength={200} placeholder="Directrice administrative et financière" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
