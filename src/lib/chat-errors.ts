// The instance's own failure text is technical and in English: the member reads a French sentence.
// A known cause gets its own; anything else keeps the caller's generic one.

const BUDGET = /budget_exceeded|budget has been exceeded/i;

export const BUDGET_EXCEEDED = "Le budget du moteur Yelema de votre entreprise est atteint ce mois-ci. Votre administrateur peut l’augmenter ou brancher un compte.";

// The provider refuses for want of credit on the account the experts run on (key or subscription).
const CREDIT = /insufficient[_ ]?(quota|credits?|balance|funds)|credit balance is too low|quota[_ ]exceeded|exceeded your current quota|payment[_ ]required|billing/i;

export const CREDIT_EXHAUSTED = "Le compte d’IA de vos Experts n’a plus de crédit. Rechargez-le, ou branchez un autre compte dans Intégrations, Modèles.";

/** The sentence for a failed answer whose raw reason is `raw`. */
export function chatFailureMessage(raw: string | undefined | null, fallback: string): string {
  if (raw && BUDGET.test(raw)) return BUDGET_EXCEEDED;
  if (raw && CREDIT.test(raw)) return CREDIT_EXHAUSTED;
  return fallback;
}

/** Whether a failure sentence says the model account must be topped up: the bell names it so. */
export const isAccountToTopUp = (sentence: string | null | undefined) => sentence === CREDIT_EXHAUSTED || sentence === BUDGET_EXCEEDED;

// Lines the agent's runtime writes into a reply for itself, in English: never for the member.
const RUNTIME_LINES = [
  /^\s*(\[?system\]?\s*:?\s*)?your previous response was truncated\b.*$/i,
  /^\s*(\[?system\]?\s*:?\s*)?your request was not processed\b.*$/i,
  /^\s*[^\w\s]{0,3}\s*command invoked\b.*$/i,
];

/** A reply as the member reads it: the runtime's English lines out, the same paragraph never twice in a row. */
export function cleanReply(text: string): string {
  const kept = text.split("\n").filter((line) => !RUNTIME_LINES.some((re) => re.test(line)));
  const paragraphs = kept.join("\n").split(/\n{2,}/);
  const out = paragraphs.filter((p, i) => !p.trim() || i === 0 || p.trim() !== paragraphs[i - 1].trim());
  return out.join("\n\n").replace(/^\s+|\s+$/g, "");
}
