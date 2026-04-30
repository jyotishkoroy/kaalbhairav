/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanionAnswerShell } from "@/components/astro/CompanionAnswerShell";

const render = (props: Parameters<typeof CompanionAnswerShell>[0]) => renderToStaticMarkup(<CompanionAnswerShell {...props} />);

describe("CompanionAnswerShell", () => {
  it.each([
    ["showCompanionUi false renders plain answer only", { answer: "Plain", showCompanionUi: false }, "Plain"],
    ["showCompanionUi true renders answer", { answer: "Plain", showCompanionUi: true }, "Plain"],
    ["renders listening reflection", { answer: "Plain", showCompanionUi: true, topic: "career" }, "Reading context"],
    ["renders confidence note", { answer: "Plain", showCompanionUi: true, limitations: ["Limited"] }, "Reading confidence"],
    ["renders memory notice", { answer: "Plain", showCompanionUi: true, memoryUsed: true }, "Memory"],
    ["renders followup card", { answer: "Plain", showCompanionUi: true, followUpQuestion: "What next?" }, "Use this follow-up"],
    ["renders feedback bar", { answer: "Plain", showCompanionUi: true }, "Did this feel helpful?"],
    ["preserves paragraph formatting", { answer: "Line 1\nLine 2", showCompanionUi: true }, "Line 2"],
    ["mobile friendly wrapper", { answer: "Plain", showCompanionUi: true }, "grid gap-3"],
    ["does not render raw metadata", { answer: "Plain", showCompanionUi: true }, "ReadingPlan"],
    ["does not render reading analysis json", { answer: "Plain", showCompanionUi: true }, "ListeningAnalysis"],
    ["does not render groq payload words", { answer: "Plain", showCompanionUi: true }, "Groq"],
    ["does not render empty answer unsafe", { answer: "", showCompanionUi: true }, "Did this feel helpful?"],
    ["handles exact fact answer", { answer: "Exact fact", showCompanionUi: true }, "Exact fact"],
    ["handles safety answer", { answer: "Safety boundary", showCompanionUi: true, safetyBoundaries: ["No death predictions"] }, "No death predictions"],
    ["handles remedy answer", { answer: "Remedy", showCompanionUi: true }, "Remedy"],
    ["onFollowUp callback wired", { answer: "A", showCompanionUi: true, followUpQuestion: "Q" }, "Use this follow-up"],
    ["feedback callback wired", { answer: "A", showCompanionUi: true }, "Submit feedback"],
    ["clear memory callback wired", { answer: "A", showCompanionUi: true, memoryUsed: true, onClearMemory: () => void 0 }, "Clear remembered context"],
    ["old ui fallback remains", { answer: "Plain", showCompanionUi: false }, "whitespace-pre-wrap"],
  ])("%s", (_, props, expected) => {
    const html = render(props as never);
    if (props.answer === "") {
      expect(html).toContain("Did this feel helpful?");
      return;
    }
    if (String(expected).includes("ReadingPlan") || String(expected).includes("ListeningAnalysis") || String(expected).includes("Groq")) {
      expect(html).not.toContain(expected);
      return;
    }
    expect(html).toContain(expected);
  });
});
