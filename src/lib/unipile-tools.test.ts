import assert from "node:assert/strict";
import { test } from "node:test";
import { isUnipileTool, maskDestination, rewriteRpcPayload, rpcOf, unipileRequest, unipileResult, withUnipileTools } from "./unipile-tools.ts";

test("liste : limite bornée, compte encodé, refus d'un identifiant qui casse le chemin", () => {
  assert.deepEqual(unipileRequest("unipile_list_chats", { limit: 500 }), { method: "GET", endpoint: "/api/v1/chats?limit=20" });
  assert.equal(unipileRequest("unipile_list_chats", { account_id: "abc_1", limit: 3 }).endpoint, "/api/v1/chats?limit=3&account_id=abc_1");
  assert.throws(() => unipileRequest("unipile_list_chats", { account_id: "a/../b" }), /account_id/);
  assert.throws(() => unipileRequest("unipile_list_chats", { account_id: "a&x=1" }), /account_id/);
});

test("envoi : discussion validée, texte obligatoire et borné", () => {
  const r = unipileRequest("unipile_send_message", { chat_id: "Ch_1", text: " Bonjour " });
  assert.deepEqual(r, { method: "POST", endpoint: "/api/v1/chats/Ch_1/messages", body: { text: "Bonjour" }, destination: "Ch_1" });
  assert.throws(() => unipileRequest("unipile_send_message", { chat_id: "x", text: "" }), /text vide/);
  assert.throws(() => unipileRequest("unipile_send_message", { chat_id: "x", text: "a".repeat(4001) }), /trop long/);
  assert.throws(() => unipileRequest("unipile_send_message", { chat_id: "x?y=1", text: "a" }), /chat_id/);
});

test("nouvelle discussion WhatsApp : destinataire au format Unipile", () => {
  const r = unipileRequest("unipile_start_chat", { account_id: "acc1", attendee: "2250702219778@s.whatsapp.net", text: "Test Yelema" });
  assert.deepEqual(r.body, { account_id: "acc1", attendees_ids: ["2250702219778@s.whatsapp.net"], text: "Test Yelema" });
  assert.equal(r.endpoint, "/api/v1/chats");
});

test("journal : la destination n'apparaît jamais en entier", () => {
  assert.equal(maskDestination("2250702219778@s.whatsapp.net"), "225***78");
  assert.equal(maskDestination("abc"), "***");
});

test("résultat : discussions réduites aux champs connus et encadrées comme données non fiables", () => {
  const out = unipileResult("unipile_list_chats", { status: 200, data: { items: [{ id: "c1", name: "Awa", provider_secret: "x", unread_count: 2 }] } });
  assert.match(out.text, /^<donnees-unipile non-fiables="vrai">/);
  assert.match(out.text, /"name":"Awa"/);
  assert.doesNotMatch(out.text, /provider_secret/);
  assert.equal(unipileResult("unipile_send_message", { status: 403 }).isError, true);
  assert.match(unipileResult("unipile_send_message", { status: 201, data: { message_id: "m1" } }).text, /"envoye":true/);
});

test("tools/list : les trois outils s'ajoutent une fois, le reste intact", () => {
  const rpc = { jsonrpc: "2.0", id: 1, result: { tools: [{ name: "COMPOSIO_SEARCH_TOOLS" }] } };
  const once = withUnipileTools(rpc) as typeof rpc;
  assert.equal(once.result.tools.length, 4);
  assert.equal((withUnipileTools(once) as typeof rpc).result.tools.length, 4);
  assert.deepEqual(withUnipileTools({ jsonrpc: "2.0", id: 2, error: {} }), { jsonrpc: "2.0", id: 2, error: {} });
  assert.ok(isUnipileTool("unipile_send_message"));
  assert.ok(!isUnipileTool("UNIPILE_LIST_ACCOUNTS"));
});

test("réécriture : JSON simple et flux SSE", () => {
  const add = (r: unknown) => withUnipileTools(r);
  const sse = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n';
  assert.match(rewriteRpcPayload(sse, true, add), /^event: message\ndata: .*unipile_start_chat/);
  assert.match(rewriteRpcPayload('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}', false, add), /unipile_list_chats/);
  assert.equal(rpcOf('[{"method":"x"}]'), null);
  assert.deepEqual(rpcOf('{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"n"}}'), { id: 7, method: "tools/call", params: { name: "n" } });
});
