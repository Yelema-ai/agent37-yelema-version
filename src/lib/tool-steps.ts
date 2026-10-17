// What an expert is doing, in the member's words, from a tool call of the chat stream. Never a tool
// or code name: an unknown tool reads as a generic phrase. No imports, for `node --test`.

const PHRASES: Record<string, string> = {
  web_search: "Recherche sur le web…",
  web_extract: "Lit une page web…",
  web_crawl: "Lit des pages web…",
  skills_list: "Consulte ses méthodes…",
  skill_manage: "Met à jour sa méthode…",
  memory: "Met à jour sa mémoire…",
  session_search: "Relit ses conversations passées…",
  read_file: "Parcourt ses dossiers…",
  search_files: "Parcourt ses dossiers…",
  write_file: "Écrit un fichier…",
  patch: "Modifie un fichier…",
  terminal: "Prépare un document…",
  process: "Prépare un document…",
  execute_code: "Prépare un document…",
  delegate_task: "Confie une partie du travail…",
  todo: "Organise son travail…",
  vision_analyze: "Regarde une image…",
  image_generate: "Crée une image…",
  text_to_speech: "Prépare un message vocal…",
  cronjob: "Programme une routine…",
  send_message: "Envoie un message…",
  clarify: "Prépare une question pour vous…",
};

export const GENERIC_STEP = "Avance sur votre demande…";
const CONNECTED = "Utilise un outil connecté…";

// Connected apps by the prefix of their action (GMAIL_FETCH_EMAILS, GOOGLECALENDAR_EVENTS_LIST…).
const APPS: [prefix: string, phrase: string][] = [
  ["GMAIL_SEND", "Envoie un e-mail…"],
  ["GMAIL", "Lit les e-mails…"],
  ["OUTLOOK_SEND", "Envoie un e-mail…"],
  ["OUTLOOK", "Lit les e-mails…"],
  ["GOOGLECALENDAR", "Consulte l’agenda…"],
  ["GOOGLEDRIVE", "Ouvre Google Drive…"],
  ["GOOGLEDOCS", "Ouvre un document Google…"],
  ["GOOGLESHEETS", "Ouvre un tableur Google…"],
  ["ONE_DRIVE", "Ouvre OneDrive…"],
  ["SHAREPOINT", "Ouvre SharePoint…"],
  ["SLACK", "Consulte Slack…"],
  ["NOTION", "Consulte Notion…"],
  ["HUBSPOT", "Consulte le CRM…"],
  ["SALESFORCE", "Consulte le CRM…"],
  ["TRELLO", "Consulte Trello…"],
  ["LINEAR", "Consulte Linear…"],
  ["GITHUB", "Consulte GitHub…"],
];

function appPhrase(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const upper = slug.toUpperCase();
  return APPS.find(([prefix]) => upper.startsWith(prefix))?.[1] ?? null;
}

// The app a Composio call targets: one action, or the first of a batch.
function composioPhrase(tool: string, args: Record<string, unknown> | undefined): string {
  if (/SEARCH_TOOLS|GET_TOOL_SCHEMAS/.test(tool)) return "Cherche le bon outil connecté…";
  const batch = Array.isArray(args?.tools) ? (args.tools as { tool_slug?: unknown }[]) : [];
  return appPhrase(args?.tool_slug) ?? appPhrase(batch[0]?.tool_slug) ?? appPhrase(tool) ?? CONNECTED;
}

// "mcp__memoire__demander" → ["memoire", "demander"]; an older "mcp_memoire_demander" keeps its server.
function mcpParts(tool: string): [server: string, name: string] | null {
  if (tool.startsWith("mcp__")) {
    const [, server = "", ...rest] = tool.split("__");
    return [server, rest.join("__")];
  }
  const m = /^mcp_([a-z0-9-]+)_(.+)$/i.exec(tool);
  return m ? [m[1], m[2]] : null;
}

export function toolPhrase(tool: string, args?: Record<string, unknown>): string {
  const mcp = mcpParts(tool);
  if (mcp) {
    const [server, name] = mcp;
    if (server === "memoire") return "Consulte la mémoire de l’entreprise…";
    if (server === "apps" || name.startsWith("COMPOSIO_")) return composioPhrase(name, args);
    return CONNECTED;
  }
  if (tool.startsWith("COMPOSIO_")) return composioPhrase(tool, args);
  if (tool === "skill_view") {
    const skill = typeof args?.name === "string" ? args.name.toLowerCase() : "";
    return /r[eè]gle|poste/.test(skill) ? "Ouvre ses règles du poste…" : "Consulte sa méthode…";
  }
  if (tool.startsWith("browser_")) return "Navigue sur le web…";
  return PHRASES[tool] ?? GENERIC_STEP;
}

// The phrase as a finished step, for the « Étapes » list.
export function stepDone(phrase: string): string {
  return phrase.replace(/…$/, "");
}
