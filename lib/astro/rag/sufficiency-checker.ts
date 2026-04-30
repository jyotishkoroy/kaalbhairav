export type SufficiencyDecision = {
  status: "answer_now" | "ask_followup" | "fallback";
  missingFacts: string[];
  missingUserClarification: string[];
  followupQuestion?: string;
  limitations: string[];
};

export function checkSufficiency(): SufficiencyDecision {
  return { status: "fallback", missingFacts: [], missingUserClarification: [], limitations: [] };
}
