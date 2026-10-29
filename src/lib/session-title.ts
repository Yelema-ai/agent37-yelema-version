// A conversation's name in the list, in French. Hermes names a conversation opened by a command in
// English (« Run tableau command #4 »): the member reads what it was for (Leslie, 29/10).
const COMMANDS: Record<string, string> = {
  tableau: "Tableau de bord",
};

const COMMAND_TITLE = /^Run \/?([\w-]+) command(?: #\d+)?$/i;
const COMMAND_PREVIEW = /^\/([\w-]+)\s*$/;

export function sessionTitle(title: string | null | undefined, preview: string | null | undefined): string | null {
  const t = title?.trim() || "";
  const p = preview?.trim() || "";
  const command = COMMAND_TITLE.exec(t)?.[1] ?? (!t ? COMMAND_PREVIEW.exec(p)?.[1] : undefined);
  if (command) return COMMANDS[command.toLowerCase()] ?? `Commande ${command.toLowerCase()}`;
  return t || p || null;
}
