// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.
// 
import crypto from "node:crypto";
import path from "node:path";

export type ParsedBenchmarkExample = {
  sourceFile: string;
  sourceHash: string;
  sourceSlug: string;
  domain: string;
  question: string;
  answer: string;
  reasoning: string;
  accuracyClass: "totally_accurate" | "grounded_interpretive" | "partial" | "unavailable" | "safety_only";
  readingStyle: "direct" | "companion" | "technical" | "remedy" | "safety" | "followup" | "mixed";
  followUp: string | null;
  tags: string[];
  safetyFlags: string[];
  requiredAnchors: string[];
  forbiddenClaims: string[];
  metadata: Record<string, unknown>;
};

export type BenchmarkParseIssue = {
  sourceFile: string;
  code:
    | "empty_file"
    | "missing_question"
    | "missing_answer"
    | "missing_domain"
    | "missing_accuracy"
    | "unsafe_content"
    | "duplicate_example"
    | "malformed_section"
    | "too_short"
    | "too_large";
  message: string;
};

export type BenchmarkParseResult = {
  examples: ParsedBenchmarkExample[];
  issues: BenchmarkParseIssue[];
  stats: {
    filesRead: number;
    examplesParsed: number;
    examplesSkipped: number;
    duplicateCount: number;
  };
};

export type BenchmarkParserOptions = {
  defaultDomain?: string;
  sourceRoot?: string;
  maxFileBytes?: number;
  maxAnswerChars?: number;
};

const DEFAULT_DOMAIN = "general";
const DEFAULT_MAX_FILE_BYTES = 500_000;
const DEFAULT_MAX_ANSWER_CHARS = 6000;

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function lower(value: string): string {
  return value.toLowerCase();
}

function isRefusalText(text: string): boolean {
  const t = lower(text);
  return /(cannot|can't|won't|unable|not able|should not|do not recommend|cannot help|not safe|not provide|seek professional)/.test(t);
}

function normalizeFilePath(sourceFile: string, sourceRoot?: string): string {
  if (!path.isAbsolute(sourceFile)) return sourceFile.replace(/\\/g, "/");
  if (sourceRoot) {
    const rel = path.relative(sourceRoot, sourceFile);
    if (rel && !rel.startsWith("..")) return rel.replace(/\\/g, "/");
  }
  return path.basename(sourceFile);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "benchmark";
}

function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function makeIssue(sourceFile: string, code: BenchmarkParseIssue["code"], message: string): BenchmarkParseIssue {
  return { sourceFile, code, message };
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return { frontmatter: {}, body: content };
  const lines = trimmed.split("\n");
  if (lines.length < 2) return { frontmatter: {}, body: content };
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) return { frontmatter: {}, body: content };
  const frontmatter: Record<string, string> = {};
  for (let i = 1; i < end; i += 1) {
    const match = lines[i].match(/^\s*([A-Za-z][\w -]*):\s*(.*)\s*$/);
    if (match) frontmatter[match[1].toLowerCase()] = match[2].trim();
  }
  return { frontmatter, body: lines.slice(end + 1).join("\n") };
}

function splitExamples(body: string): string[] {
  const lines = normalizeText(body).split("\n");
  const chunks: string[][] = [[]];
  const chunkHasQuestion: boolean[] = [false];
  for (const line of lines) {
    const trimmed = line.trim();
    const isQuestionLabel = /^\s*(question|user|prompt)\s*:/i.test(trimmed) || /^\s*#{1,6}\s*question\b/i.test(trimmed);
    const currentIndex = chunks.length - 1;
    const isDelimiter = trimmed === "---" || /^#{1,3}\s*example\b/i.test(trimmed) || (isQuestionLabel && chunkHasQuestion[currentIndex]);
    if (isDelimiter) {
      if (chunks[currentIndex].length > 0) {
        chunks.push([]);
        chunkHasQuestion.push(false);
      }
      continue;
    }
    if (isQuestionLabel) chunkHasQuestion[currentIndex] = true;
    chunks[chunks.length - 1].push(line);
  }
  return chunks.map((chunk) => chunk.join("\n").trim()).filter(Boolean);
}

function parseLabeledFields(text: string): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  let currentLabel = "";
  let buffer: string[] = [];
  const flush = () => {
    if (!currentLabel) return;
    const value = buffer.join("\n").trim();
    if (!fields[currentLabel]) fields[currentLabel] = [];
    fields[currentLabel].push(value);
  };
  for (const line of text.split("\n")) {
    const heading = line.match(/^\s*#{1,6}\s*([A-Za-z][\w /()-]*)\s*$/);
    if (heading) {
      flush();
      currentLabel = heading[1].toLowerCase();
      buffer = [];
      continue;
    }
    const match = line.match(/^\s*([A-Za-z][\w /()-]*):\s*(.*)\s*$/);
    if (match) {
      flush();
      currentLabel = match[1].toLowerCase();
      buffer = [match[2]];
    } else if (currentLabel) {
      buffer.push(line);
    }
  }
  flush();
  return fields;
}

