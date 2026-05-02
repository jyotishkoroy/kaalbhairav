/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroRankedReasoningRule } from "./types";
import type { BenchmarkExample, ValidationCheck } from "./retrieval-types";

export interface AstroPromptPackerOptions {
  maxRules?: number;
  maxValidationChecks?: number;
  includeExamples?: boolean;
  maxCharacters?: number;
}

export interface AstroPackedPromptContext {
  text: string;
  includedRuleIds: string[];
  includedValidationCheckIds: string[];
  includedExampleIds: string[];
  truncated: boolean;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function compactRuleText(rule: AstroRankedReasoningRule): string {
  const source = rule.rule.normalizedSourceText ?? rule.rule.sourceText ?? rule.rule.ruleStatement ?? rule.rule.promptCompactSummary ?? "";
  const reference = rule.rule.normalizedSourceReference ?? rule.rule.sourceReference ?? "unknown";
  const reliability = rule.rule.normalizedSourceReliability ?? rule.rule.sourceReliability ?? "unknown";
  const caveat = "Caveat: do not apply in isolation; check strength, aspects, dasha, divisional chart where applicable.";
  return [
    `Rule ${rule.rule.ruleId} [score ${Math.round(rule.score)}; source ${reliability}; ref ${reference}]:`,
    normalizeText(source),
    caveat,
  ].filter(Boolean).join("\n");
}

function compactValidationCheck(check: ValidationCheck): string {
  return `Validation ${check.checkId}: ${normalizeText(check.checkStatement)}${check.correctionInstruction ? `\n- ${normalizeText(check.correctionInstruction)}` : ""}`;
}

function compactExample(example: BenchmarkExample): string {
  return `Example ${example.id}: ${normalizeText(example.question)}\n- ${normalizeText(example.answer)}`;
}

function packText(sections: string[]): string {
  return ["RAG CONTEXT:", ...sections.filter(Boolean)].join("\n");
}

export function packAstroRagPromptContext(input: {
  rankedRules: readonly AstroRankedReasoningRule[];
  validationChecks?: readonly ValidationCheck[];
  examples?: readonly BenchmarkExample[];
  options?: AstroPromptPackerOptions;
}): AstroPackedPromptContext {
  const maxRules = input.options?.maxRules ?? 8;
  const maxValidationChecks = input.options?.maxValidationChecks ?? 3;
  const includeExamples = input.options?.includeExamples ?? false;
  const maxCharacters = input.options?.maxCharacters ?? 6000;

  const includedRuleIds: string[] = [];
  const includedValidationCheckIds: string[] = [];
  const includedExampleIds: string[] = [];
  const sections: string[] = [];
  let truncated = false;

  const seenStatements = new Set<string>();
  const rules = [...input.rankedRules].slice(0, maxRules);
  for (const rule of rules) {
    const statement = normalizeText(rule.rule.ruleStatement ?? rule.rule.promptCompactSummary ?? rule.rule.ruleId).toLowerCase();
    if (statement && seenStatements.has(statement)) continue;
    if (statement) seenStatements.add(statement);
    includedRuleIds.push(rule.rule.ruleId);
    sections.push(compactRuleText(rule));
  }

  const checks = uniqueStrings((input.validationChecks ?? []).slice(0, maxValidationChecks).map((check) => check.checkId));
  for (const checkId of checks) {
    const check = (input.validationChecks ?? []).find((item) => item.checkId === checkId);
    if (!check) continue;
    includedValidationCheckIds.push(check.checkId);
    sections.push(compactValidationCheck(check));
  }

  if (includeExamples) {
    for (const example of (input.examples ?? []).slice(0, 3)) {
      includedExampleIds.push(example.id);
      sections.push(compactExample(example));
    }
  }

  const validationBlock = [
    "Validation:",
    "- Do not make absolute predictions.",
    "- Do not invent chart placements.",
    "- Do not prescribe expensive remedies.",
  ];
  const finalSections = [...sections, validationBlock.join("\n")];

  let text = packText(finalSections);
  if (text.length > maxCharacters) {
    truncated = true;
    if (includeExamples && includedExampleIds.length) {
      sections.splice(sections.length - includedExampleIds.length, includedExampleIds.length);
      includedExampleIds.length = 0;
    }
    if (sections.length > maxRules + maxValidationChecks) {
      sections.splice(maxRules + 1);
      includedValidationCheckIds.splice(1);
    }
    while (sections.length && packText([...sections, validationBlock.join("\n")]).length > maxCharacters) {
      sections.pop();
    }
    text = packText([...sections, validationBlock.join("\n")]);
    if (text.length > maxCharacters) text = text.slice(0, maxCharacters);
  }

  return {
    text,
    includedRuleIds,
    includedValidationCheckIds,
    includedExampleIds,
    truncated,
  };
}
