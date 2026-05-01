/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { getAstroFeatureFlags } from "../config/feature-flags";
import type { StructuredIntent } from "../rag/structured-intent-types";
import { inferAllowedDomains } from "./evidence-policy";
import type { DomainEvidenceAnchor, DomainEvidenceSelection, EvidenceDomain } from "./evidence-domain-types";

function primaryDomainFromIntent(intent: StructuredIntent): EvidenceDomain {
  switch (intent.primaryIntent) {
    case "exact_fact":
      return "identity";
    case "career":
      return "career";
    case "money":
      return "money";
    case "business":
      return "business";
    case "relationship":
      return "relationship";
    case "marriage":
      return "marriage";
    case "family":
      return "family";
    case "education":
      return "education";
    case "foreign_settlement":
      return "foreign_settlement";
    case "remedy":
    case "sleep":
      return "remedy";
    case "health_adjacent":
      return "health_adjacent";
    case "death_lifespan":
    case "legal":
    case "financial_risk":
      return "safety";
    case "vague":
    case "general":
    default:
      return "general";
  }
}

function domainMatches(anchorDomain: EvidenceDomain, allowedDomains: EvidenceDomain[]): boolean {
  return allowedDomains.includes(anchorDomain);
}

function secondaryDomainsFromIntent(intent: StructuredIntent): EvidenceDomain[] {
  const domains = new Set<EvidenceDomain>();
  for (const secondary of intent.secondaryIntents) {
    if (secondary === "business") domains.add("business");
    if (secondary === "money") domains.add("money");
    if (secondary === "job") domains.add("career");
    if (secondary === "study" || secondary === "education") domains.add("education");
    if (secondary === "relationship") domains.add("relationship");
    if (secondary === "marriage") domains.add("marriage");
    if (secondary === "family") domains.add("family");
    if (secondary === "financial_risk") {
      domains.add("money");
      domains.add("business");
      domains.add("safety");
    }
  }
  return [...domains];
}

export function selectDomainEvidence(input: {
  intent: StructuredIntent;
  availableAnchors: DomainEvidenceAnchor[];
  maxAnchors?: number;
  requireQuestionRelevance?: boolean;
}): DomainEvidenceSelection {
  const flags = getAstroFeatureFlags();
  if (!flags.domainAwareEvidenceEnabled) {
    return {
      primaryDomain: "general",
      allowedDomains: ["general"],
      selectedAnchors: input.availableAnchors.slice(0, input.maxAnchors ?? 12),
      weakEvidence: false,
      relevanceExplanation: "Domain-aware evidence selection is disabled by feature flag.",
    };
  }

  const primaryDomain = primaryDomainFromIntent(input.intent);
  const allowedDomains: EvidenceDomain[] = input.intent.primaryIntent === "exact_fact"
    ? ["identity", "planetary_placement"]
    : input.intent.primaryIntent === "financial_risk"
      ? ["money", "business", "safety"]
      : inferAllowedDomains(primaryDomain);
  const maxAnchors = Math.max(0, input.maxAnchors ?? 12);
  const requireQuestionRelevance = input.requireQuestionRelevance ?? false;
  const expandedAllowed = [...new Set([...allowedDomains, ...secondaryDomainsFromIntent(input.intent)])];
  const relevant = input.availableAnchors
    .filter((anchor) => anchor.deterministic)
    .filter((anchor) => domainMatches(anchor.domain, expandedAllowed))
    .filter((anchor) => !requireQuestionRelevance || anchor.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxAnchors);

  if (!relevant.length) {
    return {
      primaryDomain,
      allowedDomains,
      selectedAnchors: [],
      weakEvidence: true,
      relevanceExplanation: "No sufficiently relevant deterministic evidence was available for this domain.",
    };
  }

  const selectedAnchors: DomainEvidenceAnchor[] = input.intent.primaryIntent === "exact_fact"
    ? [relevant.find((anchor) => anchor.domain === "identity") ?? relevant[0]]
    : relevant.filter((anchor) => domainMatches(anchor.domain, expandedAllowed)).slice(0, maxAnchors);

  return {
    primaryDomain,
    allowedDomains: expandedAllowed,
    selectedAnchors,
    weakEvidence: selectedAnchors.length === 0,
    relevanceExplanation: selectedAnchors.length ? `Selected ${selectedAnchors.length} deterministic anchor(s) for ${primaryDomain}.` : "No sufficiently relevant deterministic evidence was available for this domain.",
  };
}
