import assert from "node:assert/strict";
import { test } from "node:test";
import { inviteBlocked, quotaLabel } from "./member-room.ts";

const room = (over: Partial<Parameters<typeof inviteBlocked>[0]> = {}) => ({ quota: { used: 6, allowed: 10 }, seats: { used: 4, cap: 40 }, enterpriseOpen: true, ...over });

test("places : quota de l'abonnement, avec ou sans plafond", () => {
  assert.equal(quotaLabel({ used: 6, allowed: 10 }), "6 / 10 utilisateurs");
  assert.equal(quotaLabel({ used: 1, allowed: null }), "1 utilisateur");
});

test("invitation possible, ou la raison du blocage", () => {
  assert.equal(inviteBlocked(room()), null);
  assert.match(inviteBlocked(room({ enterpriseOpen: false, seats: null })) ?? "", /pas encore ouvert/);
  assert.match(inviteBlocked(room({ quota: { used: 10, allowed: 10 } })) ?? "", /contactez Yelema pour en ajouter/);
  assert.match(inviteBlocked(room({ seats: { used: 40, cap: 40 } })) ?? "", /complet/);
  assert.equal(inviteBlocked(room({ quota: { used: 50, allowed: null } })), null);
});
