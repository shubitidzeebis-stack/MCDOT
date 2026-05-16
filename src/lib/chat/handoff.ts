// Pure-function pattern matchers for the customer chat widget. Run on
// the user's most recent message; emit handoff events when sell intent,
// regulatory-advice intent, or the turn cap is reached.
//
// Trigger phrases sourced from docs/chat-widget-spec.md §7 in the
// Veritor-Jarvis repo. If the spec is updated, re-sync this list.

import type { Locale } from "@/lib/i18n";

export type HandoffKind = "intent_to_sell" | "specialist" | "turn_cap";

const INTENT_TO_SELL: Record<Locale, string[]> = {
  en: [
    "i want to sell",
    "want to sell",
    "ready to sell",
    "ready to move on",
    "i'm ready",
    "im ready",
    "what's next",
    "whats next",
    "what is the next step",
    "next step",
    "how do i start",
    "how to start",
    "let's do it",
    "lets do it",
    "interested in selling",
    "looking to sell",
    "sell my company",
    "sell my llc",
    "sell my mc",
    "sell the business",
  ],
  es: [
    "quiero vender",
    "listo para vender",
    "estoy listo",
    "siguiente paso",
    "próximo paso",
    "proximo paso",
    "como empiezo",
    "cómo empiezo",
    "interesado en vender",
    "vender mi empresa",
    "vender mi compañía",
    "vender mi compania",
    "vender mi mc",
  ],
  ru: [
    "хочу продать",
    "готов продать",
    "готов",
    "следующий шаг",
    "что дальше",
    "как начать",
    "интересует продажа",
    "продать компанию",
    "продать ооо",
    "продать mc",
  ],
};

const SPECIALIST: Record<Locale, string[]> = {
  en: [
    "should i form",
    "should i incorporate",
    "best entity",
    "s-corp or",
    "tax implications",
    "tax advice",
    "capital gains",
    "legal advice",
    "is it legal",
    "can i legally",
    "accountant",
    "cpa",
    "what does my lawyer",
    "do i need a lawyer",
  ],
  es: [
    "implicaciones fiscales",
    "asesoría fiscal",
    "asesoria fiscal",
    "ganancia de capital",
    "asesoría legal",
    "asesoria legal",
    "es legal",
    "puedo legalmente",
    "contador",
    "abogado",
  ],
  ru: [
    "налоговые последствия",
    "налоговая консультация",
    "юридическая консультация",
    "это законно",
    "бухгалтер",
    "юрист",
    "адвокат",
  ],
};

// Normalize for matching: lowercase, collapse whitespace, strip leading/
// trailing punctuation. Keeps Cyrillic / Latin-extended intact (no
// removal of non-ASCII).
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s ]+/g, " ")
    .trim();
}

// Returns the matching handoff kind for a user message, or null if no
// pattern matched. `turn_cap` is handled separately by the caller
// (checks turn_count before sending the next request).
export function detectHandoff(
  message: string,
  locale: Locale,
): HandoffKind | null {
  const haystack = normalize(message);
  if (INTENT_TO_SELL[locale].some((p) => haystack.includes(p))) {
    return "intent_to_sell";
  }
  if (SPECIALIST[locale].some((p) => haystack.includes(p))) {
    return "specialist";
  }
  return null;
}

// Pure regex extractor — does NOT decide whether to persist. Per spec
// §8, the caller must only persist these when the session is already
// in a handoff context, otherwise casual mentions like
// "my friend has MC 123456 and got a great deal" would pollute
// captured_mc on a non-seller.
export function detectCapturedFields(text: string): {
  email?: string;
  mc?: string;
} {
  const out: { email?: string; mc?: string } = {};

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) out.email = emailMatch[0];

  // MC patterns: "MC 1234567", "MC#1234567", "MC-1234567", or a bare
  // 5-7 digit number preceded by "mc" within 20 chars.
  const mcMatch = text.match(/\bMC[\s#-]*(\d{4,7})\b/i);
  if (mcMatch) {
    out.mc = mcMatch[1];
  } else {
    // Looser fallback — "mc" earlier in the same window.
    const loose = text.match(/\bmc\b[^]{0,20}?(\d{4,7})/i);
    if (loose) out.mc = loose[1];
  }
  return out;
}

// Used by the caller to enforce the 15-turn handoff trigger.
export const TURN_CAP = 15;
