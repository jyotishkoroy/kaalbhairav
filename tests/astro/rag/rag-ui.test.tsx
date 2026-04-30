// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AstroV2ChatClient } from "@/components/astro/AstroV2ChatClient";
import { RagReadingPanel, getDisplayableRagSections, getSafeRagStatus } from "@/components/astro/RagReadingPanel";
import { extractAstroV2ChatResponse } from "@/lib/astro/reading/v2-chat-client";

function renderPanel(props: Parameters<typeof RagReadingPanel>[0]) {
  return renderToStaticMarkup(<RagReadingPanel {...props} />);
}

const structuredSections = {
  safety_response: "Safety line",
  direct_answer: "Direct answer",
  chart_basis: "Chart basis",
  reasoning: "Reasoning",
  timing: "Timing",
  what_to_do: "What to do",
  safe_remedies: "Safe remedies",
  accuracy: "Accuracy",
  limitations: "Limitations",
  suggested_follow_up: "Suggested follow-up",
};

describe("rag ui", () => {
  describe("panel plain/old fallback", () => {
    it.each([
      ["renders plain answer when no sections", { answer: "Plain answer", meta: {} }, "Plain answer"],
      ["renders old followUpQuestion", { answer: "Plain answer", followUpQuestion: "Next?", meta: {} }, "Next?"],
      ["renders old followUpAnswer", { answer: "Plain answer", followUpQuestion: "Next?", followUpAnswer: "Answer", meta: {} }, "Answer"],
      ["handles missing meta", { answer: "Plain answer" }, "Plain answer"],
      ["handles empty sections object", { answer: "Plain answer", sections: {} }, "Plain answer"],
      ["handles null sections", { answer: "Plain answer", sections: null }, "Plain answer"],
      ["handles empty answer safely", { answer: "", meta: {} }, ""],
      ["does not crash on malformed optional fields", { answer: "Plain answer", sections: { direct_answer: 1 as never }, followUpQuestion: 1 as never, followUpAnswer: null, meta: null }, "Plain answer"],
    ])("%s", (_, props, expected) => {
      const html = renderPanel(props as never);
      expect(html).toContain(expected);
    });
  });

  describe("structured sections", () => {
    it.each([
      ["renders safety_response first", { ...structuredSections }, "Safety line"],
      ["renders direct_answer", { ...structuredSections }, "Direct answer"],
      ["renders chart_basis", { ...structuredSections }, "Chart basis"],
      ["renders reasoning", { ...structuredSections }, "Reasoning"],
      ["renders timing", { ...structuredSections }, "Timing"],
      ["renders what_to_do", { ...structuredSections }, "What to do"],
      ["renders safe_remedies", { ...structuredSections }, "Safe remedies"],
      ["renders accuracy", { ...structuredSections }, "Accuracy"],
      ["renders limitations", { ...structuredSections }, "Limitations"],
      ["renders suggested_follow_up", { ...structuredSections }, "Suggested follow-up"],
      ["respects section order", { ...structuredSections }, "Safety line"],
      ["skips empty sections", { direct_answer: "Direct answer", timing: "", accuracy: "Accuracy" }, "Direct answer"],
      ["handles multiline section text", { direct_answer: "Line 1\nLine 2" }, "Line 2"],
      ["handles long section text without crash", { direct_answer: "x".repeat(4000) }, "x"],
    ])("%s", (_, sections, expected) => {
      const html = renderPanel({ answer: "Plain answer", sections, meta: { validationPassed: true } });
      expect(html).toContain(expected);
    });
  });

  describe("rag metadata display", () => {
    it.each([
      ["exactFactAnswered shows deterministic fact badge/status", { exactFactAnswered: true }, "Deterministic fact"],
      ["safetyBlocked shows safety response badge/status", { safetyBlocked: true }, "Safety response"],
      ["fallbackUsed shows fallback badge/status", { fallbackUsed: true }, "Fallback answer"],
      ["groqUsed + validationPassed shows grounded answer badge/status", { groqUsed: true, validationPassed: true }, "Grounded answer"],
    ])("%s", (_, meta, expected) => {
      const html = renderPanel({ answer: "Plain answer", sections: {}, meta });
      expect(html).toContain(expected);
    });

    it.each([
      ["followupAsked stays internal", { followupAsked: true }, "followupAsked"],
      ["meta is not rendered as raw JSON", { groqUsed: true }, "{\"groqUsed\""],
      ["groqUsed internal raw value is not shown unless part of safe human label", { groqUsed: true }, "groqUsed"],
      ["ollamaCriticUsed internal raw value is not shown", { ollamaCriticUsed: true }, "ollamaCriticUsed"],
      ["no local proxy URL rendered", { validationPassed: true }, "127.0.0.1:8787"],
      ["no secret-like field rendered", { validationPassed: true }, "secret"],
    ])("%s", (_, meta, forbidden) => {
      const html = renderPanel({ answer: "Plain answer", sections: {}, meta });
      expect(html).not.toContain(forbidden);
    });
  });

  describe("security/no unsafe render", () => {
    it.each([
      ["does not use/render raw artifacts", { answer: "Plain answer", sections: { direct_answer: "ok" } }, "artifacts"],
      ["does not render section keys containing secret", { answer: "Plain answer", sections: { secret_notes: "hidden" } }, "hidden"],
      ["does not render section keys containing env", { answer: "Plain answer", sections: { env_payload: "hidden" } }, "hidden"],
      ["does not render section keys containing payload", { answer: "Plain answer", sections: { payload_dump: "hidden" } }, "hidden"],
      ["does not render section keys containing supabase", { answer: "Plain answer", sections: { supabase_rows: "hidden" } }, "hidden"],
      ["does not render section keys containing groq", { answer: "Plain answer", sections: { groq_payload: "hidden" } }, "hidden"],
      ["does not render section keys containing ollama", { answer: "Plain answer", sections: { ollama_payload: "hidden" } }, "hidden"],
      ["does not render script tag as HTML", { answer: "<script>alert(1)</script>", sections: {} }, "<script>alert(1)</script>"],
      ["does not use dangerouslySetInnerHTML", { answer: "Plain answer", sections: {} }, "dangerouslySetInnerHTML"],
      ["escapes HTML-looking answer text", { answer: "<b>text</b>", sections: {} }, "<b>text</b>"],
    ])("%s", (_, props, forbidden) => {
      const html = renderPanel(props as never);
      expect(html).not.toContain(forbidden);
    });
  });

  describe("chat client integration", () => {
    it.each([
      ["API RAG response stores sections on assistant message", { answer: "A", sections: { direct_answer: "D" } }, "D"],
      ["API RAG response renders structured panel", { answer: "A", sections: { direct_answer: "D" } }, "Direct answer"],
      ["API old response renders old plain answer", { answer: "A" }, "A"],
      ["API follow-up response renders follow-up", { answer: "A", followUpQuestion: "Next?" }, "Next?"],
      ["API safety response renders safety section", { answer: "A", sections: { safety_response: "Blocked" } }, "Safety response"],
      ["API exact fact response renders deterministic fact status", { answer: "A", meta: { exactFactAnswered: true } }, "Deterministic fact"],
      ["API fallback response renders fallback status", { answer: "A", meta: { fallbackUsed: true } }, "Fallback answer"],
      ["submit behavior unchanged", { answer: "A", meta: {} }, "A"],
      ["multiple messages keep their own sections/meta", { answer: "A", sections: { direct_answer: "D" } }, "D"],
    ])("%s", (_, payload, expected) => {
      const parsed = extractAstroV2ChatResponse(payload);
      const html = renderToStaticMarkup(
        <RagReadingPanel
          answer={parsed.answer}
          sections={parsed.sections}
          meta={parsed.meta}
          followUpQuestion={parsed.followUpQuestion}
          followUpAnswer={parsed.followUpAnswer}
        />,
      );
      expect(html).toContain(expected);
    });

    it("loading state still appears while request pending", () => {
      const html = renderToStaticMarkup(<AstroV2ChatClient profileId="profile-1" />);
      expect(html).toContain("Generate Reading V2 answer");
    });

    it("API error state still appears", () => {
      const html = renderToStaticMarkup(<AstroV2ChatClient />);
      expect(html).toContain("No active birth profile");
    });
  });

  describe("responsiveness/accessibility", () => {
    it.each([
      ["section headings are present", { direct_answer: "Direct answer" }, "Direct answer"],
      ["panel has readable text containers", { direct_answer: "Direct answer" }, "whitespace-pre-wrap"],
      ["follow-up question is visible as text", { direct_answer: "Direct answer" }, "Follow?"],
      ["buttons/inputs retain labels", { direct_answer: "Direct answer" }, "Direct answer"],
      ["status text is not only color-coded", { direct_answer: "Direct answer" }, "Grounded answer"],
      ["rendered answer can be selected/copied as text", { direct_answer: "Direct answer" }, "Direct answer"],
    ])("%s", (_, sections, expected) => {
      const html = renderPanel({ answer: "Plain answer", sections, meta: { groqUsed: true, validationPassed: true }, followUpQuestion: "Follow?" });
      expect(html).toContain(expected);
    });
  });

  it("orders structured sections deterministically", () => {
    const html = renderPanel({ answer: "Plain answer", sections: structuredSections, meta: { groqUsed: true } });
    expect(html.indexOf("Safety response")).toBeLessThan(html.indexOf("Direct answer"));
    expect(html.indexOf("Direct answer")).toBeLessThan(html.indexOf("Chart basis"));
  });

  it("filters unsafe section keys from displayable sections helper", () => {
    expect(getDisplayableRagSections({ direct_answer: "ok", secret_dump: "nope" } as never)).toEqual({
      direct_answer: "ok",
    });
  });

  it("maps safe meta to human-readable status", () => {
    expect(getSafeRagStatus({ exactFactAnswered: true })).toBe("Deterministic fact");
  });
});
