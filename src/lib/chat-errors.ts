// The instance's own failure text is technical and in English: the member reads a French sentence.
// A known cause gets its own; anything else keeps the caller's generic one.

const BUDGET = /budget_exceeded|budget has been exceeded/i;

export const BUDGET_EXCEEDED = "Le budget du moteur Yelema de votre entreprise est atteint ce mois-ci. Votre administrateur peut l’augmenter ou brancher un compte.";

/** The sentence for a failed answer whose raw reason is `raw`. */
export function chatFailureMessage(raw: string | undefined | null, fallback: string): string {
  return raw && BUDGET.test(raw) ? BUDGET_EXCEEDED : fallback;
}
