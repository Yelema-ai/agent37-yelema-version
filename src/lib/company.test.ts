import { test } from "node:test";
import assert from "node:assert/strict";
import { companyLogos, keepsSeveralLogos, type CompanyProfile } from "./company.ts";

const base: CompanyProfile = { logo: false, note: false, document: false, done: 0, total: 3, logoUrl: null };

test("a single kept logo is shown alone, as the main one", () => {
  assert.deepEqual(companyLogos(base), []);
  const one = { ...base, logo: true, logoUrl: "https://x.yelema.ai/logo?v=2" };
  assert.equal(keepsSeveralLogos(one), false);
  assert.deepEqual(companyLogos(one), [{ id: "principal", url: "https://x.yelema.ai/logo?v=2", name: null, primary: true }]);
});

test("several logos: the main one comes first", () => {
  const p = {
    ...base,
    logos: [
      { id: "lgo_aaaaaa", url: "/a", name: "clair.png", primary: false },
      { id: "lgo_bbbbbb", url: "/b", name: "sombre.png", primary: true },
    ],
  };
  assert.equal(keepsSeveralLogos(p), true);
  assert.deepEqual(companyLogos(p).map((l) => l.id), ["lgo_bbbbbb", "lgo_aaaaaa"]);
});
