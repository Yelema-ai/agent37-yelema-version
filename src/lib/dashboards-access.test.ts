import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateDashboardAccess,
  getDashboardMeta,
  getDashboardStateCandidatePaths,
  isTrustedDashboardUrl,
  normalizeDashboardAccess,
} from "./dashboards.ts";

test("normalizeDashboardAccess: sécurisation par défaut et normalisation stricte", () => {
  // Règles explicites valides
  assert.equal(normalizeDashboardAccess("public"), "public");
  assert.equal(normalizeDashboardAccess("PUBLIC"), "public");
  assert.equal(normalizeDashboardAccess("  public  "), "public");

  assert.equal(normalizeDashboardAccess("workspace"), "workspace");
  assert.equal(normalizeDashboardAccess("WORKSPACE"), "workspace");

  assert.equal(normalizeDashboardAccess("emails"), "emails");
  assert.equal(normalizeDashboardAccess("Emails"), "emails");

  // Repli sécurisé : toute valeur absente, invalide ou inconnue donne STRICTEMENT "workspace"
  assert.equal(normalizeDashboardAccess(undefined), "workspace");
  assert.equal(normalizeDashboardAccess(null), "workspace");
  assert.equal(normalizeDashboardAccess(""), "workspace");
  assert.equal(normalizeDashboardAccess("protege"), "workspace");
  assert.equal(normalizeDashboardAccess("unknown_rule"), "workspace");
  assert.equal(normalizeDashboardAccess(123), "workspace");
  assert.equal(normalizeDashboardAccess({}), "workspace");
});

test("getDashboardMeta: résolution des profils et protection contre les traversées de chemin", () => {
  // Profils valides connus
  const mamadou = getDashboardMeta("mamadou");
  assert.ok(mamadou);
  assert.equal(mamadou.modelFile, "finance.html");

  const adjoua = getDashboardMeta("adjoua");
  assert.ok(adjoua);
  assert.equal(adjoua.modelFile, "recrutement.html");

  // Normalisation avec version
  const djeneba = getDashboardMeta("djeneba@v2");
  assert.ok(djeneba);
  assert.equal(djeneba.modelFile, "direction.html");

  // Rejet des traversées de chemin et profils invalides
  assert.equal(getDashboardMeta("../mamadou"), null);
  assert.equal(getDashboardMeta(".."), null);
  assert.equal(getDashboardMeta(""), null);
  assert.equal(getDashboardMeta(null), null);
  assert.equal(getDashboardMeta("profil_inexistant_99"), null);
});

test("isTrustedDashboardUrl: validation stricte des domaines et chemins Render", () => {
  const valid1 = "https://mstudio-frames.onrender.com/share/frame/c0a80123-4567-89ab-cdef-0123456789ab";
  const valid2 = "https://yelema-dashboards.onrender.com/share/frame/11112222-3333-4444-5555-666677778888";
  assert.equal(isTrustedDashboardUrl(valid1), true);
  assert.equal(isTrustedDashboardUrl(valid2), true);

  // Rejet protocole non sécurisé
  assert.equal(isTrustedDashboardUrl("http://mstudio-frames.onrender.com/share/frame/c0a80123-4567-89ab-cdef-0123456789ab"), false);

  // Rejet domaines arbitraires (prévention phishing / SSRF)
  assert.equal(isTrustedDashboardUrl("https://evil.com/share/frame/c0a80123-4567-89ab-cdef-0123456789ab"), false);
  assert.equal(isTrustedDashboardUrl("https://onrender.com/share/frame/c0a80123-4567-89ab-cdef-0123456789ab"), false);

  // Rejet chemins arbitraires
  assert.equal(isTrustedDashboardUrl("https://mstudio-frames.onrender.com/login"), false);
  assert.equal(isTrustedDashboardUrl("https://mstudio-frames.onrender.com/share/frame/not-a-uuid"), false);

  // Rejet entrées non chaînes
  assert.equal(isTrustedDashboardUrl(null), false);
  assert.equal(isTrustedDashboardUrl(undefined), false);
  assert.equal(isTrustedDashboardUrl(""), false);
});

test("getDashboardStateCandidatePaths: chemins centralisés et normalisés", () => {
  const paths = getDashboardStateCandidatePaths("mamadou");
  assert.ok(paths.length >= 4);
  assert.ok(paths.includes("Livrables/Mamadou/_memoire/state/tableau-de-bord-metier.json"));
  assert.ok(paths.includes("Livrables/mamadou/_memoire/state/tableau-de-bord-metier.json"));
  assert.ok(paths.includes("memory/state/tableau-de-bord-metier.json"));
});

