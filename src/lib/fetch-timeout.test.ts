import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withTimeout } from "./fetch-timeout.ts";

describe("délai des appels sortants", () => {
  it("coupe un appel qui ne répond pas", async () => {
    const { signal } = withTimeout(undefined, 10);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(signal?.aborted, true);
  });

  it("garde le signal de l'appelant", () => {
    const own = new AbortController();
    const { signal, method } = withTimeout({ method: "POST", signal: own.signal }, 10_000);
    assert.equal(method, "POST");
    own.abort();
    assert.equal(signal?.aborted, true);
  });
});
