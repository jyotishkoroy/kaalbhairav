// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, hasNegatedUnsafePhrase, textIncludesLoose, uniqueStrings } from "./validator-utils";

function unsafeHit(answer: string, phrases: string[], negatedPhrases: string[] = []): string[] {
  const hits: string[] = [];
  for (const phrase of phrases) {
    if (!textIncludesLoose(answer, phrase)) continue;
    if (negatedPhrases.some((negated) => hasNegatedUnsafePhrase(answer, negated))) continue;
    if (hasNegatedUnsafePhrase(answer, phrase)) continue;
    hits.push(phrase);
  }
  return uniqueStrings(hits);
}

export function validateAnswerSafety(input: AnswerValidationInput): {
  issues: ValidationIssue[];
  unsafeClaims: string[];
} {
  const answer = input.answer ?? "";
  const contract = input.contract;
  const issues: ValidationIssue[] = [];
  const unsafeClaims: string[] = [];

  const deathRefusal = /(cannot|can't|do not|don't|no|unable to)\s+(predict|provide|state).*(death|lifespan)/i.test(answer) || /(cannot|can't|do not|don't|no|unable to)\s+(predict|give|say).*(death|lifespan)/i.test(answer);
  const deathHits = deathRefusal ? [] : unsafeHit(answer, ["death date", "death dates", "lifespan", "life span", "how long will i live", "fatal accident", "when will i die", "will die at age", "death in", "die at age"], ["cannot predict death", "can't predict death", "do not predict death", "not predict death"]);
  if (deathHits.length) {
    unsafeClaims.push(...deathHits);
    issues.push(buildIssue("death_lifespan_claim", "error", "Death or lifespan prediction is not allowed.", deathHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe death/lifespan claim detected.", deathHits[0]));
  }

  const medicalHits = unsafeHit(answer, ["cancer", "diagnosis", "cure diabetes", "stop medication", "stop medicine", "stop your medication", "surgery guarantee", "medical diagnosis", "doctor says"]);
  if (medicalHits.length) {
    unsafeClaims.push(...medicalHits);
    issues.push(buildIssue("medical_claim", "error", "Medical claim is not allowed.", medicalHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe medical claim detected.", medicalHits[0]));
  }

  const legalHits = unsafeHit(answer, ["legal advice", "court guarantee", "contract instruction", "win your case", "jail"]);
  if (legalHits.length) {
    unsafeClaims.push(...legalHits);
    issues.push(buildIssue("legal_claim", "error", "Legal advice or guarantee is not allowed.", legalHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe legal claim detected.", legalHits[0]));
  }

  const financialHits = unsafeHit(answer, ["stock", "crypto", "lottery", "investment", "guaranteed profit", "100% return", "definitely get promoted", "definitely promotion", "guaranteed promotion", "win your case", "guaranteed legal", "sure shot profit"]);
  if (financialHits.length) {
    unsafeClaims.push(...financialHits);
    issues.push(buildIssue("financial_claim", "error", "Financial guarantee or instruction is not allowed.", financialHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe financial claim detected.", financialHits[0]));
  }

  const selfHarmHits = unsafeHit(answer, ["kill myself", "suicide", "end my life", "self harm"]);
  if (selfHarmHits.length) {
    unsafeClaims.push(...selfHarmHits);
    issues.push(buildIssue("unsafe_claim", "error", "Self-harm content is not allowed.", selfHarmHits[0]));
  }

  const gemstoneHits = unsafeHit(answer, ["blue sapphire", "gemstone guarantee", "gemstone will fix", "stone will surely", "will fix all my problems", "fix everything"]);
  if (gemstoneHits.length) {
    unsafeClaims.push(...gemstoneHits);
    issues.push(buildIssue("gemstone_guarantee", "error", "Gemstone guarantee is not allowed.", gemstoneHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe gemstone claim detected.", gemstoneHits[0]));
  }

  const pujaHits = unsafeHit(answer, ["must do puja", "mandatory puja", "expensive puja", "pay 50000", "fear", "otherwise", "pay rupees", "need a costly puja"]);
  if (pujaHits.length) {
    unsafeClaims.push(...pujaHits);
    issues.push(buildIssue("expensive_puja_pressure", "error", "Expensive or fear-based puja pressure is not allowed.", pujaHits[0]));
    issues.push(buildIssue("unsafe_claim", "error", "Unsafe remedy pressure detected.", pujaHits[0]));
  }

  if (contract.forbiddenClaims?.length) {
    for (const claim of contract.forbiddenClaims) {
      if (!textIncludesLoose(answer, claim.key) && !textIncludesLoose(answer, claim.description)) continue;
      unsafeClaims.push(claim.key);
      issues.push(buildIssue("forbidden_claim", "error", `Forbidden claim violated: ${claim.key}`, claim.description));
    }
  }

  if (contract.safetyRestrictions?.length) {
    for (const restriction of contract.safetyRestrictions) {
      const key = restriction.toLowerCase();
      if (/(no|do not|cannot|can't|not)/i.test(answer) && textIncludesLoose(answer, key)) continue;
      if (/death|lifespan/.test(key) && /death|lifespan/.test(answer) && !hasNegatedUnsafePhrase(answer, "death")) {
        unsafeClaims.push(restriction);
        issues.push(buildIssue("contract_violation", "error", "Safety restriction contradicted.", restriction));
      }
    }
  }

  if (contract.answerMode === "safety") {
    if (!/(cannot|can't|do not|don't|not|avoid|please use|consult)/i.test(answer)) {
      issues.push(buildIssue("contract_violation", "warning", "Safety mode should use refusal or limitation tone.", answer.slice(0, 120)));
    }
    if (/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(answer) || /next month|this year|within \d+ months/i.test(answer)) {
      issues.push(buildIssue("contract_violation", "error", "Safety mode must not add interpretive timing.", answer.slice(0, 120)));
    }
  }

  return {
    issues,
    unsafeClaims: uniqueStrings(unsafeClaims),
  };
}
