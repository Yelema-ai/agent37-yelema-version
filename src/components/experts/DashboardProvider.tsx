"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { ChatMessage } from "@/components/chat/types";

const WIDE = "(min-width: 85rem)";

export interface DashboardData {
  available: boolean;
  modelFile?: string;
  title?: string;
  role?: string;
  reader?: string;
  kpis?: string[];
  lien?: string | null;
  hebergeur?: string;
  maj?: string | null;
  pdfPath?: string | null;
  htmlPath?: string | null;
  previewUrl?: string;
  isDjeneba?: boolean;
  teamViewLien?: string | null;
  /** False where the back office does not keep shares (sharing is then unavailable). */
  sharing?: boolean;
  share?: { mode: ShareMode; people: string[]; updatedAt: string | null } | null;
  candidates?: { email: string; name: string | null }[];
  shareUrl?: string | null;
}

export type ShareMode = "team" | "people" | "link";
type ShareAnswer = Pick<DashboardData, "share" | "candidates" | "shareUrl">;

interface DashboardContextValue {
  agentId: string;
  profile: string | null;
  agentName: string;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  openDashboard: (targetUrl?: string) => void;
  setCustomUrl: (url: string | null) => void;
  activeTab: "metier" | "equipe";
  setActiveTab: (tab: "metier" | "equipe") => void;
  data: DashboardData | null;
  loading: boolean;
  isGenerating: boolean;
  triggerGeneration: () => Promise<void>;
  activeUrl: string | null;
  embedUrl: string | null;
  copyShareLink: () => void;
  refresh: () => Promise<void>;
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  updateSharing: (mode: ShareMode, people?: string[], regenerate?: boolean) => Promise<boolean>;
  stopSharing: () => Promise<boolean>;
  downloadPdf: () => void;
  downloadHtml: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useSafeDashboard() {
  return useContext(DashboardContext);
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

/**
 * Extrait le dernier lien de tableau de bord ou frame partage dans l'historique des messages.
 */
export function isTrustedDashboardUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/modeles/")) return true;
  try {
    const parsed = new URL(url);
    const h = parsed.hostname.toLowerCase();
    return (
      (h === "mstudio-frames.onrender.com" || h === "yelema-dashboards.onrender.com") &&
      parsed.pathname.startsWith("/share/frame/")
    );
  } catch {
    return false;
  }
}

export function extractDashboardLinkFromMessages(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m.content) continue;
    // 1. Liens Markdown
    const mdMatch = m.content.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/i);
    if (mdMatch && mdMatch[2] && isTrustedDashboardUrl(mdMatch[2])) {
      return mdMatch[2];
    }
    // 2. Liens directs pointant vers des frames sécurisés
    const bareMatch = m.content.match(/https?:\/\/[^\s\)\>\]"'`]+/i);
    if (bareMatch && isTrustedDashboardUrl(bareMatch[0])) {
      return bareMatch[0];
    }
  }
  return null;
}

