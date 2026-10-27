// What stays in the thread once a turn ends: the final answer only. The text an expert writes before each
// tool is a step (« Je cherche le devis… »), never a message; some runtimes still fold it into `output_text`.
// No imports, for `node --test`.

/** `output` without the narration written before each tool, in order; the last thing said when nothing follows. */
export function finalReply(output: string, narration: readonly string[]): string {
  let rest = output;
  for (const said of narration) {
    const at = rest.indexOf(said);
    if (at < 0 || rest.slice(0, at).trim()) break;
    rest = rest.slice(at + said.length);
  }
  return rest.trim() || narration.at(-1) || output;
}
