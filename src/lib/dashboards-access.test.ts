import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverableKind,
  getDashboardMeta,
  getDashboardStateCandidatePaths,
  isTrustedDashboardUrl,
} from "./dashboards.ts";

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

test("exports d'un tableau partagé : seulement un .pdf ou .html sous Livrables/", () => {
  assert.equal(deliverableKind("Livrables/Fatima/2026-10-21/tableau.pdf"), "pdf");
  assert.equal(deliverableKind("Livrables/Fatima/tableau.html"), "html");
  assert.equal(deliverableKind("Livrables/../.env"), null);
  assert.equal(deliverableKind("memory/state/x.pdf"), null);
  assert.equal(deliverableKind("Livrables/Fatima/notes.txt"), null);
  assert.equal(deliverableKind(null), null);
});