test("evaluateDashboardAccess: cloisonnement multi-locataires strict (CRITIQUE)", () => {
  // Scénario A : En mode back-office, un utilisateur du client A tente d'accéder à l'expert du client B
  const crossClientAccess = evaluateDashboardAccess({
    acces: "public", // Même si le tableau de B est public !
    allowedEmails: [],
    stateWorkspaceId: "workspace_client_b",
    pinnedWorkspaceId: "workspace_client_a",
    isBackoffice: true,
    currentUserEmail: "user@client-a.ci",
    isWorkspaceMember: true,
  });
  assert.equal(crossClientAccess.allowed, false);
  assert.equal(crossClientAccess.status, 404);
  assert.equal(crossClientAccess.reason, "not_found");

  // Scénario B : Tableau sans workspace_id (jamais partagé / non configuré) en mode back-office -> 404
  const unconfiguredAccess = evaluateDashboardAccess({
    acces: "public",
    allowedEmails: [],
    stateWorkspaceId: undefined,
    pinnedWorkspaceId: "workspace_client_a",
    isBackoffice: true,
    currentUserEmail: "user@client-a.ci",
    isWorkspaceMember: true,
  });
  assert.equal(unconfiguredAccess.allowed, false);
  assert.equal(unconfiguredAccess.status, 404);

  // Scénario C : Visiteur anonyme tentant de sonder un identifiant étranger -> 404
  const anonymousProbe = evaluateDashboardAccess({
    acces: "public",
    allowedEmails: [],
    stateWorkspaceId: "workspace_client_b",
    pinnedWorkspaceId: "workspace_client_a",
    isBackoffice: true,
    currentUserEmail: null,
    isWorkspaceMember: false,
  });
  assert.equal(anonymousProbe.allowed, false);
  assert.equal(anonymousProbe.status, 404);
});

test("evaluateDashboardAccess: mode public autorisé quand le locataire correspond", () => {
  // Anonyme sur le bon espace de travail en mode public
  const publicAccess = evaluateDashboardAccess({
    acces: "public",
    allowedEmails: [],
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: null,
    isWorkspaceMember: false,
  });
  assert.equal(publicAccess.allowed, true);
});

test("evaluateDashboardAccess: mode workspace (réservé aux collaborateurs de l'espace)", () => {
  // 1. Visiteur non connecté -> 401 login_required
  const unauth = evaluateDashboardAccess({
    acces: "workspace",
    allowedEmails: [],
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: null,
    isWorkspaceMember: false,
  });
  assert.equal(unauth.allowed, false);
  assert.equal(unauth.status, 401);
  assert.equal(unauth.reason, "login_required");

  // 2. Visiteur connecté mais n'appartenant pas à l'espace -> 403 forbidden
  const nonMember = evaluateDashboardAccess({
    acces: "workspace",
    allowedEmails: [],
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "outsider@other.ci",
    isWorkspaceMember: false,
  });
  assert.equal(nonMember.allowed, false);
  assert.equal(nonMember.status, 403);
  assert.equal(nonMember.reason, "forbidden");

  // 3. Collaborateur membre de l'espace -> 200 autorisé
  const member = evaluateDashboardAccess({
    acces: "workspace",
    allowedEmails: [],
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "collab@acme.ci",
    isWorkspaceMember: true,
  });
  assert.equal(member.allowed, true);
});

test("evaluateDashboardAccess: mode emails (liste blanche)", () => {
  const allowed = ["ceo@acme.ci", "cfo@acme.ci"];

  // 1. Non connecté -> 401
  const unauth = evaluateDashboardAccess({
    acces: "emails",
    allowedEmails: allowed,
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: null,
    isWorkspaceMember: true,
  });
  assert.equal(unauth.allowed, false);
  assert.equal(unauth.status, 401);

  // 2. Connecté avec une adresse non autorisée -> 403
  const forbiddenUser = evaluateDashboardAccess({
    acces: "emails",
    allowedEmails: allowed,
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "intern@acme.ci",
    isWorkspaceMember: true,
  });
  assert.equal(forbiddenUser.allowed, false);
  assert.equal(forbiddenUser.status, 403);

  // 3. Connecté avec une adresse autorisée (tolérance casse et espaces) -> 200 autorisé
  const authorizedUser = evaluateDashboardAccess({
    acces: "emails",
    allowedEmails: allowed,
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "  CEO@Acme.ci  ",
    isWorkspaceMember: true,
  });
  assert.equal(authorizedUser.allowed, true);

  // 4. Administrateur du workspace propriétaire -> toujours autorisé
  const adminUser = evaluateDashboardAccess({
    acces: "emails",
    allowedEmails: allowed,
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "admin@acme.ci",
    isWorkspaceMember: true,
    isWorkspaceAdmin: true,
  });
  assert.equal(adminUser.allowed, true);

  // 5. Liste blanche vide + membre du workspace -> autorisé pour éviter le verrouillage accidentel
  const emptyListMember = evaluateDashboardAccess({
    acces: "emails",
    allowedEmails: [],
    stateWorkspaceId: "ws_123",
    pinnedWorkspaceId: "ws_123",
    isBackoffice: true,
    currentUserEmail: "collab@acme.ci",
    isWorkspaceMember: true,
  });
  assert.equal(emptyListMember.allowed, true);
});

test("validation du profil dans les routes d'API : rejet strict de toute traversée", () => {
  const isProfileValid = (p: string | null | undefined): boolean => {
    if (!p || !/^[a-z0-9_-]+$/i.test(p)) return false;
    return getDashboardMeta(p) !== null;
  };

  assert.equal(isProfileValid("mamadou"), true);
  assert.equal(isProfileValid("adjoua"), true);
  assert.equal(isProfileValid("Djeneba"), true);

  // Rejet immédiat de toute tentative de traversée de chemin
  assert.equal(isProfileValid("../mamadou"), false);
  assert.equal(isProfileValid(".."), false);
  assert.equal(isProfileValid("/etc/passwd"), false);
  assert.equal(isProfileValid("mamadou/../adjoua"), false);
  assert.equal(isProfileValid("mamadou%2Fadjoua"), false);
  assert.equal(isProfileValid(undefined), false);
  assert.equal(isProfileValid(""), false);
});
