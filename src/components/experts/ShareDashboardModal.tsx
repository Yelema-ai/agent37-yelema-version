"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  Lock,
  Mail,
  Plus,
  Printer,
  Share2,
  Users,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardProvider";

export function ShareDashboardModal() {
  const {
    shareModalOpen,
    setShareModalOpen,
    agentName,
    activeUrl,
    data,
    updateSharing,
    downloadPdf,
    downloadHtml,
    copyShareLink,
  } = useDashboard();

  const [accesMode, setAccesMode] = useState<"public" | "workspace" | "emails">("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Synchroniser avec les données actuelles quand la modale s'ouvre
  useEffect(() => {
    if (shareModalOpen && data) {
      setAccesMode(data.acces || "public");
      setEmails(data.allowedEmails || []);
      setNewEmail("");
      setEmailError(null);
    }
  }, [shareModalOpen, data]);

  const handleCopy = () => {
    copyShareLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    // Validation email basique
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Adresse e-mail invalide.");
      return;
    }

    if (emails.includes(email)) {
      setEmailError("Cette adresse est déjà dans la liste.");
      return;
    }

    setEmails((prev) => [...prev, email]);
    setNewEmail("");
    setEmailError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleSaveAccess = async () => {
    setIsSaving(true);
    try {
      await updateSharing(accesMode, emails);
    } finally {
      setIsSaving(false);
    }
  };

  const hasAccessChanges =
    (data?.acces || "public") !== accesMode ||
    JSON.stringify(data?.allowedEmails || []) !== JSON.stringify(emails);

  return (
    <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 gap-6">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tint text-brand">
              <Share2 className="h-5 w-5" />
            </div>
            <span>Partager et exporter le tableau de bord</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-3">
            Définissez qui peut consulter le tableau de bord de {agentName} et exportez-le dans le format de votre choix.
          </DialogDescription>
        </DialogHeader>

        {/* SECTION 1: MODES D'ACCÈS ET PARTAGE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              1. Visibilité et droits d'accès
            </h4>
            {hasAccessChanges && (
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                Modifications non enregistrées
              </span>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {/* OPTION 1: PUBLIC */}
            <button
              type="button"
              onClick={() => setAccesMode("public")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                accesMode === "public"
                  ? "border-brand bg-tint/40 shadow-sm ring-1 ring-brand/30"
                  : "border-line bg-surface hover:bg-soft"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <Globe className={cn("h-4 w-4", accesMode === "public" ? "text-brand" : "text-ink-3")} />
                {accesMode === "public" && <Check className="h-3.5 w-3.5 text-brand" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Public</p>
                <p className="text-[11px] text-ink-3 leading-tight mt-0.5">
                  Toute personne ayant le lien peut consulter
                </p>
              </div>
            </button>

            {/* OPTION 2: WORKSPACE */}
            <button
              type="button"
              onClick={() => setAccesMode("workspace")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                accesMode === "workspace"
                  ? "border-brand bg-tint/40 shadow-sm ring-1 ring-brand/30"
                  : "border-line bg-surface hover:bg-soft"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <Users className={cn("h-4 w-4", accesMode === "workspace" ? "text-brand" : "text-ink-3")} />
                {accesMode === "workspace" && <Check className="h-3.5 w-3.5 text-brand" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Espace de travail</p>
                <p className="text-[11px] text-ink-3 leading-tight mt-0.5">
                  Réservé aux membres de votre workspace
                </p>
              </div>
            </button>

            {/* OPTION 3: EMAILS SPÉCIFIQUES */}
            <button
              type="button"
              onClick={() => setAccesMode("emails")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                accesMode === "emails"
                  ? "border-brand bg-tint/40 shadow-sm ring-1 ring-brand/30"
                  : "border-line bg-surface hover:bg-soft"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <Mail className={cn("h-4 w-4", accesMode === "emails" ? "text-brand" : "text-ink-3")} />
                {accesMode === "emails" && <Check className="h-3.5 w-3.5 text-brand" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Par e-mail</p>
                <p className="text-[11px] text-ink-3 leading-tight mt-0.5">
                  Uniquement les e-mails spécifiés
                </p>
              </div>
            </button>
          </div>

          {/* Configuration des emails si mode "emails" */}
          {accesMode === "emails" && (
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <p className="text-xs font-medium text-ink">Adresses autorisées à consulter le tableau :</p>

              <form onSubmit={handleAddEmail} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="collaborateur@mstudio.vc"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className="h-8 text-xs bg-background"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs shrink-0">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter
                </Button>
              </form>

              {emailError && <p className="text-[11px] text-destructive font-medium">{emailError}</p>}

              {emails.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {emails.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-2.5 py-0.5 text-xs text-ink"
                    >
                      <Mail className="h-3 w-3 text-ink-3" />
                      {e}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(e)}
                        className="text-ink-3 hover:text-ink transition-colors"
                        title="Retirer cet email"
                        aria-label={`Retirer ${e}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-ink-3 italic">
                  Aucun e-mail ajouté. Ajoutez au moins une adresse pour limiter l'accès.
                </p>
              )}
            </div>
          )}

          {/* Bouton d'enregistrement des droits */}
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAccess}
              disabled={isSaving || !hasAccessChanges}
              className="h-8 text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Enregistrer les accès
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SECTION 2: LIEN DE PARTAGE */}
        {activeUrl && (
          <div className="space-y-2 pt-1 border-t border-line">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              2. Lien d'accès en ligne
            </h4>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={activeUrl}
                  className="h-9 text-xs bg-muted/30 pr-10 text-ink truncate font-mono select-all"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 text-xs shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-brand" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copié !" : "Copier"}
              </Button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-3 transition-colors hover:bg-soft hover:text-ink shrink-0"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* SECTION 3: TÉLÉCHARGEMENT & EXPORTS */}
        <div className="space-y-2.5 pt-1 border-t border-line">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            3. Télécharger le tableau de bord
          </h4>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {/* TÉLÉCHARGER PDF */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 hover:border-brand/30 transition-all">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">Format PDF</p>
                  <p className="text-[11px] text-ink-3 truncate">
                    {data?.pdfPath ? "Prêt pour impression / partage" : "Générer via impression"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={downloadPdf}
                className="h-8 text-xs shrink-0 font-medium"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Télécharger
              </Button>
            </div>

            {/* TÉLÉCHARGER HTML */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 hover:border-brand/30 transition-all">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                  <FileCode className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">Format HTML</p>
                  <p className="text-[11px] text-ink-3 truncate">Page web autonome complète</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={downloadHtml}
                className="h-8 text-xs shrink-0 font-medium"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
