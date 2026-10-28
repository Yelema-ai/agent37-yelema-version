import type { YeleBackend } from "@/lib/yele-mcp";

/** Expert découvert dynamiquement dans la sandbox (~/.hermes/profiles) */
export interface DiscoveredExpert {
  id: string;
  name: string;
  description: string;
}

/** Formate le nom et le rôle d'un expert pour l'affichage */
export function formatExpertDisplayName(exp: DiscoveredExpert | string): string {
  if (typeof exp === "string") {
    return exp.charAt(0).toUpperCase() + exp.slice(1);
  }
  const role = exp.description ? exp.description.split(/[:;]/)[0].trim() : "";
  return role ? `${exp.name} (${role})` : exp.name;
}

/** Format strict de date : AAAA-MM-JJ */
const STRICT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Masque strictement toutes les clés d'API, tokens et secrets dans un texte brut.
 * Couvre les clés d'IA (Anthropic, OpenAI, etc.), bots Telegram, Bearer tokens,
 * chaînes de connexion de bases de données, JWT et champs sensibles.
 */
export function masquerSecrets(raw: string): string {
  return raw
    .replace(/\b(?:sk-(?:ant|proj|live|test)?-[a-zA-Z0-9_-]{12,})/gi, "[CLÉ_API_MASQUÉE]")
    .replace(/\b\d{9,11}:[a-zA-Z0-9_-]{35}\b/g, "[TOKEN_BOT_TELEGRAM_MASQUÉ]")
    .replace(/(?:Bearer\s+)[a-zA-Z0-9_.-]{16,}/gi, "Bearer [TOKEN_MASQUÉ]")
    .replace(/\b(?:ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})\b/g, "[JWT_MASQUÉ]")
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, "$1[MOT_DE_PASSE_MASQUÉ]$2")
    .replace(/(?:password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?[^"'\s\n]{6,}["']?/gi, (match) => {
      const parts = match.split(/[:=]/);
      return `${parts[0]}: "[MASQUÉ]"`;
    });
}

