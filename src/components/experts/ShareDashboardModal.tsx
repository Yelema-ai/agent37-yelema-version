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
  Search,
  Share2,
  ShieldCheck,
  Users,
  X,
  Loader2,
  RefreshCw,
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
import { useDashboard, type ShareMode } from "./DashboardProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { toast } from "sonner";

export function ShareDashboardModal() {
  const {
    shareModalOpen,
    setShareModalOpen,
    agentName,
    data,
    updateSharing,
    stopSharing,
  } = useDashboard();

  const workspaceCtx = useWorkspace();
  const shared = Boolean(data?.share);

  const [accesMode, setAccesMode] = useState<ShareMode>("team");
  const [emails, setEmails] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Les membres de l'espace que le propriétaire peut choisir, tels que le back-office les donne
  const workspaceMembers = data?.candidates ?? [];

  // Recherche & Dropdown pour "Personnes ciblées"
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchroniser avec les données actuelles quand la modale s'ouvre
  useEffect(() => {
    if (shareModalOpen && data) {
      setAccesMode(data.share?.mode ?? "team");
      setEmails(data.share?.people ?? []);
      setSearchQuery("");
      setDropdownOpen(false);
      setSaveStatus("idle");
    }
  }, [shareModalOpen, data]);

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
  const persistSharing = async (mode: ShareMode, list: string[]) => {
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
  const handleModeChange = (mode: ShareMode) => {
    setAccesMode(mode);
    void persistSharing(mode, emails);
  };

  // Always the platform link, sealed by the server: it names neither the instance nor the expert, and
  // every opening goes through the access check. Same origin as this page, so the client's sub-domain.
  const effectiveShareLink =
    typeof window !== "undefined" && data?.shareUrl ? `${window.location.origin}${data.shareUrl}` : "";

  const handleRegenerate = async () => {
    setSaveStatus("saving");
    const ok = await updateSharing(accesMode, emails, true);
    setSaveStatus(ok ? "saved" : "idle");
    if (ok) toast.success("Nouveau lien créé : l'ancien ne fonctionne plus.");
  };

  const handleStop = async () => {
    setSaveStatus("saving");
    const ok = await stopSharing();
    setSaveStatus("idle");
    if (ok) toast.success("Partage arrêté : le lien ne fonctionne plus.");
  };

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
      } else {
        toast.error("Choisissez un membre de votre espace.");
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
    if (accesMode === "team") {
      return workspaceMembers
        .map((m) => m.email.trim())
        .filter(Boolean)
        .join(",");
    }
    if (accesMode === "people") {
      return emails.filter(Boolean).join(",");
    }
    return "";
  })();

  // The e-mail's template: the company's name, never a fixed one; the link first, then what it holds.
  const company = workspaceCtx?.current?.name?.trim() || "votre entreprise";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const mailtoSubject = encodeURIComponent(`Tableau de bord de ${agentName}, ${company} (${today})`);
  const mailtoBody = encodeURIComponent(
    `Bonjour,\n\nVoici le tableau de bord de ${agentName}, à jour au ${today}.\n\nPour l'ouvrir : ${effectiveShareLink}\n\nVous y trouverez les indicateurs du mois, l'avancement des projets et les points d'attention. Le lien s'ouvre avec votre compte ${company}.\n\nBonne lecture,\n${workspaceCtx?.userName || company}`
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
                onClick={() => handleModeChange("link")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "link"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "link" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Globe className="size-3.5" />
                  </div>
                  {accesMode === "link" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Toute personne disposant du lien</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Sans connexion, pour qui reçoit le lien.
                  </p>
                </div>
              </button>

              {/* Option Workspace */}
              <button
                type="button"
                onClick={() => handleModeChange("team")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "team"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "team" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Users className="size-3.5" />
                  </div>
                  {accesMode === "team" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Entreprise</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Les membres connectés de votre espace.
                  </p>
                </div>
              </button>

              {/* Option Emails spécifiques */}
              <button
                type="button"
                onClick={() => handleModeChange("people")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                  accesMode === "people"
                    ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20"
                    : "border-line bg-card hover:border-line-2 hover:bg-soft"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      accesMode === "people" ? "bg-brand text-white" : "bg-soft text-ink-2"
                    )}
                  >
                    <Lock className="size-3.5" />
                  </div>
                  {accesMode === "people" && <Check className="size-4 text-brand" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Personnes choisies</p>
                  <p className="text-[11px] leading-snug text-ink-3">
                    Des membres de votre espace, connectés.
                  </p>
                </div>
              </button>
            </div>

            {/* Note explicative pour le mode Workspace */}
            {accesMode === "team" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed">
                  <strong>Réservé à votre entreprise :</strong> seuls les membres connectés de votre espace ({workspaceMembers.length + 1} personnes) peuvent ouvrir ce lien. Les autres voient un écran de connexion.
                </p>
              </div>
            )}

            {/* Note explicative pour le mode Public */}
            {accesMode === "link" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <Globe className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <p className="leading-relaxed">
                  <strong>Sans connexion :</strong> toute personne qui reçoit le lien peut l’ouvrir, y compris hors de votre entreprise. Régénérez ou arrêtez le partage pour le couper.
                </p>
              </div>
            )}

            {/* Sélecteur intelligent (Dropdown / Combobox) pour "Personnes ciblées" */}
            {accesMode === "people" && (
              <div className="mt-3 space-y-3 rounded-xl border border-line bg-soft/40 p-4">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Sélectionner les personnes autorisées
                  </label>
                  <p className="text-[11px] text-ink-3 mb-2">
                    Recherchez parmi les membres de votre espace.
                  </p>
                </div>

                {/* Combobox avec recherche & dropdown flottant */}
                <div ref={dropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 size-3.5 text-ink-4 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Rechercher un membre par nom ou e-mail…"
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
                          {filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""}
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

                      {/* Liste scrollable des membres */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-line/40">
                        {filteredMembers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-ink-3">
                            {searchQuery ? `Aucun membre ne correspond à « ${searchQuery} »` : "Aucun autre membre dans votre espace."}
                          </div>
                        ) : (
                          filteredMembers.map((m) => {
                            const cleanEmail = m.email.toLowerCase().trim();
                            const isSelected = emails.includes(cleanEmail);
                            return (
                              <div
                                key={m.email}
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
                        Tapez un nom ou un e-mail pour filtrer
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
                    Personne n’est choisi : vous seul pouvez ouvrir ce lien.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 2 : Lien de partage & transmission */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                2. Lien de partage
              </h3>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
                accesMode === "link"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}>
                {!shared ? "Pas encore partagé" : accesMode === "link" ? "Sans connexion" : "Connexion exigée"}
              </span>
            </div>

            {data?.sharing === false && (
              <p className="text-[11px] text-ink-3">Le partage n’est pas disponible sur cet espace.</p>
            )}
            {data?.sharing !== false && !shared && (
              <Button
                type="button"
                size="sm"
                onClick={() => void persistSharing(accesMode, emails)}
                disabled={saveStatus === "saving"}
                className="h-9 px-3 text-xs gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Créer le lien de partage</span>
              </Button>
            )}
            {shared && (
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
              {effectiveShareLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={saveStatus === "saving"}
                  className="h-9 px-3 text-xs gap-1.5 shrink-0"
                  title="Créer un nouveau lien ; l'ancien cessera de fonctionner"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Régénérer</span>
                </Button>
              )}
            </div>
            )}
            {shared && (
              <button
                type="button"
                onClick={() => void handleStop()}
                disabled={saveStatus === "saving"}
                className="text-[11px] text-ink-3 hover:text-rose-500 hover:underline"
              >
                Arrêter le partage
              </button>
            )}

            {shared && accesMode !== "link" && (
              <p className="text-[11px] text-ink-3 leading-relaxed">
                🛡️ <strong>Protection active :</strong> à chaque ouverture, la plateforme vérifie qui ouvre le lien. Une personne non connectée ou non autorisée est arrêtée.
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
                {accesMode === "team" && (
                  <p>
                    Destinataires pré-remplis : <strong>Tous les membres de votre espace</strong> ({workspaceMembers.length} adresses : {workspaceMembers.map((m) => m.email).slice(0, 3).join(", ")}{workspaceMembers.length > 3 ? "…" : ""}).
                  </p>
                )}
                {accesMode === "people" && (
                  <p>
                    Destinataires pré-remplis : {emails.length > 0 ? (
                      <strong>{emails.length} adresse{emails.length > 1 ? "s" : ""} sélectionnée{emails.length > 1 ? "s" : ""} ({emails.slice(0, 3).join(", ")}{emails.length > 3 ? "…" : ""})</strong>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Aucun destinataire sélectionné ci-dessus.</span>
                    )}
                  </p>
                )}
                {accesMode === "link" && (
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
