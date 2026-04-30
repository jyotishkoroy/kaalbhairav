import type { AstroRagAnswer, AstroRagQuestion } from "./types";
import { getAstroRagFlags } from "./feature-flags";

export async function ragReadingOrchestrator(
  input: AstroRagQuestion,
  env: Record<string, string | undefined> = process.env,
): Promise<AstroRagAnswer> {
  void input;
  const flags = getAstroRagFlags(env);

  if (!flags.ragEnabled) {
    return {
      answer: "",
      followUpQuestion: null,
      followUpAnswer: null,
      status: "not_enabled",
      meta: {
        engine: "old_v2",
        exactFactAnswered: false,
        safetyGatePassed: true,
        ollamaAnalyzerUsed: false,
        groqUsed: false,
        ollamaCriticUsed: false,
        validationPassed: true,
        fallbackUsed: false,
      },
    };
  }

  return {
    answer: "",
    followUpQuestion: null,
    followUpAnswer: null,
    status: "fallback",
    meta: {
      engine: "rag_llm",
      exactFactAnswered: false,
      safetyGatePassed: true,
      ollamaAnalyzerUsed: false,
      groqUsed: false,
      ollamaCriticUsed: false,
      validationPassed: true,
      fallbackUsed: true,
    },
  };
}