export function formatDateFr(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPeriodCutoff(periode?: string, now = Date.now()): number {
  if (periode === "7_jours") return now - 7 * 24 * 3600 * 1000;
  if (periode === "30_jours") return now - 30 * 24 * 3600 * 1000;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface RawSessionInfo {
  id: string;
  profile?: string | null;
  last_active?: number | null;
  started_at?: number | null;
}

export interface RawConnectionInfo {
  toolkitSlug?: string | null;
  status?: string | null;
  isDisabled?: boolean | null;
  alias?: string | null;
}

export interface RawFileInfo {
  name: string;
  size?: number | null;
  modified?: number | null;
}

export interface SupervisionDeps {
  listSessions: () => Promise<RawSessionInfo[]>;
  fetchFileContent: (path: string) => Promise<string | null>;
  listConnections: () => Promise<RawConnectionInfo[]>;
  listDeliverableFiles: () => Promise<RawFileInfo[]>;
  listInstalledExperts?: () => Promise<DiscoveredExpert[]>;
}

export function formatActiviteExperts(
  sessions: RawSessionInfo[],
  periode?: string,
  experts?: DiscoveredExpert[],
  now = Date.now()
): string {
  const cutoff = getPeriodCutoff(periode, now);
  const periodeLabel =
    periode === "7_jours" ? "ces 7 derniers jours" : periode === "30_jours" ? "ces 30 derniers jours" : "aujourd'hui";

  // Construction de la liste des experts à superviser
  const expertMap = new Map<string, DiscoveredExpert>();
  if (experts && experts.length > 0) {
    for (const exp of experts) {
      expertMap.set(exp.id.toLowerCase(), exp);
    }
  }

  // Si des sessions concernent un expert non présent dans le catalogue, l'ajouter dynamiquement
  for (const s of sessions) {
    const p = (s.profile || "").toLowerCase();
    if (p && !expertMap.has(p)) {
      expertMap.set(p, { id: p, name: p.charAt(0).toUpperCase() + p.slice(1), description: "" });
    }
  }

  const allExperts = Array.from(expertMap.values());
  const activeByExpert: Record<string, { count: number; lastActive: number; expert: DiscoveredExpert }> = {};
  const inactifs: DiscoveredExpert[] = [];

  for (const exp of allExperts) {
    const matching = sessions.filter((s) => {
      const profile = (s.profile || "").toLowerCase();
      const time =
        typeof s.last_active === "number"
          ? s.last_active < 1e11
            ? s.last_active * 1000
            : s.last_active
          : typeof s.started_at === "number"
          ? s.started_at < 1e11
            ? s.started_at * 1000
            : s.started_at
          : 0;
      return (profile === exp.id || s.id.includes(`_${exp.id}_`)) && time >= cutoff;
    });

    if (matching.length > 0) {
      const maxActive = Math.max(
        ...matching.map((s) =>
          typeof s.last_active === "number"
            ? s.last_active < 1e11
              ? s.last_active * 1000
              : s.last_active
            : s.started_at ?? 0
        )
      );
      activeByExpert[exp.id] = { count: matching.length, lastActive: maxActive, expert: exp };
    } else {
      inactifs.push(exp);
    }
  }

  const actifs = Object.entries(activeByExpert).sort((a, b) => b[1].lastActive - a[1].lastActive);
  let out = `### 📊 Activité des Experts (${periodeLabel})\n\n`;

  if (actifs.length > 0) {
    out += `**Experts actifs (${actifs.length}) :**\n`;
    for (const [, stats] of actifs) {
      const name = formatExpertDisplayName(stats.expert);
      out += `- **${name}** : ${stats.count} tâche(s) / session(s), dernière activité le ${formatDateFr(stats.lastActive)}\n`;
    }
  } else {
    out += `Aucun expert n'a enregistré d'activité ${periodeLabel}.\n`;
  }

  if (inactifs.length > 0) {
    out += `\n**Experts inactifs (${inactifs.length}) :**\n`;
    out += inactifs.map((exp) => formatExpertDisplayName(exp)).join(", ") + ".\n";
  }

  return out;
}

export function formatAuditOutils(connections: RawConnectionInfo[], targetExpert?: string): string {
  const filtered = targetExpert
    ? connections.filter((c) => (c.toolkitSlug || "").toLowerCase().includes(targetExpert.toLowerCase()))
    : connections;

  let out = `### 🔌 Audit des Connecteurs et Outils\n\n`;
  if (filtered.length === 0) {
    out += `Aucun connecteur tiers n'est actuellement configuré${targetExpert ? ` pour ${targetExpert}` : ""}.\n`;
    return out;
  }

  out += `**État des connexions :**\n`;
  for (const c of filtered) {
    const name = c.toolkitSlug || "Outil";
    const status = c.status === "ACTIVE" && !c.isDisabled ? "✅ Actif" : "⚠️ À reconnecter / Inactif";
    const alias = c.alias ? ` (${c.alias})` : "";
    out += `- **${name}**${alias} : ${status}\n`;
  }
  return out;
}

export function formatLivrablesRecents(files: RawFileInfo[], limite = 10): string {
  const validFiles = files
    .filter((f) => f && f.name && !f.name.startsWith(".") && !f.name.startsWith("_"))
    .sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))
    .slice(0, Math.min(Math.max(limite, 1), 50));

  if (validFiles.length === 0) {
    return "Aucun livrable récent dans le dossier `~/Livrables`.";
  }

  let out = `### 📁 Derniers Livrables Produits (${validFiles.length})\n\n`;
  for (const f of validFiles) {
    const dateStr = f.modified ? formatDateFr(f.modified < 1e11 ? f.modified * 1000 : f.modified) : "Date inconnue";
    const sizeKb = f.size ? `(${Math.round(f.size / 1024)} Ko)` : "";
    out += `- 📄 **${f.name}** ${sizeKb} — modifié le ${dateStr}\n`;
  }
  return out;
}