function firstField(fields: Record<string, string[]>, labels: string[]): string {
  for (const label of labels) {
    const values = fields[label.toLowerCase()];
    if (values?.length) return values[0].trim();
  }
  return "";
}

function getFieldAll(fields: Record<string, string[]>, labels: string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const values = fields[label.toLowerCase()];
    if (values?.length) out.push(...values.flatMap((value) => value.split(/[,;\n]/g)));
  }
  return [...new Set(out.map((value) => value.trim()).filter(Boolean).map((value) => value.toLowerCase()))];
}

function normalizeDomain(value: string | undefined, fallback = DEFAULT_DOMAIN): string {
  const t = lower(value ?? "");
  if (!t) return fallback;
  if (/(career|job|promotion|salary)/.test(t)) return "career";
  if (/(sleep|insomnia|rest)/.test(t)) return "sleep";
  if (/(marriage|relationship|spouse)/.test(t)) return "marriage";
  if (/(money|wealth|debt|business)/.test(t)) return "money";
  if (/(foreign|relocation|visa)/.test(t)) return "foreign";
  if (/(education|study|exam)/.test(t)) return "education";
  if (/(spirituality|mantra|worship)/.test(t)) return "spirituality";
  if (/(health|medical|cancer)/.test(t)) return "health";
  if (/(legal|court)/.test(t)) return "legal";
  if (/(safety|death|self-harm)/.test(t)) return "safety";
  return t || fallback;
}

export function normalizeBenchmarkDomain(value: string | undefined, fallback = DEFAULT_DOMAIN): string {
  return normalizeDomain(value, fallback);
}

function normalizeAccuracy(value: string | undefined, answer: string): ParsedBenchmarkExample["accuracyClass"] {
  const t = lower(value ?? "");
  if (/(total|totally accurate|exact fact)/.test(t)) return "totally_accurate";
  if (/(grounded|interpretable|interpretive)/.test(t)) return "grounded_interpretive";
  if (/(partial|limited)/.test(t)) return "partial";
  if (/(unavailable|insufficient)/.test(t)) return "unavailable";
  if (/(safety|refusal)/.test(t) || isRefusalText(answer)) return "safety_only";
  return "grounded_interpretive";
}

function normalizeReadingStyle(value: string | undefined, answer: string): ParsedBenchmarkExample["readingStyle"] {
  const t = lower(value ?? "");
  if (/(companion|human|friendly)/.test(t)) return "companion";
  if (/(direct|short)/.test(t)) return "direct";
  if (/(technical|rule)/.test(t)) return "technical";
  if (/(remedy)/.test(t)) return "remedy";
  if (/(safety|refusal)/.test(t) || isRefusalText(answer)) return "safety";
  if (/(followup|clarifying)/.test(t)) return "followup";
  return "mixed";
}

function inferQuestionTypeTags(question: string, answer: string): string[] {
  const q = lower(question);
  const tags = new Set<string>();
  if (/(when|time|timing|date|how long|deadline|period)/.test(q)) tags.add("timing");
  if (/(remedy|solution|what to do|how to improve|fix)/.test(q)) tags.add("remedy");
  if (/(exactly|what is|how many|which house|fact|placement)/.test(q)) tags.add("exact_fact");
  if (/(will happen|what will|should i|is it|can i|would i)/.test(q)) tags.add("interpretive");
  if (lower(answer).includes("follow-up") || /what will happen|vague|narrow/i.test(question)) tags.add("followup");
  if (!tags.size) tags.add("interpretive");
  return [...tags];
}

