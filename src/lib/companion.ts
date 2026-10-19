// Yélé, the companion every member's instance carries (profile `yele` of hermes-experts, installed by
// the back office outside the plan). Never one of « Mon équipe »: she lives in her own bubble.
// Same keys as the back office's `isCompanionKey` (modules/catalogue/vocabulary.ts).

const COMPANION_KEYS = new Set(["yele", "yele-companion", "accompagnement-yele"]);

export const isCompanionProfile = (profileId: string): boolean => COMPANION_KEYS.has(profileId.toLowerCase());

/** Where the bubble talks: the instance and the profile that carry Yélé. */
export interface Companion {
  agentId: string;
  profileId: string;
}