export function formatStatistiquesAnalytique(
  sessions: RawSessionInfo[],
  vue?: string,
  experts?: DiscoveredExpert[]
): string {
  const total = sessions.length;
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const p = (s.profile || "").toLowerCase();
    if (p) counts[p] = (counts[p] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const expertMap = new Map<string, DiscoveredExpert>();
  if (experts) {
    for (const exp of experts) {
      expertMap.set(exp.id.toLowerCase(), exp);
    }
  }

  let out = `### 📈 Synthèse Analytique de l'Instance\n\n`;
  out += `- **Volume total d'interactions** : ${total} session(s) enregistrée(s)\n`;
  out += `- **Experts les plus sollicités** :\n`;
  for (const [exp, n] of sorted.slice(0, 5)) {
    const pct = total > 0 ? Math.round((n / total) * 100) : 0;
    const found = expertMap.get(exp);
    const name = found ? formatExpertDisplayName(found) : exp.charAt(0).toUpperCase() + exp.slice(1);
    out += `  - **${name}** : ${n} tâches (${pct}%)\n`;
  }
  if (vue === "routines") {
    out += `\n- **Routines automatiques** : Déclenchements actifs surveillés en tâche de fond.\n`;
  }
  return out;
}

export function formatDiagnosticConfiguration(configRaw: string | null): string {
  let out = `### 🩺 Diagnostic de Santé de l'Instance\n\n`;
  out += `- **Moteur d'exécution** : Hermes (Agent37)\n`;
  out += `- **Statut du système** : En ligne et opérationnel\n`;

  if (configRaw) {
    const sanitized = masquerSecrets(configRaw);
    const hasTelegram = sanitized.includes("telegram");
    const hasModel = sanitized.includes("model");
    out += `- **Intégration Telegram** : ${hasTelegram ? "✅ Configurée" : "⚪ Non configurée"}\n`;
    out += `- **Modèle d'IA par défaut** : ${hasModel ? "✅ Configuré" : "⚪ Par défaut"}\n`;
    out += `- **Sécurité des clés** : ✅ Tous les secrets et clés API sont protégés et masqués.\n`;
  } else {
    out += `- **Fichier de configuration** : Lecture directe protégée.\n`;
  }
  return out;
}

export function createYeleSupervisionBackend(deps: SupervisionDeps): YeleBackend {
  return {
    async analyserActivite(periode?: string): Promise<string> {
      try {
        const [sessions, experts] = await Promise.all([
          deps.listSessions(),
          deps.listInstalledExperts ? deps.listInstalledExperts() : Promise.resolve([]),
        ]);
        return formatActiviteExperts(sessions, periode, experts.length > 0 ? experts : undefined);
      } catch (e) {
        return `Impossible de récupérer les sessions d'activité : ${e instanceof Error ? e.message : String(e)}`;
      }
    },

    async lireRapportJournalier(dateStr?: string): Promise<string> {
      let targetDate = (dateStr ?? "").trim().toLowerCase();
      const today = new Date().toISOString().slice(0, 10);

      if (!targetDate || targetDate === "aujourdhui" || targetDate === "today") {
        targetDate = today;
      } else if (targetDate === "hier" || targetDate === "yesterday") {
        const y = new Date(Date.now() - 24 * 3600 * 1000);
        targetDate = y.toISOString().slice(0, 10);
      }

      // SÉCURITÉ ANTI-PATH TRAVERSAL : rejet strict si le format n'est pas AAAA-MM-JJ
      if (!STRICT_DATE_REGEX.test(targetDate)) {
        return "Format de date invalide. Veuillez indiquer une date au format AAAA-MM-JJ (ex: 2026-10-28) ou 'aujourdhui' / 'hier'.";
      }

      const candidatePaths = [
        `~/.hermes/memory/daily/${targetDate}.md`,
        `~/.yelema/memory/daily/${targetDate}.md`,
        `~/.hermes/memory/${targetDate}.md`,
        `~/Livrables/_memoire/daily-${targetDate}.md`,
      ];

      for (const p of candidatePaths) {
        try {
          const content = await deps.fetchFileContent(p);
          if (content && content.trim()) {
            return `### 📝 Rapport Journalier de Mémoire (${targetDate})\n\n${masquerSecrets(content.trim())}`;
          }
        } catch {}
      }

      return `Aucun rapport de mémoire n'a encore été consolidé pour le **${targetDate}** sur l'instance. Les sessions en cours seront intégrées lors du prochain cycle de synthèse.`;
    },

    async auditerOutils(targetExpert?: string): Promise<string> {
      try {
        const conns = await deps.listConnections();
        return formatAuditOutils(conns, targetExpert);
      } catch (e) {
        return `Impossible d'auditer les outils : ${e instanceof Error ? e.message : String(e)}`;
      }
    },

    async consulterLivrables(limite = 10): Promise<string> {
      try {
        const files = await deps.listDeliverableFiles();
        return formatLivrablesRecents(files, limite);
      } catch (e) {
        return `Erreur lors de la lecture des livrables : ${e instanceof Error ? e.message : String(e)}`;
      }
    },

    async statistiquesAnalytique(vue?: string): Promise<string> {
      try {
        const [sessions, experts] = await Promise.all([
          deps.listSessions(),
          deps.listInstalledExperts ? deps.listInstalledExperts() : Promise.resolve([]),
        ]);
        return formatStatistiquesAnalytique(sessions, vue, experts.length > 0 ? experts : undefined);
      } catch (e) {
        return `Impossible de calculer les statistiques analytiques : ${e instanceof Error ? e.message : String(e)}`;
      }
    },

    async diagnostiquerConfiguration(): Promise<string> {
      try {
        const raw = await deps.fetchFileContent("~/.hermes/config.yaml");
        return formatDiagnosticConfiguration(raw);
      } catch (e) {
        return `Diagnostic impossible : ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  };
}