function inferAnchors(domain: string, question: string, answer: string, reasoning: string): string[] {
  const text = `${question}\n${answer}\n${reasoning}`.toLowerCase();
  const anchors = new Set<string>();
  if (domain === "career") {
    if (text.includes("house 10") || text.includes("10th")) anchors.add("house_10");
    if (text.includes("lord 10")) anchors.add("lord_10");
    if (text.includes("sun")) anchors.add("sun_placement");
    if (text.includes("house 11")) anchors.add("house_11");
    if (text.includes("dasha")) anchors.add("current_dasha");
  }
  if (domain === "sleep") {
    if (text.includes("house 12") || text.includes("12th")) anchors.add("house_12");
    if (text.includes("moon")) anchors.add("moon_placement");
    if (text.includes("house 6")) anchors.add("house_6");
    anchors.add("safe_remedy_rules");
  }
  if (domain === "marriage") {
    if (text.includes("house 7") || text.includes("7th")) anchors.add("house_7");
    if (text.includes("lord 7")) anchors.add("lord_7");
    if (text.includes("venus")) anchors.add("venus_placement");
    if (text.includes("dasha")) anchors.add("current_dasha");
  }
  if (domain === "money") {
    if (text.includes("house 2")) anchors.add("house_2");
    if (text.includes("house 11")) anchors.add("house_11");
  }
  return [...anchors];
}

function detectUnsafe(question: string, answer: string): string[] {
  const t = `${question}\n${answer}`.toLowerCase();
  const flags: string[] = [];
  if (/death date|date of death|when will i die/.test(t)) flags.push("death_prediction");
  if (/diagnos|medical diagnosis|disease certainty|cancer/.test(t)) flags.push("medical_diagnosis");
  if (/stop medication|discontinue medication|avoid medication/.test(t)) flags.push("stop_medication");
  if (/(stock|crypto|lottery).*(guarantee|sure|certain)/.test(t)) flags.push("investment_guarantee");
  if (/gemstone.*(guarantee|certain|sure)/.test(t)) flags.push("gemstone_guarantee");
  if (/expensive puja|pressure.*puja|must do puja/.test(t)) flags.push("puja_pressure");
  if (/self-harm|kill myself|suicide|cut myself/.test(t)) flags.push("self_harm");
  return flags;
}

function parseExample(text: string, defaults: Record<string, string>, sourceFile: string, options: BenchmarkParserOptions): { example?: ParsedBenchmarkExample; issue?: BenchmarkParseIssue } {
  const fields = parseLabeledFields(text);
  const question = firstField(fields, ["question", "user", "prompt"]) || defaults.question || "";
  const answer = firstField(fields, ["answer", "response"]) || defaults.answer || "";
  const reasoning = firstField(fields, ["reasoning", "chart basis"]) || "";
  const explicitDomain = firstField(fields, ["domain", "topic"]) || defaults.domain || "";
  const domain = normalizeDomain(explicitDomain || `${question}\n${answer}\n${reasoning}`, options.defaultDomain ?? DEFAULT_DOMAIN);
  const accuracyClass = normalizeAccuracy(firstField(fields, ["accuracy", "accuracy class"]) || defaults.accuracy, answer);
  const readingStyle = normalizeReadingStyle(firstField(fields, ["style", "reading style"]) || defaults.style, answer);
  const followUp = firstField(fields, ["follow-up", "suggested follow-up"]) || null;
  const tags = [...new Set([domain, ...getFieldAll(fields, ["tags"]), ...inferQuestionTypeTags(question, answer), readingStyle].filter(Boolean))].map((value) => value.toLowerCase());
  const safetyFlags = detectUnsafe(question, answer);
  const requiredAnchors = [...new Set([...getFieldAll(fields, ["required anchors"]), ...inferAnchors(domain, question, answer, reasoning)])];
  const forbiddenClaims = [...new Set(getFieldAll(fields, ["forbidden claims"]))];
  const trimmedAnswer = normalizeText(answer).slice(0, options.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS);
  const metadata: Record<string, unknown> = {
    truncated: normalizeText(answer).length > (options.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS),
    source: { file: sourceFile },
  };
  const sourceFileNormalized = normalizeFilePath(sourceFile, options.sourceRoot);
  const sourceHash = computeHash(`${sourceFileNormalized}\n${question}\n${trimmedAnswer}`);
  const sourceSlug = slugify(`${sourceFileNormalized}-${question}`);
  const example: ParsedBenchmarkExample = {
    sourceFile,
    sourceHash,
    sourceSlug,
    domain,
    question: normalizeText(question),
    answer: trimmedAnswer.trim(),
    reasoning: normalizeText(reasoning),
    accuracyClass,
    readingStyle,
    followUp: followUp ? normalizeText(followUp) : null,
    tags,
    safetyFlags,
    requiredAnchors,
    forbiddenClaims,
    metadata,
  };
  if (safetyFlags.length && readingStyle !== "safety" && accuracyClass !== "safety_only" && !isRefusalText(answer)) {
    return { issue: makeIssue(sourceFile, "unsafe_content", "unsafe benchmark content") };
  }
  const issues = validateParsedBenchmarkExample(example);
  if (issues.length) return { issue: issues[0] };
  return { example };
}

