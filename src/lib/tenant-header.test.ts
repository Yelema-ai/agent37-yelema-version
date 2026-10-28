import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { openTenant, sealTenant, type ResolvedTenant } from "./tenant-header.ts";

const tenant: ResolvedTenant = { workspaceId: "ws-1", name: "Acme", logoUrl: null, status: "active" };

describe("en-tête du client résolu", () => {
  it("se relit pour le même hôte avec le même secret", () => {
    const raw = sealTenant(tenant, "acme.app.yelema.ai", "s3cret", 1_000);
    assert.deepEqual(openTenant(raw, "acme.app.yelema.ai", "s3cret", 2_000), tenant);
  });

  it("refuse une valeur envoyée par le navigateur (non signée ou mal signée)", () => {
    const forged = Buffer.from(JSON.stringify({ t: tenant, h: "acme.app.yelema.ai", at: 1_000 })).toString("base64url");
    assert.equal(openTenant(forged, "acme.app.yelema.ai", "s3cret", 1_000), null);
    assert.equal(openTenant(`${forged}.AAAA`, "acme.app.yelema.ai", "s3cret", 1_000), null);
    assert.equal(openTenant(sealTenant(tenant, "acme.app.yelema.ai", "autre", 1_000), "acme.app.yelema.ai", "s3cret", 1_000), null);
  });

  it("refuse un autre hôte ou une valeur trop ancienne", () => {
    const raw = sealTenant(tenant, "acme.app.yelema.ai", "s3cret", 1_000);
    assert.equal(openTenant(raw, "autre.app.yelema.ai", "s3cret", 1_000), null);
    assert.equal(openTenant(raw, "acme.app.yelema.ai", "s3cret", 1_000 + 6 * 60_000), null);
    assert.equal(openTenant(null, "acme.app.yelema.ai", "s3cret"), null);
    assert.equal(openTenant(raw, "acme.app.yelema.ai", ""), null);
  });
});
