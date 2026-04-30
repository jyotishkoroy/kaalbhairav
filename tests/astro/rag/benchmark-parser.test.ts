import { describe, expect, it } from "vitest";
import {
  computeBenchmarkSourceHash,
  inferBenchmarkTags,
  normalizeBenchmarkDomain,
  parseBenchmarkMarkdownFile,
  parseBenchmarkMarkdownFiles,
} from "../../../lib/astro/rag/benchmark-parser";

const makeQ = (q: string, a: string, extras = "") => `Question: ${q}\nAnswer: ${a}\n${extras}`;

describe("benchmark parser", () => {
  it("parses frontmatter domain", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "career.md", content: `---\ndomain: career\n---\nQuestion: working hard and not getting promotion.\nAnswer: The 10th house is under pressure and the answer is grounded.\n` });
    expect(result.examples[0].domain).toBe("career");
  });
  it("parses sections", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "career.md", content: `## Question\nI am working hard and not getting promotion.\n## Answer\nDirect answer with a clear career reading.\n## Reasoning\nThe 10th house matters.\n## Accuracy\nTotally accurate\n## Suggested follow-up\nWhich timing window matters most?` });
    expect(result.examples[0]).toMatchObject({ accuracyClass: "totally_accurate", readingStyle: "mixed" });
  });
  it("parses question section", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "q.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].question).toContain("promotion");
  });
  it("parses answer section", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "a.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].answer).toContain("career answer");
  });
  it("parses reasoning section", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "r.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nReasoning: 10th house and current dasha.` });
    expect(result.examples[0].reasoning).toContain("current dasha");
  });
  it("parses accuracy section", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "acc.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nAccuracy: Totally accurate` });
    expect(result.examples[0].accuracyClass).toBe("totally_accurate");
  });
  it("parses follow-up section", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "f.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nSuggested follow-up: Which timing window matters most?` });
    expect(result.examples[0].followUp).toContain("timing window");
  });
  it("handles multiline answer", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "m.md", content: makeQ("promotion?", "Line one.\nLine two.\nLine three.") });
    expect(result.examples[0].answer).toContain("Line three");
  });
  it("trims whitespace", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "t.md", content: `Question:   promotion?   \nAnswer:   This is a career answer grounded in the 10th house.   ` });
    expect(result.examples[0].question).toBe("promotion?");
  });
  it("stores no raw content in metadata", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "meta.md", content: makeQ("promotion?", "This is a career answer grounded in the 10th house.") });
    expect(JSON.stringify(result.examples[0].metadata)).not.toContain("Question:");
  });
  it("stable sourceHash", () => {
    expect(computeBenchmarkSourceHash("file\nQ\nA")).toBe(computeBenchmarkSourceHash("file\nQ\nA"));
  });
  it("parses Question label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].question).toContain("promotion");
  });
  it("parses User label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `User: promotion?\nAnswer: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].question).toContain("promotion");
  });
  it("parses Prompt label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Prompt: promotion?\nAnswer: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].question).toContain("promotion");
  });
  it("parses Response label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Question: promotion?\nResponse: This is a career answer grounded in the 10th house.` });
    expect(result.examples[0].answer).toContain("career answer");
  });
  it("parses Chart basis label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nChart basis: Taurus in the 10th.` });
    expect(result.examples[0].reasoning).toContain("10th");
  });
  it("parses Follow-up label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nFollow-up: Which timing window matters most?` });
    expect(result.examples[0].followUp).toContain("timing window");
  });
  it("parses Tags label", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `Question: promotion?\nAnswer: This is a career answer grounded in the 10th house.\nTags: career, promotion` });
    expect(result.examples[0].tags).toContain("career");
  });
  it("handles mixed casing", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "label.md", content: `qUeStIoN: promotion?\nReSpOnSe: This is a career answer grounded in the 10th house.\nAcCuRaCy ClAsS: grounded interpretive` });
    expect(result.examples[0].accuracyClass).toBe("grounded_interpretive");
  });
  it("parses examples separated by ---", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "multi.md", content: `Question: marriage?\nAnswer: This is a marriage answer grounded in the 7th house.\n---\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.examples).toHaveLength(2);
  });
  it("parses examples separated by example heading", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "multi.md", content: `## Example\nQuestion: marriage?\nAnswer: This is a marriage answer grounded in the 7th house.\n## Example\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.examples).toHaveLength(2);
  });
  it("parses repeated question blocks", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "multi.md", content: `Question: marriage?\nAnswer: This is a marriage answer grounded in the 7th house.\n---\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.examples).toHaveLength(2);
  });
  it("skips duplicate examples", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "dup.md", content: `Question: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.\n---\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.stats.duplicateCount).toBe(1);
  });
  it("reports duplicate issue", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "dup.md", content: `Question: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.\n---\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.issues.some((issue) => issue.code === "duplicate_example")).toBe(true);
  });
  it("preserves source file per example", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "source.md", content: `Question: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.examples[0].sourceFile).toBe("source.md");
  });
  it("handles malformed and valid example", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "mixed.md", content: `Question: money?\n---\nQuestion: money?\nAnswer: This is a money answer grounded in the 2nd and 11th houses.` });
    expect(result.examples).toHaveLength(1);
  });
  it("counts files examples skips", () => {
    const result = parseBenchmarkMarkdownFiles({ files: [{ sourceFile: "a.md", content: makeQ("promotion?", "This is a career answer grounded in the 10th house.") }, { sourceFile: "b.md", content: "" }] });
    expect(result.stats.filesRead).toBe(2);
    expect(result.stats.examplesParsed).toBe(1);
    expect(result.stats.examplesSkipped).toBe(1);
  });
  it("infers career from promotion", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "career.md", content: makeQ("promotion?", "This is a career answer grounded in the 10th house.") });
    expect(result.examples[0].domain).toBe("career");
  });
  it("infers salary to career", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "career.md", content: makeQ("salary hike?", "This is a career answer grounded in the 10th house.") });
    expect(result.examples[0].domain).toBe("career");
  });
  it("infers sleep domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "sleep.md", content: makeQ("bad sleep", "This is a sleep answer grounded in the 12th house and moon.") }).examples[0].domain).toBe("sleep");
  });
  it("infers marriage domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "m.md", content: makeQ("spouse", "This is a marriage answer grounded in the 7th house.") }).examples[0].domain).toBe("marriage");
  });
  it("infers money domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "m.md", content: makeQ("debt and business", "This is a money answer grounded in the 2nd and 11th houses.") }).examples[0].domain).toBe("money");
  });
  it("infers foreign domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "f.md", content: makeQ("visa relocation", "This is a foreign answer.") }).examples[0].domain).toBe("foreign");
  });
  it("infers education domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "e.md", content: makeQ("exam study", "This is an education answer.") }).examples[0].domain).toBe("education");
  });
  it("infers spirituality domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "s.md", content: makeQ("mantra worship", "This is a spirituality answer.") }).examples[0].domain).toBe("spirituality");
  });
  it("infers health domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "h.md", content: makeQ("feeling unwell", "This is a health answer that is grounded in the 6th and 12th houses.") }).examples[0].domain).toBe("health");
  });
  it("infers legal domain", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "l.md", content: makeQ("court legal", "This is a legal answer.") }).examples[0].domain).toBe("legal");
  });
  it("vague question becomes general followup style", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "g.md", content: makeQ("what will happen", "This is a follow-up answer, please narrow the question.") });
    expect(result.examples[0].tags).toContain("followup");
  });
  it("exact fact tag", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "x.md", content: makeQ("what is the exact placement?", "This is a factual answer grounded in the 10th house.") }).examples[0].tags).toContain("exact_fact");
  });
  it("timing tag", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "x.md", content: makeQ("when will promotion happen", "This is a timing answer grounded in dasha.") }).examples[0].tags).toContain("timing");
  });
  it("remedy tag", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "x.md", content: makeQ("what remedy should I do", "This is a remedy answer with grounded steps.") }).examples[0].tags).toContain("remedy");
  });
  it("unsafe death-date skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("When will I die?", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe medical diagnosis skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("medical diagnosis", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe stop medication skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("stop medication", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe stock guarantee skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("stock guarantee", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe gemstone guarantee skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("gemstone guarantee", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe puja pressure skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("expensive puja pressure", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("unsafe self-harm method skipped", () => {
    expect(parseBenchmarkMarkdownFile({ sourceFile: "u.md", content: makeQ("self-harm method", "This is a prediction.") }).issues.some((issue) => issue.code === "unsafe_content")).toBe(true);
  });
  it("safe death refusal accepted", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "safe.md", content: `Question: When will I die?\nAnswer: I cannot help with death predictions. Please speak with a trusted professional if you need support.\nStyle: safety` });
    expect(result.examples[0].readingStyle).toBe("safety");
  });
  it("safe medical disclaimer accepted", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "safe.md", content: `Question: medical diagnosis\nAnswer: I cannot provide a diagnosis; please seek medical care if needed.\nStyle: safety` });
    expect(result.examples[0].readingStyle).toBe("safety");
  });
  it("unsafe issue includes source file", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "unsafe.md", content: makeQ("When will I die?", "This is a prediction.") });
    expect(result.issues[0].sourceFile).toBe("unsafe.md");
  });
  it("too large file skipped", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "big.md", content: `Question: Q\nAnswer: ${"x".repeat(600_001)}` });
    expect(result.issues.some((issue) => issue.code === "too_large")).toBe(true);
  });
  it("long answer trimmed", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "long.md", content: makeQ("promotion?", `${"x".repeat(7000)} grounded in the 10th house.`) });
    expect(result.examples[0].answer.length).toBeLessThanOrEqual(6000);
  });
  it("absolute path sanitized", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "/Users/jyotishko/Documents/kaalbhairav/tmp/benchmark-test/career.md", content: makeQ("promotion?", "This is a career answer grounded in the 10th house."), options: { sourceRoot: "/Users/jyotishko/Documents/kaalbhairav/tmp/benchmark-test" } });
    expect(result.examples[0].sourceSlug).not.toContain("/Users");
  });
  it("sourceSlug is stable and safe", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "tmp/benchmark-test/career.md", content: makeQ("promotion?", "This is a career answer grounded in the 10th house.") });
    expect(result.examples[0].sourceSlug).toMatch(/^[a-z0-9-]+$/);
  });
  it("maxAnswerChars respected", () => {
    const result = parseBenchmarkMarkdownFile({ sourceFile: "max.md", content: makeQ("promotion?", `${"x".repeat(100)} grounded in the 10th house.`), options: { maxAnswerChars: 50 } });
    expect(result.examples[0].answer.length).toBeLessThanOrEqual(50);
  });
  it("domain normalization helper", () => {
    expect(normalizeBenchmarkDomain("promotion")).toBe("career");
    expect(normalizeBenchmarkDomain("sleep")).toBe("sleep");
  });
  it("tag inference helper", () => {
    expect(inferBenchmarkTags({ domain: "career", question: "when promotion", answer: "answer", reasoning: "10th house", readingStyle: "direct" })).toContain("timing");
  });
});
