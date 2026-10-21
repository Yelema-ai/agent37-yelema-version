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
  ShieldCheck,
  Send,
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
import { useWorkspace } from "@/components/WorkspaceProvider";
import { apiFetch } from "@/lib/api";
import type { WorkspaceMember } from "@/lib/types";
import { toast } from "sonner";

export function ShareDashboardModal() {
  const {
    shareModalOpen,
    setShareModalOpen,
    agentId,
    profile,
    agentName,
    activeUrl,
    data,
    updateSharing,
    downloadPdf,
    downloadHtml,
  } = useDashboard();

  const workspaceCtx = useWorkspace();
  const currentWorkspace = workspaceCtx?.current;

  const [accesMode, setAccesMode] = useState<"public" | "workspace" | "emails">("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Membres de l'espace de travail
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Synchroniser avec les données actuelles quand la modale s'ouvre
  useEffect(() => {
    if (shareModalOpen && data) {
      setAccesMode(data.acces || "public");
      setEmails(data.allowedEmails || []);
      setNewEmail("");
      setEmailError(null);
    }
  }, [shareModalOpen, data]);

  // Charger les membres du workspace
  useEffect(() => {
    if (!shareModalOpen || !currentWorkspace?.id) return;
    setLoadingMembers(true);
    apiFetch<{ members: WorkspaceMember[] }>(`/api/workspaces/${currentWorkspace.id}/members`)
      .then((res) => {
        if (res?.members) {
          setWorkspaceMembers(res.members);
        }
      })
      .catch((err) => {
        console.warn("Erreur chargement membres du workspace:", err);
      })
      .finally(() => {
        setLoadingMembers(false);
      });
  }, [shareModalOpen, currentWorkspace?.id]);

  // URL de partage sécurisée de la plateforme (qui valide les droits d'accès)
  const platformShareUrl =
    typeof window !== "undefined" && agentId && profile
      ? `${window.location.origin}/dashboards/view?agentId=${encodeURIComponent(agentId)}&profile=${encodeURIComponent(profile)}`
      : activeUrl || "";

  const handleCopy = () => {
    if (!platformShareUrl) {
      toast.error("Aucun lien disponible.");
      return;
    }
    navigator.clipboard.writeText(platformShareUrl);
    setCopied(true);
    toast.success("Lien sécurisé copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMemberEmail = (memberEmail: string) => {
    const clean = memberEmail.toLowerCase().trim();
    if (emails.includes(clean)) {
      setEmails(emails.filter((e) => e !== clean));
    } else {
      setEmails([...emails, clean]);
    }
  };

  const selectAllWorkspaceMembers = () => {
    const memberEmails = workspaceMembers.map((m) => m.email.toLowerCase().trim());
    const union = Array.from(new Set([...emails, ...memberEmails]));
    setEmails(union);
  };

  const deselectAllWorkspaceMembers = () => {
    const memberEmails = new Set(workspaceMembers.map((m) => m.email.toLowerCase().trim()));
    setEmails(emails.filter((e) => !memberEmails.has(e)));
  };

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Adresse e-mail invalide.");
      return;
    }

    if (emails.includes(email)) {
      setEmailError("Cette adresse e-mail est déjà dans la liste.");
      return;
    }

    setEmails([...emails, email]);
    setNewEmail("");
    setEmailError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleSaveSharing = async () => {
    setIsSaving(true);
    try {
      const ok = await updateSharing(accesMode, emails);
      if (ok) {
        setShareModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const mailtoSubject = encodeURIComponent(`Tableau de bord ${agentName} — Mstudio`);
  const mailtoBody = encodeURIComponent(
    `Bonjour,\n\nVoici le lien sécurisé pour consulter le tableau de bord de ${agentName} :\n${platformShareUrl}\n\nCordialement,\n${workspaceCtx?.userName || "L'équipe Mstudio"}`
  );
  const mailtoHref = `mailto:${accesMode === "emails" ? emails.join(",") : ""}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface p-0 shadow-2xl">
        <DialogHeader className="border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Share2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-ink">
                Partager et exporter le tableau de bord
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-3">
                Gérez la visibilité en ligne pour votre équipe et téléchargez les livrables officiels.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1 : Droits d'accès et visibilité */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
              1. Visibilité &amp; Droits d’accès
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Option Public */}
              <button
                type="button"
                onClick={() => setAccesMode("public")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "public"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "public" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Globe className="size-3.5" />
                  </div>
                  {accesMode === "public" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Public</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Toute personne ayant le lien peut consulter sans connexion.
                  </p>
                </div>
              </button>

              {/* Option Workspace */}
              <button
                type="button"
                onClick={() => setAccesMode("workspace")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "workspace"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "workspace" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Users className="size-3.5" />
                  </div>
                  {accesMode === "workspace" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Espace Mstudio</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Réservé aux membres connectés du workspace Mstudio.
                  </p>
                </div>
              </button>

              {/* Option Emails spécifiques */}
              <button
                type="button"
                onClick={() => setAccesMode("emails")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "emails"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "emails" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Lock className="size-3.5" />
                  </div>
                  {accesMode === "emails" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Personnes ciblées</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Sélection des membres ou ajout d'emails spécifiques.
                  </p>
                </div>
              </button>
            </div>

            {/* Note explicative pour le mode Workspace */}
            {accesMode === "workspace" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed">
                  <strong>Accès sécurisé réservé au workspace :</strong> Seuls les membres authentifiés de votre espace de travail Mstudio pourront ouvrir ce tableau de bord. Les personnes non connectées ou externes recevront un refus d'accès.
                </p>
              </div>
            )}

            {/* Note explicative pour le mode Public */}
            {accesMode === "public" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <Globe className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <p className="leading-relaxed">
                  <strong>Accès libre avec le lien :</strong> Pratique pour partager avec des clients, des investisseurs ou des partenaires externes sans qu'ils aient besoin de créer un compte Mstudio.
                </p>
              </div>
            )}

            {/* Sélecteur de membres et champ d'email si "emails" est sélectionné */}
            {accesMode === "emails" && (
              <div className="mt-3 space-y-3.5 rounded-xl border border-line bg-soft/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      Sélectionner parmi les membres du workspace
                    </p>
                    <p className="text-[11px] text-ink-3">
                      Cochez les collaborateurs autorisés à consulter ce tableau.
                    </p>
                  </div>
                  {workspaceMembers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllWorkspaceMembers}
                        className="font-medium text-brand hover:underline"
                      >
                        Tout cocher
                      </button>
                      <span className="text-ink-4">·</span>
                      <button
                        type="button"
                        onClick={deselectAllWorkspaceMembers}
                        className="text-ink-3 hover:underline"
                      >
                        Tout décocher
                      </button>
                    </div>
                  )}
                </div>

                {/* Liste des membres du workspace */}
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-4 text-xs text-ink-3">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" />
                      Chargement des membres...
                    </div>
                  ) : workspaceMembers.length === 0 ? (
                    <p className="py-2 text-xs text-ink-3">
                      Aucun autre membre détecté dans l'espace de travail.
                    </p>
                  ) : (
                    workspaceMembers.map((m) => {
                      const cleanEmail = m.email.toLowerCase().trim();
                      const isSelected = emails.includes(cleanEmail);
                      return (
                        <div
                          key={m.user_id || m.email}
                          onClick={() => toggleMemberEmail(m.email)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors text-xs select-none",
                            isSelected
                              ? "border-brand/40 bg-surface shadow-xs font-medium"
                              : "border-line bg-card hover:bg-soft"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                                isSelected ? "bg-brand text-white" : "bg-soft text-ink-2"
                              )}
                            >
                              {m.name ? m.name.charAt(0) : m.email.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-ink truncate leading-tight font-medium">
                                {m.name || m.email}
                              </p>
                              <p className="text-[10.5px] text-ink-3 truncate leading-tight">
                                {m.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded bg-soft px-1.5 py-0.5 text-[9.5px] uppercase font-semibold text-ink-3">
                              {m.role || "membre"}
                            </span>
                            <div
                              className={cn(
                                "flex size-4 items-center justify-center rounded border transition-colors",
                                isSelected
                                  ? "border-brand bg-brand text-white"
                                  : "border-line bg-surface"
                              )}
                            >
                              {isSelected && <Check className="size-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Champ pour ajouter une autre adresse (externe) */}
                <div className="pt-2 border-t border-line/70">
                  <p className="text-xs font-semibold text-ink mb-1.5">
                    Ajouter une autre adresse e-mail (collaborateur externe, client) :
                  </p>
                  <form onSubmit={handleAddEmail} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="exemple@entreprise.com"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailError(null);
                      }}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                    </Button>
                  </form>
                  {emailError && (
                    <p className="mt-1 text-xs text-rose-500">{emailError}</p>
                  )}
                </div>

                {/* Liste des personnes autorisées */}
                {emails.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-ink-3 mb-1.5">
                      {emails.length} adresse{emails.length > 1 ? "s" : ""} autorisée{emails.length > 1 ? "s" : ""} :
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {emails.map((e) => (
                        <span
                          key={e}
                          className="inline-flex items-center gap-1 rounded-md bg-surface border border-line px-2 py-0.5 text-xs text-ink shadow-xs"
                        >
                          <span className="truncate max-w-[220px]">{e}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(e)}
                            className="text-ink-4 hover:text-rose-500 transition-colors"
                            title={`Retirer ${e}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bouton d'enregistrement des droits */}
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={handleSaveSharing}
                disabled={isSaving}
                className="bg-brand text-white hover:bg-brand/90 text-xs px-4"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer les droits d'accès"
                )}
              </Button>
            </div>
          </div>

          {/* Section 2 : Lien de partage & transmission */}
          <div className="space-y-3 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                2. Lien d’accès sécurisé
              </h3>
              <p className="text-[11px] text-ink-3">
                Transmission manuelle ou par e-mail
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={platformShareUrl || "Aucun tableau de bord généré"}
                className="h-9 font-mono text-xs text-ink bg-soft/50 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!platformShareUrl}
                className="h-9 px-3 text-xs gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </Button>

              <a
                href={mailtoHref}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 text-xs text-ink transition-colors hover:bg-soft shrink-0",
                  !platformShareUrl && "pointer-events-none opacity-50"
                )}
                title="Ouvrir votre messagerie avec le lien pré-rempli"
              >
                <Mail className="size-3.5 text-brand" />
                <span className="hidden sm:inline">Partager par e-mail</span>
              </a>

              {platformShareUrl && (
                <a
                  href={platformShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink transition-colors hover:bg-soft shrink-0"
                  title="Tester le lien dans un nouvel onglet"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            <p className="text-[11px] text-ink-3 leading-relaxed">
              💡 <strong>Comment ça se passe ?</strong> Le lien n'est pas envoyé automatiquement à tout le monde sans votre action. Vous copiez ce lien ou cliquez sur « Partager par e-mail » pour le transmettre dans Slack, WhatsApp, Teams ou par courriel aux personnes concernées. Seules les personnes respectant vos règles de visibilité ci-dessus pourront l'ouvrir.
            </p>
          </div>

          {/* Section 3 : Téléchargement et export officiel */}
          <div className="space-y-3 pt-2 border-t border-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
              3. Télécharger &amp; Exporter
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Carte Export PDF */}
              <div className="flex flex-col justify-between rounded-xl border border-line bg-card p-3.5 shadow-xs">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                      <FileText className="size-4" />
                    </div>
                    <span className="text-xs font-semibold text-ink">
                      Document PDF officiel
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-3 leading-relaxed">
                    Format A4 paysage haute résolution, idéal pour l'impression, l'archivage et les réunions de direction.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadPdf}
                  className="w-full text-xs gap-1.5 border-line hover:bg-soft"
                >
                  <Download className="size-3.5 text-orange-600" />
                  Télécharger en PDF
                </Button>
              </div>

              {/* Carte Export HTML */}
              <div className="flex flex-col justify-between rounded-xl border border-line bg-card p-3.5 shadow-xs">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <FileCode className="size-4" />
                    </div>
                    <span className="text-xs font-semibold text-ink">
                      Application HTML autonome
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-3 leading-relaxed">
                    Fichier interactif complet avec graphiques et filtres, consultable hors-ligne dans tout navigateur.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadHtml}
                  className="w-full text-xs gap-1.5 border-line hover:bg-soft"
                >
                  <Download className="size-3.5 text-blue-600" />
                  Télécharger en HTML
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