export function DashboardProvider({
  agentId,
  profile,
  agentName,
  onTriggerTableau,
  isStreaming = false,
  messages = [],
  children,
}: {
  agentId: string;
  profile: string | null;
  agentName: string;
  onTriggerTableau?: () => void;
  isStreaming?: boolean;
  messages?: ChatMessage[];
  children: ReactNode;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"metier" | "equipe">("metier");
  const [data, setData] = useState<DashboardData | null>(null);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!agentId || !profile) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<DashboardData>(`/api/agents/${agentId}/experts/${encodeURIComponent(profile)}/dashboard`);
      setData(res);
    } catch (err) {
      console.warn("Erreur chargement dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [agentId, profile]);

  const openDashboard = useCallback((targetUrl?: string) => {
    if (targetUrl) {
      setCustomUrl(targetUrl);
    }
    if (typeof window !== "undefined" && window.matchMedia(WIDE).matches) {
      setPanelOpen(true);
    } else {
      setDialogOpen(true);
    }
  }, []);

  const triggerGeneration = useCallback(async () => {
    if (isGenerating || isStreaming) return;
    setIsGenerating(true);
    openDashboard();
    if (onTriggerTableau) {
      onTriggerTableau();
    }
  }, [isGenerating, isStreaming, openDashboard, onTriggerTableau]);

  // Polling pendant la generation pour recuperer le lien des qu'il est ecrit sur l'instance
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      void fetchDashboard();
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerating, fetchDashboard]);

  // Detection automatique du lien depuis les messages du chat
  const messageUrl = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return extractDashboardLinkFromMessages(messages);
  }, [messages]);

  // URL publique active (pour affichage, lien externe, partage)
  const activeUrl = useMemo(() => {
    if (activeTab === "equipe" && data?.isDjeneba) {
      return data.teamViewLien || customUrl || messageUrl || null;
    }
    return customUrl || data?.lien || messageUrl || null;
  }, [customUrl, data, messageUrl, activeTab]);

  // URL pour l'integration dans l'iframe (securisee par sandbox strict sans allow-same-origin)
  const embedUrl = useMemo(() => {
    if (!activeUrl) return null;
    if (
      activeUrl.startsWith("https://mstudio-frames.onrender.com/share/frame/") ||
      activeUrl.startsWith("https://yelema-dashboards.onrender.com/share/frame/")
    ) {
      if (agentId && profile) { return `/api/dashboards/frame?agentId=${encodeURIComponent(agentId)}&profile=${encodeURIComponent(profile)}`; } return activeUrl;
    }
    return activeUrl;
  }, [activeUrl]);

  // Quand le lien arrive alors qu'on generait
  useEffect(() => {
    if (isGenerating && activeUrl) {
      setIsGenerating(false);
      toast.success("Tableau de bord genere et mis en ligne sur Render !");
    }
  }, [isGenerating, activeUrl]);

  // Si le streaming du chat se termine alors qu'on etait en attente
  useEffect(() => {
    if (isGenerating && !isStreaming) {
      const timer = setTimeout(() => {
        void fetchDashboard().finally(() => {
          setIsGenerating(false);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isGenerating, fetchDashboard]);

  useEffect(() => {
    if (panelOpen || dialogOpen) {
      void fetchDashboard();
    }
  }, [panelOpen, dialogOpen, fetchDashboard]);

  // Si l'utilisateur change d'expert, fermer le panel et reinitialiser
  useEffect(() => {
    setPanelOpen(false);
    setDialogOpen(false);
    setShareModalOpen(false);
    setData(null);
    setCustomUrl(null);
    setIsGenerating(false);
    setActiveTab("metier");
  }, [profile]);

  const copyShareLink = useCallback(() => {
    if (!data?.shareUrl) {
      toast.error("Aucun lien de tableau de bord disponible.");
      return;
    }
    const fullUrl = `${window.location.origin}${data.shareUrl}`;

    navigator.clipboard.writeText(fullUrl);
    toast.success("Lien du tableau de bord copie dans le presse-papier !");
  }, [data?.shareUrl]);

  const sharePath = agentId && profile ? `/api/agents/${agentId}/experts/${encodeURIComponent(profile)}/dashboard` : null;

  const applyShare = useCallback(async (init: RequestInit): Promise<boolean> => {
    if (!sharePath) return false;
    try {
      const res = await apiFetch<ShareAnswer>(sharePath, init);
      setData((prev) => (prev ? { ...prev, share: res.share, candidates: res.candidates, shareUrl: res.shareUrl } : null));
      return true;
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Le partage n’a pas pu être enregistré.");
      return false;
    }
  }, [sharePath]);

  const updateSharing = useCallback(
    (mode: ShareMode, people: string[] = [], regenerate = false) =>
      applyShare({ method: "PATCH", body: JSON.stringify({ mode, people, regenerate }) }),
    [applyShare]
  );

  const stopSharing = useCallback(() => applyShare({ method: "DELETE" }), [applyShare]);

  const downloadPdf = useCallback(() => {
    if (data?.pdfPath) {
      const url = `/api/agents/${agentId}/files/content?path=${encodeURIComponent(data.pdfPath)}&disposition=attachment`;
      const a = document.createElement("a");
      a.href = url;
      a.download = data.pdfPath.split("/").pop() || `tableau-de-bord-${profile || "expert"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Telechargement du PDF demarre !");
    } else {
      toast.info("Impression / Enregistrement PDF en cours...");
      window.print();
    }
  }, [agentId, data?.pdfPath, profile]);

  const downloadHtml = useCallback(async () => {
    if (data?.htmlPath) {
      const url = `/api/agents/${agentId}/files/content?path=${encodeURIComponent(data.htmlPath)}&disposition=attachment`;
      const a = document.createElement("a");
      a.href = url;
      a.download = data.htmlPath.split("/").pop() || `tableau-de-bord-${profile || "expert"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Telechargement du HTML demarre !");
    } else if (embedUrl) {
      try {
        toast.info("Preparation du fichier HTML...");
        const res = await fetch(embedUrl);
        if (!res.ok) throw new Error("Erreur de recuperation");
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `tableau-de-bord-${profile || "expert"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("Fichier HTML telecharge !");
      } catch {
        toast.error("Echec du telechargement HTML.");
      }
    } else {
      toast.error("Aucun contenu disponible pour le telechargement.");
    }
  }, [agentId, data?.htmlPath, embedUrl, profile]);

  return (
    <DashboardContext.Provider
      value={{
        agentId,
        profile,
        agentName,
        panelOpen,
        setPanelOpen,
        dialogOpen,
        setDialogOpen,
        openDashboard,
        setCustomUrl,
        activeTab,
        setActiveTab,
        data,
        loading,
        isGenerating,
        triggerGeneration,
        activeUrl,
        embedUrl,
        copyShareLink,
        refresh: fetchDashboard,
        shareModalOpen,
        setShareModalOpen,
        updateSharing,
        stopSharing,
        downloadPdf,
        downloadHtml,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
