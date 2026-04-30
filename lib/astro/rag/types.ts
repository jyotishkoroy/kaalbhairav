export type AstroRagSource =
  | "deterministic"
  | "supabase"
  | "ollama"
  | "groq"
  | "fallback";

export type AstroRagStatus =
  | "not_enabled"
  | "exact_fact"
  | "answer_now"
  | "ask_followup"
  | "fallback";

export type AstroRagMetadata = {
  engine: "old_v2" | "rag_llm";
  exactFactAnswered: boolean;
  safetyGatePassed: boolean;
  ollamaAnalyzerUsed: boolean;
  groqUsed: boolean;
  ollamaCriticUsed: boolean;
  validationPassed: boolean;
  fallbackUsed: boolean;
};

export type AstroRagQuestion = {
  userId?: string;
  profileId?: string;
  question: string;
  language?: string;
};

export type AstroRagAnswer = {
  answer: string;
  followUpQuestion?: string | null;
  followUpAnswer?: string | null;
  status: AstroRagStatus;
  meta: AstroRagMetadata;
};
