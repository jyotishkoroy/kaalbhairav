export type AnalyzerResult = {
  language: string;
  topic: string;
  questionType: string;
  riskFlags: string[];
  needsTiming: boolean;
  needsRemedy: boolean;
  requiredFacts: string[];
  retrievalTags: string[];
  shouldAskFollowup: boolean;
  followupQuestion: string | null;
  confidence: number;
  source: "deterministic_fallback";
};

export function deterministicAnalyzeQuestion(_question: string): AnalyzerResult {
  void _question;
  return {
    language: "en",
    topic: "general",
    questionType: "general",
    riskFlags: [],
    needsTiming: false,
    needsRemedy: false,
    requiredFacts: [],
    retrievalTags: [],
    shouldAskFollowup: false,
    followupQuestion: null,
    confidence: 0.5,
    source: "deterministic_fallback",
  };
}
