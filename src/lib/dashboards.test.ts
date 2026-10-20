import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EXPERT_DASHBOARD_MAP, getDashboardMeta } from "./dashboards.ts";

describe("getDashboardMeta", () => {
  it("resolves exact expert keys to their correct model files", () => {
    assert.equal(getDashboardMeta("mamadou")?.modelFile, "finance.html");
    assert.equal(getDashboardMeta("fatima")?.modelFile, "marketing.html");
    assert.equal(getDashboardMeta("adjoua")?.modelFile, "recrutement.html");
    assert.equal(getDashboardMeta("kouassi")?.modelFile, "commercial.html");
    assert.equal(getDashboardMeta("ibrahim")?.modelFile, "juridique.html");
    assert.equal(getDashboardMeta("salif")?.modelFile, "operations.html");
    assert.equal(getDashboardMeta("djeneba")?.modelFile, "direction.html");
    assert.equal(getDashboardMeta("nadia")?.modelFile, "data.html");
    assert.equal(getDashboardMeta("awa")?.modelFile, "support.html");
    assert.equal(getDashboardMeta("fatou")?.modelFile, "rh-paie.html");
    assert.equal(getDashboardMeta("koffi")?.modelFile, "design.html");
    assert.equal(getDashboardMeta("alioune")?.modelFile, "investissement.html");
  });

  it("handles prefixes from control-plane like client__expert or case variations", () => {
    assert.equal(getDashboardMeta("client_123__mamadou")?.modelFile, "finance.html");
    assert.equal(getDashboardMeta("acme__FATIMA")?.modelFile, "marketing.html");
    assert.equal(getDashboardMeta("DJENEBA")?.modelFile, "direction.html");
    assert.equal(getDashboardMeta("djeneba@7.0.0")?.modelFile, "direction.html");
  });

  it("returns null for unknown or empty profile", () => {
    assert.equal(getDashboardMeta(""), null);
    assert.equal(getDashboardMeta(null), null);
    assert.equal(getDashboardMeta(undefined), null);
    assert.equal(getDashboardMeta("inconnu_expert_xyz"), null);
  });

  it("contains 8 KPIs for key métier experts", () => {
    const mamadou = getDashboardMeta("mamadou");
    assert.ok(mamadou);
    assert.equal(mamadou.kpis.length, 8);
    assert.ok(mamadou.kpis.includes("Trésorerie disponible"));
    assert.ok(mamadou.kpis.includes("Marge brute"));
  });
});
