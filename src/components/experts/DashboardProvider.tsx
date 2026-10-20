"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

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
  acces?: "public" | "protege";
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
  activeTab: "metier" | "equipe";
  setActiveTab: (tab: "metier" | "equipe") => void;
  data: DashboardData | null;
  loading: boolean;
  activeUrl: string | null;
  copyShareLink: () => void;
  refresh: () => Promise<void>;
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

export function DashboardProvider({
  agentId,
  profile,
  agentName,
  children,
}: {
  agentId: string;
  profile: string | null;
  agentName: string;
  children: ReactNode;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"metier" | "equipe">("metier");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!agentId || !profile) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<DashboardData>(`/api/agents/${agentId}/experts/${encodeURIComponent(profile)}/dashboard`);
      setData(res);
      if (res.isDjeneba && activeTab === "metier" && !res.lien && res.teamViewLien) {
        // Pour Djénéba, si elle consulte d'abord la vue équipe
      }
    } catch (err) {
      console.warn("Erreur chargement dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [agentId, profile, activeTab]);

  useEffect(() => {
    if (panelOpen || dialogOpen) {
      void fetchDashboard();
    }
  }, [panelOpen, dialogOpen, fetchDashboard]);

  // Si l'utilisateur change d'expert, fermer le panel pour ne pas mélanger
  useEffect(() => {
    setPanelOpen(false);
    setDialogOpen(false);
    setData(null);
    setActiveTab("metier");
  }, [profile]);

  const activeUrl = useMemo(() => {
    if (!data) return null;
    if (activeTab === "equipe" && data.isDjeneba) {
      return data.teamViewLien || "/modeles/index-equipe.html";
    }
    return data.lien || data.previewUrl || null;
  }, [data, activeTab]);

  const copyShareLink = useCallback(() => {
    if (!activeUrl) {
      toast.error("Aucun lien de tableau de bord disponible.");
      return;
    }
    const fullUrl = activeUrl.startsWith("http")
      ? activeUrl
      : `${window.location.origin}${activeUrl}`;

    navigator.clipboard.writeText(fullUrl);
    toast.success("Lien du tableau de bord copié dans le presse-papier !");
  }, [activeUrl]);

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
        activeTab,
        setActiveTab,
        data,
        loading,
        activeUrl,
        copyShareLink,
        refresh: fetchDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