export function validateParsedBenchmarkExample(example: ParsedBenchmarkExample): BenchmarkParseIssue[] {
  const issues: BenchmarkParseIssue[] = [];
  if (!example.question.trim()) issues.push(makeIssue(example.sourceFile, "missing_question", "missing question"));
  if (!example.answer.trim()) issues.push(makeIssue(example.sourceFile, "missing_answer", "missing answer"));
  if (!example.domain.trim()) issues.push(makeIssue(example.sourceFile, "missing_domain", "missing domain"));
  if (!example.accuracyClass) issues.push(makeIssue(example.sourceFile, "missing_accuracy", "missing accuracy"));
  if (example.answer.trim().length < 20 && !["followup", "safety"].includes(example.readingStyle)) issues.push(makeIssue(example.sourceFile, "too_short", "answer too short"));
  return issues;
}

export function computeBenchmarkSourceHash(input: string): string {
  return computeHash(input.replace(/\r\n/g, "\n").trim());
}

export function inferBenchmarkTags(example: Pick<ParsedBenchmarkExample, "domain" | "question" | "answer" | "reasoning" | "readingStyle">): string[] {
  return [...new Set([example.domain, ...inferQuestionTypeTags(example.question, example.answer), example.readingStyle].map((value) => value.toLowerCase()))];
}

export function parseBenchmarkMarkdownFile(input: {
  sourceFile: string;
  content: string;
  options?: BenchmarkParserOptions;
}): BenchmarkParseResult {
  const options = input.options ?? {};
  const content = normalizeText(input.content);
  const result: BenchmarkParseResult = { examples: [], issues: [], stats: { filesRead: 1, examplesParsed: 0, examplesSkipped: 0, duplicateCount: 0 } };
  if (!content) {
    result.issues.push(makeIssue(input.sourceFile, "empty_file", "empty file"));
    result.stats.examplesSkipped += 1;
    return result;
  }
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  if (Buffer.byteLength(content, "utf8") > maxFileBytes) {
    result.issues.push(makeIssue(input.sourceFile, "too_large", "file too large"));
    result.stats.examplesSkipped += 1;
    return result;
  }
  const { frontmatter, body } = parseFrontmatter(content);
  const chunks = splitExamples(body);
  const seen = new Set<string>();
  const defaults = {
    domain: frontmatter.domain ?? frontmatter.topic ?? options.defaultDomain ?? "",
    question: frontmatter.question ?? "",
    answer: frontmatter.answer ?? "",
    accuracy: frontmatter.accuracy ?? frontmatter["accuracy class"] ?? "",
    style: frontmatter.style ?? frontmatter["reading style"] ?? "",
  };
  for (const chunk of chunks.length ? chunks : [body]) {
    const parsed = parseExample(chunk, defaults, input.sourceFile, options);
    if (parsed.issue) {
      result.issues.push(parsed.issue);
      result.stats.examplesSkipped += 1;
      continue;
    }
    if (!parsed.example) continue;
    if (seen.has(parsed.example.sourceHash)) {
      result.issues.push(makeIssue(input.sourceFile, "duplicate_example", "duplicate example"));
      result.stats.duplicateCount += 1;
      result.stats.examplesSkipped += 1;
      continue;
    }
    seen.add(parsed.example.sourceHash);
    result.examples.push(parsed.example);
    result.stats.examplesParsed += 1;
  }
  return result;
}

export function parseBenchmarkMarkdownFiles(input: {
  files: Array<{ sourceFile: string; content: string }>;
  options?: BenchmarkParserOptions;
}): BenchmarkParseResult {
  const combined: BenchmarkParseResult = { examples: [], issues: [], stats: { filesRead: input.files.length, examplesParsed: 0, examplesSkipped: 0, duplicateCount: 0 } };
  const seen = new Set<string>();
  for (const file of input.files) {
    const parsed = parseBenchmarkMarkdownFile({ sourceFile: file.sourceFile, content: file.content, options: input.options });
    combined.issues.push(...parsed.issues);
    combined.stats.examplesParsed += parsed.stats.examplesParsed;
    combined.stats.examplesSkipped += parsed.stats.examplesSkipped;
    combined.stats.duplicateCount += parsed.stats.duplicateCount;
    for (const example of parsed.examples) {
      if (seen.has(example.sourceHash)) {
        combined.issues.push(makeIssue(file.sourceFile, "duplicate_example", "duplicate example"));
        combined.stats.duplicateCount += 1;
        combined.stats.examplesSkipped += 1;
        continue;
      }
      seen.add(example.sourceHash);
      combined.examples.push(example);
    }
  }
  return combined;
}
