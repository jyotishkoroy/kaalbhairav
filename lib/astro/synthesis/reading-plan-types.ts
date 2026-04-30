/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type ReadingPlanEvidenceInput = {
  id: string;
  label: string;
  explanation: string;
  confidence?: "low" | "medium" | "high";
  source?: "chart" | "dasha" | "varshaphal" | "rule" | "memory";
};

export type ReadingPlanBuilderInput = {
  question: string;
  concern?: {
    topic?: string;
    mode?: string;
    safetyRisks?: string[];
  } | null;
  listening?: import("../listening").ListeningAnalysis | null;
  evidence?: ReadingPlanEvidenceInput[];
  chartAnchors?: string[];
  missingChartFacts?: string[];
  birthContext?: {
    hasBirthDate?: boolean;
    hasBirthTime?: boolean;
    hasBirthPlace?: boolean;
  };
  timingContext?: {
    timingSourceAvailable?: boolean;
    allowedTimingDescription?: string;
  };
  remedyContext?: {
    remedyRequested?: boolean;
    safeRemediesAvailable?: boolean;
  };
  memorySummary?: string | null;
  safetyRestrictions?: string[];
};

export type ReadingPlanValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
export type ReadingPlan = {
  question: string;
  topic: string;
  mode: "exact_fact" | "interpretive" | "timing" | "remedy" | "follow_up" | "safety";

  acknowledgement: {
    emotionalContext: string;
    userNeed: string;
    openingLine: string;
  };

  chartTruth: {
    evidence: Array<{
      id: string;
      label: string;
      explanation: string;
      confidence: "low" | "medium" | "high";
      source: "chart" | "dasha" | "varshaphal" | "rule" | "memory";
    }>;
    chartAnchors: string[];
    limitations: string[];
  };

  livedExperience: string[];

  lessonPattern: {
    pattern: string;
    nonFatalisticMeaning: string;
  };

  practicalGuidance: string[];

  remedies: {
    include: boolean;
    reason?: string;
    spiritual: string[];
    behavioral: string[];
    practical: string[];
    inner: string[];
  };

  safetyBoundaries: string[];

  reassurance: {
    closingLine: string;
    avoidFalseCertainty: boolean;
  };

  followUp?: {
    question: string;
    reason: string;
  };

  memoryUse?: {
    used: boolean;
    summary?: string;
    warnings?: string[];
  };
};
