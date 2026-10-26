// Hermes attaches a file by writing `MEDIA:<path>` in its reply (Telegram sends it as a document). On the
// web the tag never shows: the file under Livrables becomes a card, any other path is dropped. No imports.

const TAG =
  /[`"'*_]{0,3}MEDIA:\s*(?:`([^`\n]+)`|"([^"\n]+)"|'([^'\n]+)'|((?:~\/|\/|Livrables\/)[^\n]*?\.[A-Za-z0-9]{1,6}))(?=[\s`"'*_,;:)\]}]|MEDIA:|$)[`"'*_]{0,3}/g;
// A line left with nothing but a bullet or punctuation, or still holding a tag being written (streaming).
const EMPTY_LINE = /^[\s\-*•·;:,.]*$/;
const TAG_LINE = /^[\s\-*•·>]*[`"'*_]{0,3}MEDIA:/;

/** `~/Livrables/…` for a path the expert wrote home-relative or absolute; null outside Livrables. */
function drivePath(raw: string): string | null {
  const p = raw.trim().replace(/^\/home\/[^/]+\//, "~/").replace(/^Livrables\//, "~/Livrables/");
  return p.startsWith("~/Livrables/") && !p.split("/").includes("..") ? p : null;
}

/** The reply without its MEDIA tags, and the Livrables files they named (in order, once each). */
export function mediaTags(text: string): { text: string; paths: string[] } {
  if (!text.includes("MEDIA:")) return { text, paths: [] };
  const paths: string[] = [];
  const lines = text.split("\n").flatMap((line) => {
    if (!line.includes("MEDIA:")) return [line];
    const kept = line.replace(TAG, (_m, a?: string, b?: string, c?: string, d?: string) => {
      const p = drivePath(a ?? b ?? c ?? d ?? "");
      if (p && !paths.includes(p)) paths.push(p);
      return "";
    });
    return EMPTY_LINE.test(kept) || TAG_LINE.test(kept) ? [] : [kept.trimEnd()];
  });
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n"), paths };
}
