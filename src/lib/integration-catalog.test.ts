import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_INTEGRATION_TOOLKITS, composioLogoUrl, isLocalLogo } from "./integration-catalog.ts";

test("every catalog connector has its logo in the app, a clean SVG", () => {
  for (const t of DEFAULT_INTEGRATION_TOOLKITS) {
    assert.equal(t.logo, `/logos/composio/${t.slug}.svg`, t.slug);
    assert.ok(isLocalLogo(t.logo));
    const file = new URL(`../../public${t.logo}`, import.meta.url);
    assert.ok(existsSync(file), `${t.slug} : logo manquant (node scripts/logos-composio.mjs)`);
    const svg = readFileSync(file, "utf8");
    assert.match(svg, /^<svg[\s>]/, t.slug);
    assert.doesNotMatch(svg, /<script|\son[a-z]+\s*=|javascript:|<foreignObject/i, t.slug);
  }
});

test("a slug outside the catalog keeps Composio's address", () => {
  assert.equal(composioLogoUrl("GMAIL"), "/logos/composio/gmail.svg");
  assert.equal(composioLogoUrl("asana"), "https://logos.composio.dev/api/asana");
  assert.equal(isLocalLogo(composioLogoUrl("asana")), false);
  assert.equal(isLocalLogo(null), false);
});
