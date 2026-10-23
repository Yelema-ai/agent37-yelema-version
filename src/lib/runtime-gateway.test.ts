import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gatewayFetch, gatewayInstancePath, gatewayPortHeaders, runtimeGateway } from "./runtime-gateway.ts";

describe("passerelle d’exécution", () => {
  it("active seulement avec l’adresse ET le jeton ; barre finale retirée", () => {
    assert.equal(runtimeGateway({}), null);
    assert.equal(runtimeGateway({ RUNTIME_GATEWAY_URL: "https://gw.test" }), null);
    assert.deepEqual(runtimeGateway({ RUNTIME_GATEWAY_URL: "https://gw.test/", RUNTIME_GATEWAY_TOKEN: " t " }), { url: "https://gw.test", token: "t" });
  });

  it("les chemins de l’instance sont les mêmes, sous /v1/instances/{id}/", () => {
    assert.equal(gatewayInstancePath("inst01", "/v1/responses"), "/v1/instances/inst01/responses");
    assert.equal(gatewayInstancePath("inst01", "/v1/files/content?path=%7E%2FLivrables"), "/v1/instances/inst01/files/content?path=%7E%2FLivrables");
    assert.throws(() => gatewayInstancePath("inst01", "/admin"));
  });

  it("la clé d’un port passe en X-Instance-Authorization", () => {
    assert.deepEqual(gatewayPortHeaders({ Authorization: "Bearer k", "Content-Type": "application/json" }), { "content-type": "application/json", "x-instance-authorization": "Bearer k" });
    assert.deepEqual(gatewayPortHeaders(undefined), {});
  });

  it("le jeton de la passerelle remplace toujours un Authorization venu de l’appelant", async (t) => {
    const seen: { url: string; auth: string | null }[] = [];
    t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      seen.push({ url, auth: new Headers(init.headers).get("authorization") });
      return new Response("{}");
    });
    await gatewayFetch({ url: "https://gw.test", token: "tok" }, "/v1/control/templates", { headers: { Authorization: "Bearer autre" } });
    assert.deepEqual(seen, [{ url: "https://gw.test/v1/control/templates", auth: "Bearer tok" }]);
  });
});
