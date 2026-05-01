/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroE2ETrace = {
  requestReceived: boolean;
  route: "/api/astro/v2/reading";
  directV2Route: boolean;
  questionFrame: {
    attempted: boolean;
    used: boolean;
    coreQuestion?: string;
    suffixInstructionCount?: number;
  };
  structuredIntent: {
    attempted: boolean;
    used: boolean;
    primaryIntent?: string;
    safetyIntent?: string;
    exactFactExpected?: boolean;
  };
  supabase: {
    attempted: boolean;
    chartProfileLookupAttempted: boolean;
    chartProfileLoaded: boolean;
    chartProfileSource?: "supabase" | "fallback" | "fixture" | "none";
    errorCode?: string;
  };
  oracle: {
    attempted: boolean;
    called: boolean;
    required: boolean;
    succeeded: boolean;
    skippedReason?: string;
    errorCode?: string;
  };
  exactFacts: {
    attempted: boolean;
    answered: boolean;
    source?: "deterministic_chart" | "oracle" | "supabase" | "fallback" | "none";
    llmUsed: boolean;
  };
  providers: {
    groq: {
      attempted: boolean;
      called: boolean;
      allowed: boolean;
      skippedReason?: string;
      fallbackUsed?: boolean;
    };
    ollama: {
      enabled: boolean;
      attempted: boolean;
      reachable?: boolean;
      called: boolean;
      skippedReason?: string;
    };
  };
  fallback: {
    used: boolean;
    reason?: string;
  };
  safety: {
    attempted: boolean;
    ran: boolean;
    action?: string;
    blockedUnsafe?: boolean;
  };
  finalComposer: {
    attempted: boolean;
    ran: boolean;
    repaired?: boolean;
    gateReason?: string;
  };
  finalValidator: {
    attempted: boolean;
    ran: boolean;
    passed: boolean;
    failures: string[];
    warnings: string[];
  };
  response: {
    answerNonEmpty: boolean;
    userSafe: boolean;
    debugTraceExposed: boolean;
  };
};

export function createAstroE2ETrace(): AstroE2ETrace {
  return {
    requestReceived: true,
    route: "/api/astro/v2/reading",
    directV2Route: true,
    questionFrame: { attempted: false, used: false },
    structuredIntent: { attempted: false, used: false },
    supabase: { attempted: false, chartProfileLookupAttempted: false, chartProfileLoaded: false, chartProfileSource: "none" },
    oracle: { attempted: false, called: false, required: false, succeeded: false },
    exactFacts: { attempted: false, answered: false, source: "none", llmUsed: false },
    providers: {
      groq: { attempted: false, called: false, allowed: false },
      ollama: { enabled: false, attempted: false, called: false },
    },
    fallback: { used: false },
    safety: { attempted: false, ran: false },
    finalComposer: { attempted: false, ran: false },
    finalValidator: { attempted: false, ran: false, passed: false, failures: [], warnings: [] },
    response: { answerNonEmpty: false, userSafe: false, debugTraceExposed: false },
  };
}

export function sanitizeTraceForResponse(trace: AstroE2ETrace): AstroE2ETrace {
  return {
    ...trace,
    questionFrame: {
      ...trace.questionFrame,
      coreQuestion: trace.questionFrame.coreQuestion ? trace.questionFrame.coreQuestion.slice(0, 160) : undefined,
    },
    finalValidator: {
      ...trace.finalValidator,
      failures: trace.finalValidator.failures.slice(0, 20),
      warnings: trace.finalValidator.warnings.slice(0, 20),
    },
  };
}

export function shouldExposeAstroE2ETrace(input: {
  isProduction: boolean;
  envEnabled: boolean;
  metadataDebugTrace?: unknown;
  headerDebugTrace?: string | null;
}): boolean {
  const requested =
    input.metadataDebugTrace === true ||
    input.metadataDebugTrace === "true" ||
    input.headerDebugTrace === "true";

  if (!requested) return false;
  if (!input.isProduction) return true;
  return input.envEnabled;
}
