// Copie dans public/logos/composio/ le logo de chaque connecteur du catalogue par défaut
// (DEFAULT_INTEGRATION_TOOLKITS, src/lib/integration-catalog.ts), pris chez Composio, pour que
// l'onglet Connecteurs et l'Aperçu les servent depuis l'app au lieu d'attendre logos.composio.dev.
//
//   node scripts/logos-composio.mjs
//
// Un fichier n'est gardé que s'il est un vrai SVG, nettoyé : ni prologue XML, ni DOCTYPE, ni
// commentaire, ni métadonnées d'éditeur ; refusé s'il porte du script, un attribut on*, un lien
// externe ou un objet étranger. Un slug ajouté au catalogue : relancer le script, puis LOCAL_LOGOS.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/logos/composio");
const catalog = await readFile(join(root, "src/lib/integration-catalog.ts"), "utf8");
const slugs = [...catalog.matchAll(/toolkit\("([a-z0-9_]+)"/g)].map((m) => m[1]);

const FORBIDDEN = [/<script/i, /\son[a-z]+\s*=/i, /javascript:/i, /<foreignObject/i, /<iframe/i, /<embed/i, /<object/i, /@import/i, /<!ENTITY/i, /href\s*=\s*["'](?!#|data:image\/)/i];

function clean(text) {
  const svg = text
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/gi, "")
    .trim();
  if (!/^<svg[\s>]/.test(svg) || !/<\/svg>$/.test(svg)) throw new Error("pas un SVG");
  const bad = FORBIDDEN.find((re) => re.test(svg));
  if (bad) throw new Error(`refusé (${bad})`);
  return svg + "\n";
}

await mkdir(out, { recursive: true });
let failed = 0;
for (const slug of slugs) {
  try {
    const res = await fetch(`https://logos.composio.dev/api/${slug}`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get("content-type") || "").includes("svg")) throw new Error(`type ${res.headers.get("content-type")}`);
    const svg = clean(await res.text());
    await writeFile(join(out, `${slug}.svg`), svg);
    console.log(`${slug}.svg  ${svg.length} octets`);
  } catch (e) {
    failed++;
    console.error(`${slug} : ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
