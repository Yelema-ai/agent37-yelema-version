"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  Mail,
  Plus,
  Search,
  Share2,
  ShieldCheck,
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
  } = useDashboard();

  const workspaceCtx = useWorkspace();
  const currentWorkspace = workspaceCtx?.current;

  const [accesMode, setAccesMode] = useState<"public" | "workspace" | "emails">("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Membres de l'espace de travail
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Recherche & Dropdown pour "Personnes ciblées"
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchroniser avec les données actuelles quand la modale s'ouvre
  useEffect(() => {
    if (shareModalOpen && data) {
      setAccesMode(data.acces || "public");
      setEmails(data.allowedEmails || []);
      setSearchQuery("");
      setDropdownOpen(false);
      setSaveStatus("idle");
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

  // Fermer le dropdown lors d'un clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  // Enregistrement automatique et transparent en arrière-plan
  const persistSharing = async (mode: "public" | "workspace" | "emails", list: string[]) => {
    setSaveStatus("saving");
    const ok = await updateSharing(mode, list);
    if (ok) {
      setSaveStatus("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } else {
      setSaveStatus("idle");
    }
  };

  // Changement de mode de visibilité (enregistré immédiatement)
  const handleModeChange = (mode: "public" | "workspace" | "emails") => {
    setAccesMode(mode);
    void persistSharing(mode, emails);
  };

  // Lien protégé via Mstudio : indispensable pour imposer la vérification d'authentification et de workspace
  const platformProtectedLink =
    typeof window !== "undefined" && agentId && profile
      ? `${window.location.origin}/dashboards/view?agentId=${encodeURIComponent(agentId)}&profile=${encodeURIComponent(profile)}`
      : "";

  // En mode Workspace ou Emails spécifiques : obligatoirement le lien protégé Mstudio qui bloque les personnes non connectées
  // En mode Public : le lien direct Render ou le lien plateforme
  const effectiveShareLink =
    accesMode === "public"
      ? (activeUrl || platformProtectedLink)
      : (platformProtectedLink || activeUrl || "");

  const handleCopy = () => {
    if (!effectiveShareLink) {
      toast.error("Aucun lien de tableau de bord disponible.");
      return;
    }
    navigator.clipboard.writeText(effectiveShareLink);
    setCopied(true);
    toast.success("Lien sécurisé copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMemberEmail = (memberEmail: string) => {
    const clean = memberEmail.toLowerCase().trim();
    const updated = emails.includes(clean)
      ? emails.filter((e) => e !== clean)
      : [...emails, clean];
    setEmails(updated);
    void persistSharing(accesMode, updated);
  };

  const selectAllWorkspaceMembers = () => {
    const memberEmails = workspaceMembers.map((m) => m.email.toLowerCase().trim());
    const union = Array.from(new Set([...emails, ...memberEmails]));
    setEmails(union);
    void persistSharing(accesMode, union);
  };

  const deselectAllWorkspaceMembers = () => {
    const memberEmails = new Set(workspaceMembers.map((m) => m.email.toLowerCase().trim()));
    const remaining = emails.filter((e) => !memberEmails.has(e));
    setEmails(remaining);
    void persistSharing(accesMode, remaining);
  };

  const handleAddCustomEmail = (rawEmail: string) => {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return;

    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    if (emails.includes(email)) {
      toast.info("Cette adresse est déjà sélectionnée.");
      return;
    }

    const updated = [...emails, email];
    setEmails(updated);
    setSearchQuery("");
    void persistSharing(accesMode, updated);
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      const match = workspaceMembers.find(
        (m) => m.email.toLowerCase().trim() === q || (m.name && m.name.toLowerCase().trim() === q)
      );
      if (match) {
        toggleMemberEmail(match.email);
        setSearchQuery("");
      } else if (q.includes("@")) {
        handleAddCustomEmail(q);
      } else {
        toast.error("Entrez une adresse e-mail complète ou choisissez un membre.");
      }
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updated = emails.filter((e) => e !== emailToRemove);
    setEmails(updated);
    void persistSharing(accesMode, updated);
  };

  // Calcul des destinataires pour l'envoi par email (mailto:)
  const emailRecipients = (() => {
    if (accesMode === "workspace") {
      return workspaceMembers
        .map((m) => m.email.trim())
        .filter(Boolean)
        .join(",");
    }
    if (accesMode === "emails") {
      return emails.filter(Boolean).join(",");
    }
    return "";
  })();

  const mailtoSubject = encodeURIComponent(`Tableau de bord ${agentName} — Mstudio`);
  const mailtoBody = encodeURIComponent(
    `Bonjour,\n\nVoici le lien d'accès au tableau de bord de ${agentName} :\n${effectiveShareLink}\n\nCordialement,\n${workspaceCtx?.userName || "L'équipe Mstudio"}`
  );
  const mailtoHref = `mailto:${emailRecipients}?subject=${mailtoSubject}&body=${mailtoBody}`;

  // Filtrage des membres dans le dropdown
  const filteredMembers = workspaceMembers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = m.name ? m.name.toLowerCase().includes(q) : false;
    const emailMatch = m.email.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const isSearchQueryCustomEmail =
    searchQuery.trim().includes("@") &&
    searchQuery.trim().includes(".") &&
    !workspaceMembers.some((m) => m.email.toLowerCase().trim() === searchQuery.trim().toLowerCase());

  return (
    <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl border border-line bg-surface p-0 shadow-2xl">
        <DialogHeader className="border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Share2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-ink">
                Partager le tableau de bord
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-3">
                Définissez qui peut accéder au tableau de bord en ligne et transmettez le lien à votre équipe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1 : Droits d'accès et visibilité (Enregistrement automatique) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                1. Visibilité &amp; Droits d’accès
              </h3>
              <div className="flex items-center gap-1.5 text-[11px]">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-ink-3">
                    <Loader2 className="size-3 animate-spin text-brand" />
                    Enregistrement…
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium animate-in fade-in-0">
                    <Check className="size-3" />
                    Enregistré automatiquement
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Option Public */}
              <button
                type="button"
                onClick={() => handleModeChange("public")}
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
                    Accessible directement à toute personne ayant le lien.
                  </p>
                </div>
              </button>

              {/* Option Workspace */}
              <button
                type="button"
                onClick={() => handleModeChange("workspace")}
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
                    Protégé : seuls les membres connectés Mstudio peuvent ouvrir.
                  </p>
                </div>
              </button>

              {/* Option Emails spécifiques */}
              <button
                type="button"
                onClick={() => handleModeChange("emails")}
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
                    Protégé : réservé aux adresses e-mails autorisées.
                  </p>
                </div>
              </button>
            </div>

            {/* Note explicative pour le mode Workspace */}
            {accesMode === "workspace" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed">
                  <strong>Accès sécurisé réservé au workspace :</strong> Seuls les membres authentifiés de votre espace de travail Mstudio ({workspaceMembers.length} collaborateurs) pourront ouvrir ce lien. Les personnes non connectées ou externes verront un écran de connexion ou un refus d'accès.
                </p>
              </div>
            )}

            {/* Note explicative pour le mode Public */}
            {accesMode === "public" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <Globe className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <p className="leading-relaxed">
                  <strong>Accès libre :</strong> Pratique pour partager avec des clients, partenaires ou investisseurs sans exiger de compte Mstudio.
                </p>
              </div>
            )}

            {/* Sélecteur intelligent (Dropdown / Combobox) pour "Personnes ciblées" */}
            {accesMode === "emails" && (
              <div className="mt-3 space-y-3 rounded-xl border border-line bg-soft/40 p-4">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Sélectionner les personnes autorisées
                  </label>
                  <p className="text-[11px] text-ink-3 mb-2">
                    Recherchez parmi les membres du workspace ou saisissez une adresse externe.
                  </p>
                </div>

                {/* Combobox avec recherche & dropdown flottant */}
                <div ref={dropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 size-3.5 text-ink-4 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Rechercher un membre par nom ou email (ex: Leslie, aude@mstudio.vc)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      onKeyDown={handleKeyDownSearch}
                      className="h-9 pl-9 pr-8 text-xs bg-surface border-line"
                    />
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="absolute right-2.5 text-ink-4 hover:text-ink"
                      title="Afficher la liste"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", dropdownOpen && "rotate-180")} />
                    </button>
                  </div>

                  {/* Panneau déroulant (Dropdown) */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-in fade-in-0 zoom-in-95">
                      {/* Barre d'action rapide */}
                      <div className="flex items-center justify-between border-b border-line bg-soft/60 px-3 py-1.5 text-[11px]">
                        <span className="font-medium text-ink-3">
                          {filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""} Mstudio
                        </span>
                        <div className="flex items-center gap-2">
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
                      </div>

                      {/* Option pour ajouter une adresse e-mail personnalisée si tapée */}
                      {isSearchQueryCustomEmail && (
                        <div
                          onClick={() => handleAddCustomEmail(searchQuery)}
                          className="flex items-center gap-2 border-b border-line bg-brand/5 px-3 py-2 text-xs font-medium text-brand cursor-pointer hover:bg-brand/10 transition-colors"
                        >
                          <Plus className="size-3.5" />
                          <span>Ajouter l'invité externe : <strong>{searchQuery.trim()}</strong></span>
                        </div>
                      )}

                      {/* Liste scrollable des membres */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-line/40">
                        {loadingMembers ? (
                          <div className="flex items-center justify-center py-6 text-xs text-ink-3">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" />
                            Chargement des membres...
                          </div>
                        ) : filteredMembers.length === 0 && !isSearchQueryCustomEmail ? (
                          <div className="p-4 text-center text-xs text-ink-3">
                            Aucun membre ne correspond à « {searchQuery} »
                            <p className="mt-1 text-[11px] text-ink-4">
                              Appuyez sur Entrée pour ajouter une adresse e-mail externe.
                            </p>
                          </div>
                        ) : (
                          filteredMembers.map((m) => {
                            const cleanEmail = m.email.toLowerCase().trim();
                            const isSelected = emails.includes(cleanEmail);
                            return (
                              <div
                                key={m.user_id || m.email}
                                onClick={() => toggleMemberEmail(m.email)}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs select-none hover:bg-soft",
                                  isSelected && "bg-brand/5 font-medium"
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
                                    <p className="text-ink truncate leading-tight">
                                      {m.name || m.email}
                                    </p>
                                    <p className="text-[10.5px] text-ink-3 truncate leading-tight">
                                      {m.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="rounded bg-soft px-1.5 py-0.5 text-[9.5px] uppercase font-semibold text-ink-4">
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

                      <div className="border-t border-line bg-soft/30 px-3 py-1.5 text-[10.5px] text-ink-4 text-center">
                        Tapez un nom ou un email pour filtrer • Entrée pour ajouter une adresse externe
                      </div>
                    </div>
                  )}
                </div>

                {/* Badges des personnes sélectionnées */}
                {emails.length > 0 ? (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5 text-[11px] text-ink-3">
                      <span>{emails.length} personne{emails.length > 1 ? "s" : ""} autorisée{emails.length > 1 ? "s" : ""} :</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmails([]);
                          void persistSharing(accesMode, []);
                        }}
                        className="text-ink-4 hover:text-rose-500 transition-colors"
                      >
                        Tout effacer
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {emails.map((e) => {
                        const member = workspaceMembers.find(
                          (m) => m.email.toLowerCase().trim() === e.toLowerCase().trim()
                        );
                        return (
                          <span
                            key={e}
                            className="inline-flex items-center gap-1 rounded-md bg-surface border border-line px-2 py-0.5 text-xs text-ink shadow-xs"
                          >
                            <span className="truncate max-w-[200px]">
                              {member?.name ? `${member.name} (${e})` : e}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(e)}
                              className="text-ink-4 hover:text-rose-500 transition-colors ml-0.5"
                              title={`Retirer ${e}`}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-4 italic">
                    Aucun membre ou email sélectionné pour le moment.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 2 : Lien de partage & transmission */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                2. Lien de partage {accesMode !== "public" ? "sécurisé" : "direct"}
              </h3>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
                accesMode === "public"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}>
                {accesMode === "public" ? "Accès libre" : "Contrôle d'accès actif"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={effectiveShareLink || "Aucun tableau de bord généré pour le moment"}
                className="h-9 font-mono text-xs text-ink bg-soft/50 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!effectiveShareLink}
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

              {effectiveShareLink && (
                <a
                  href={effectiveShareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink transition-colors hover:bg-soft shrink-0"
                  title="Ouvrir dans un nouvel onglet pour tester"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            {accesMode !== "public" && (
              <p className="text-[11px] text-ink-3 leading-relaxed">
                🛡️ <strong>Protection active :</strong> Ce lien passe par la plateforme Mstudio. Si une personne non connectée ou non autorisée tente d'ouvrir ce lien, l'accès lui sera bloqué avec un écran de connexion.
              </p>
            )}

            {/* Bouton Partager par e-mail avec affichage clair des destinataires */}
            <div className="rounded-xl border border-line bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-brand" />
                  <span className="text-xs font-semibold text-ink">
                    Transmettre par e-mail
                  </span>
                </div>
                <a
                  href={mailtoHref}
                  className={cn(
                    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-medium text-white transition-colors hover:bg-brand/90 shrink-0",
                    !effectiveShareLink && "pointer-events-none opacity-50"
                  )}
                  title="Ouvrir votre logiciel de messagerie avec les destinataires pré-remplis"
                >
                  <Mail className="size-3.5" />
                  <span>Envoyer un e-mail</span>
                </a>
              </div>

              <div className="text-[11.5px] text-ink-3 leading-relaxed">
                {accesMode === "workspace" && (
                  <p>
                    Destinataires pré-remplis : <strong>Tous les membres du workspace</strong> ({workspaceMembers.length} adresses : {workspaceMembers.map((m) => m.email).slice(0, 3).join(", ")}{workspaceMembers.length > 3 ? "…" : ""}).
                  </p>
                )}
                {accesMode === "emails" && (
                  <p>
                    Destinataires pré-remplis : {emails.length > 0 ? (
                      <strong>{emails.length} adresse{emails.length > 1 ? "s" : ""} sélectionnée{emails.length > 1 ? "s" : ""} ({emails.slice(0, 3).join(", ")}{emails.length > 3 ? "…" : ""})</strong>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Aucun destinataire sélectionné ci-dessus.</span>
                    )}
                  </p>
                )}
                {accesMode === "public" && (
                  <p>
                    Destinataires : libre (à saisir dans votre client email).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
