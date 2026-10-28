import assert from "node:assert/strict";
import { test } from "node:test";
import {
  masquerSecrets,
  formatActiviteExperts,
  formatAuditOutils,
  formatLivrablesRecents,
  formatStatistiquesAnalytique,
  formatDiagnosticConfiguration,
  createYeleSupervisionBackend,
  type DiscoveredExpert,
  type RawSessionInfo,
} from "./yele-supervision.ts";

test("masquerSecrets: hides API keys, tokens, and passwords without leaking", () => {
  const sensitive = `
    ANTHROPIC_API_KEY: sk-ant-api03-abcdef1234567890abcdef1234567890-test
    TELEGRAM_BOT_TOKEN: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
    Authorization: Bearer mySecretToken1234567890abcdef
    client_secret: "superSecretPassword123"
  `;

  const masked = masquerSecrets(sensitive);

  assert.doesNotMatch(masked, /sk-ant-api03/);
  assert.doesNotMatch(masked, /1234567890:ABCdef/);
  assert.doesNotMatch(masked, /mySecretToken1234567890/);
  assert.doesNotMatch(masked, /superSecretPassword123/);

  assert.match(masked, /\[MASQUÉ\]/);
  assert.match(masked, /\[TOKEN_MASQUÉ\]/);
});

test("masquerSecrets: hides JWTs and Postgres connection strings", () => {
  const text =
    "postgres://myuser:secretPassword123@db.example.com:5432/mydb and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignatureValue123";
  const masked = masquerSecrets(text);
  assert.doesNotMatch(masked, /secretPassword123/);
  assert.doesNotMatch(masked, /doNotLeakThisSignatureValue123/);
  assert.match(masked, /\[MOT_DE_PASSE_MASQUÉ\]/);
  assert.match(masked, /\[JWT_MASQUÉ\]/);
});

test("formatActiviteExperts: dynamiquement avec liste d'experts découverts", () => {
  const now = 1730000000000;
  const experts: DiscoveredExpert[] = [
    { id: "fatima", name: "Fatima", description: "Marketing et contenu : campagnes, création de contenu..." },
    { id: "kouassi", name: "Kouassi", description: "Commercial et ventes : pipeline, prospection..." },
    { id: "adjoua", name: "Adjoua", description: "Recrutement : sourcing, tri de candidatures..." },
  ];
  const sessions: RawSessionInfo[] = [
    { id: "s1", profile: "fatima", last_active: now - 3600000 },
    { id: "s2", profile: "kouassi", last_active: now - 7200000 },
  ];

  const out = formatActiviteExperts(sessions, "aujourdhui", experts, now);
  assert.match(out, /Fatima \(Marketing et contenu\)/);
  assert.match(out, /Kouassi \(Commercial et ventes\)/);
  assert.match(out, /Experts inactifs \(1\)/);
  assert.match(out, /Adjoua \(Recrutement\)/);
});

test("formatActiviteExperts: repli dynamique si experts non fournis (découverte par sessions)", () => {
  const now = 1730000000000;
  const sessions: RawSessionInfo[] = [
    { id: "s1", profile: "djeneba", last_active: now - 1000 },
  ];

  const out = formatActiviteExperts(sessions, "aujourdhui", undefined, now);
  assert.match(out, /Djeneba/);
  assert.match(out, /Experts actifs \(1\)/);
});

test("formatAuditOutils: lists active and inactive connectors", () => {
  const out = formatAuditOutils([
    { toolkitSlug: "gmail", status: "ACTIVE", isDisabled: false, alias: "pro" },
    { toolkitSlug: "hubspot", status: "FAILED", isDisabled: false },
  ]);

  assert.match(out, /\*\*gmail\*\* \(pro\) : ✅ Actif/);
  assert.match(out, /\*\*hubspot\*\* : ⚠️ À reconnecter \/ Inactif/);
});

test("formatLivrablesRecents: formats list of files ignoring hidden ones", () => {
  const out = formatLivrablesRecents([
    { name: "rapport.xlsx", size: 10240, modified: Date.now() },
    { name: ".hidden", size: 50 },
    { name: "_memoire.md", size: 100 },
  ]);

  assert.match(out, /\*\*rapport\.xlsx\*\* \(10 Ko\)/);
  assert.doesNotMatch(out, /\.hidden/);
  assert.doesNotMatch(out, /_memoire\.md/);
});

test("formatStatistiquesAnalytique: shows total sessions and top experts with dynamic roles", () => {
  const experts: DiscoveredExpert[] = [
    { id: "fatima", name: "Fatima", description: "Marketing : campagnes..." },
    { id: "kouassi", name: "Kouassi", description: "Commercial : ventes..." },
  ];
  const sessions: RawSessionInfo[] = [
    { id: "1", profile: "fatima" },
    { id: "2", profile: "fatima" },
    { id: "3", profile: "kouassi" },
  ];
  const out = formatStatistiquesAnalytique(sessions, "synthese", experts);
  assert.match(out, /3 session\(s\)/);
  assert.match(out, /\*\*Fatima \(Marketing\)\*\* : 2 tâches \(67%\)/);
  assert.match(out, /\*\*Kouassi \(Commercial\)\*\* : 1 tâches \(33%\)/);
});

test("createYeleSupervisionBackend: connects supervision deps to YeleBackend interface", async () => {
  const b = createYeleSupervisionBackend({
    listInstalledExperts: async () => [
      { id: "fatima", name: "Fatima", description: "Marketing : création..." },
    ],
    listSessions: async () => [{ id: "1", profile: "fatima", last_active: Date.now() }],
    fetchFileContent: async (path) => (path.includes("daily") ? "Rapport du jour" : "model: claude-3-5"),
    listConnections: async () => [{ toolkitSlug: "gmail", status: "ACTIVE", isDisabled: false }],
    listDeliverableFiles: async () => [{ name: "doc.docx", size: 2048, modified: Date.now() }],
  });

  const act = await b.analyserActivite();
  assert.match(act, /Fatima/);

  const rep = await b.lireRapportJournalier("2026-10-28");
  assert.match(rep, /Rapport du jour/);

  const conns = await b.auditerOutils();
  assert.match(conns, /gmail/);

  const liv = await b.consulterLivrables();
  assert.match(liv, /doc\.docx/);

  const diag = await b.diagnostiquerConfiguration();
  assert.match(diag, /Hermes/);
});

test("lireRapportJournalier: rejects path traversal attempts", async () => {
  const b = createYeleSupervisionBackend({
    listSessions: async () => [],
    fetchFileContent: async () => "FICHIER_SECRET",
    listConnections: async () => [],
    listDeliverableFiles: async () => [],
  });

  const res1 = await b.lireRapportJournalier("../../../etc/passwd");
  assert.match(res1, /Format de date invalide/);

  const res2 = await b.lireRapportJournalier("2026-10-28/../../etc");
  assert.match(res2, /Format de date invalide/);

  const res3 = await b.lireRapportJournalier("2026-10-28; rm -rf");
  assert.match(res3, /Format de date invalide/);
});
