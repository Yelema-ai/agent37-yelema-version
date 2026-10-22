import assert from "node:assert/strict";
import { test } from "node:test";

import { conversationText } from "./conversation-text.ts";

const row = (role: "user" | "assistant" | "system", content: string) => ({ id: role, session_id: "s", role, content, created_at: 0 });

test("a conversation copies as the title then each message with its author", () => {
  const text = conversationText("Brief ministère", "Djénéba", [
    row("system", "prompt"),
    row("user", "Prépare le brief"),
    row("assistant", "System: your previous response was truncated\nVoici le brief."),
    row("assistant", "   "),
  ]);
  assert.equal(text, "Brief ministère (conversation avec Djénéba)\n\nVous\nPrépare le brief\n\nDjénéba\nVoici le brief.");
});
