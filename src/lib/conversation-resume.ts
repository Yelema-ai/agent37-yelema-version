// « Reprendre dans mon espace » : une conversation partagée devient le début d'une conversation à soi.
// Le texte part en premier message, marqué, borné ; l'Expert ne répond qu'une phrase d'accueil.

export const RESUME_MARK = "[Conversation reprise]";
const MAX_SEED = 24_000;

export interface ResumeLine {
  role: "user" | "assistant";
  content: string;
}

/** Le premier message de la conversation reprise : la fin de la conversation si elle est trop longue. */
export function resumeSeed(lines: readonly ResumeLine[], owner: string, expert: string): string {
  const head = `${RESUME_MARK} Conversation partagée par ${owner || "un collègue"} avec ${expert}, reprise ici. Lis-la comme le contexte de la suite ; ne la résume pas. Réponds seulement : « Conversation reprise. Je vous écoute. »`;
  const body: string[] = [];
  let size = 0;
  for (const l of [...lines].reverse()) {
    const block = `${l.role === "user" ? "Question" : "Réponse"} : ${l.content.trim()}`;
    if (size + block.length > MAX_SEED) break;
    body.unshift(block);
    size += block.length + 2;
  }
  const cut = body.length < lines.length ? "(Début de la conversation omis.)\n\n" : "";
  return `${head}\n\n${cut}${body.join("\n\n")}`;
}

export const isResumeSeed = (text: string) => text.startsWith(RESUME_MARK);
