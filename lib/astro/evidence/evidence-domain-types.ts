/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { StructuredIntent } from "../rag/structured-intent-types";

export type EvidenceDomain =
  | "identity"
  | "planetary_placement"
  | "career"
  | "money"
  | "business"
  | "relationship"
  | "marriage"
  | "family"
  | "education"
  | "foreign_settlement"
  | "remedy"
  | "health_adjacent"
  | "safety"
  | "general";

export type DomainEvidenceRequest = {
  primaryIntent: StructuredIntent["primaryIntent"];
  secondaryIntents: string[];
  mode: StructuredIntent["mode"];
  maxAnchors: number;
  requireQuestionRelevance: boolean;
};

export type DomainEvidenceAnchor = {
  id: string;
  domain: EvidenceDomain;
  text: string;
  deterministic: boolean;
  relevanceScore: number;
  source?: string;
};

export type DomainEvidenceSelection = {
  primaryDomain: EvidenceDomain;
  allowedDomains: EvidenceDomain[];
  selectedAnchors: DomainEvidenceAnchor[];
  weakEvidence: boolean;
  relevanceExplanation: string;
};
