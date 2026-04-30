/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListeningReflectionCard } from "@/components/astro/ListeningReflectionCard";

const render = (props: Parameters<typeof ListeningReflectionCard>[0]) => renderToStaticMarkup(<ListeningReflectionCard {...props} />);

describe("ListeningReflectionCard", () => {
  it("hidden when isVisible false", () => expect(render({ isVisible: false, topic: "career" })).toBe(""));
  it("hidden when no safe content", () => expect(render({ isVisible: true })).toBe(""));
  it("renders topic", () => expect(render({ isVisible: true, topic: "career" })).toContain("career"));
  it("renders acknowledgement", () => expect(render({ isVisible: true, acknowledgement: "I hear you." })).toContain("I hear you."));
  it("renders gentle practical copy", () => expect(render({ isVisible: true, topic: "career", emotionalTone: "gentle" })).toContain("I’ll keep the tone gentle and practical."));
  it("does not render raw JSON", () => expect(render({ isVisible: true, topic: "{\"debug\":true}" })).not.toContain("{\"debug\""));
  it("does not render raw safety risks", () => expect(render({ isVisible: true, acknowledgement: "risk: fear" })).not.toContain("risk: fear"));
  it("has accessible region label", () => expect(render({ isVisible: true, topic: "career" })).toContain('aria-label="Reading context"'));
  it("handles unknown topic safely", () => expect(render({ isVisible: true, topic: "unknown topic" })).toContain("unknown topic"));
  it("clamps overly long acknowledgement", () => expect(render({ isVisible: true, acknowledgement: "x".repeat(500) })).toContain("x".repeat(180)));
});
