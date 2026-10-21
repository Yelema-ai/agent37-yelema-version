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
  acces?: "public" | "workspace" | "emails";
  allowedEmails?: string[];
  pdfPath?: string | null;
  htmlPath?: string | null;
  previewUrl?: string;
  isDjeneba?: boolean;
  teamViewLien?: string | null;
}

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
  updateSharing: (acces: "public" | "workspace" | "emails", allowedEmails?: string[]) => Promise<boolean>;
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
export function extractDashboardLinkFromMessages(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m.content) continue;
    // 1. Liens Markdown comme [Ouvrir le tableau...](URL) ou [Tableau...](URL)
    const mdMatch =
      m.content.match(/\[([^\]]*(?:tableau|frame|ouvrir|accéder|acceder)[^\]]*)\]\((https?:\/\/[^\s\)]+)\)/i) ||
      m.content.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]*(?:onrender\.com|\/share\/frame\/)[^\s\)]*)\)/i);
    if (mdMatch && mdMatch[2]) {
      return mdMatch[2];
    }
    // 2. Liens directs pointant vers Render frames
    const bareMatch = m.content.match(/https?:\/\/[^\s\)\>\]"'`]+(?:onrender\.com|\/share\/frame\/)[^\s\)\>\]"'`]+/i);
    if (bareMatch) {
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

  // URL pour l'integration dans l'iframe (utilise le proxy si c'est une URL externe afin d'eviter X-Frame-Options: DENY)
  const embedUrl = useMemo(() => {
    if (!activeUrl) return null;
    if (activeUrl.startsWith("http://") || activeUrl.startsWith("https://")) {
      return `/api/dashboards/preview?url=${encodeURIComponent(activeUrl)}`;
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
    if (!activeUrl) {
      toast.error("Aucun lien de tableau de bord disponible.");
      return;
    }
    const fullUrl = activeUrl.startsWith("http")
      ? activeUrl
      : `${window.location.origin}${activeUrl}`;

    navigator.clipboard.writeText(fullUrl);
    toast.success("Lien du tableau de bord copie dans le presse-papier !");
  }, [activeUrl]);

  const updateSharing = useCallback(
    async (acces: "public" | "workspace" | "emails", allowedEmails: string[] = [], showToast = false): Promise<boolean> => {
      if (!agentId || !profile) return false;
      try {
        const res = await apiFetch<{ ok: boolean; acces: "public" | "workspace" | "emails"; allowedEmails: string[] }>(
          `/api/agents/${agentId}/experts/${encodeURIComponent(profile)}/dashboard`,
          {
            method: "PATCH",
            body: JSON.stringify({ acces, allowedEmails }),
          }
        );
        setData((prev) => (prev ? { ...prev, acces: res.acces, allowedEmails: res.allowedEmails } : null));
        if (showToast) toast.success("Droits d'accès enregistrés !");
        return true;
      } catch (err) {
        toast.error("Erreur lors de l'enregistrement des acces.");
        return false;
      }
    },
    [agentId, profile]
  );

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
        downloadPdf,
        downloadHtml,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
