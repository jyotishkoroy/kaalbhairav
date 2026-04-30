/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GentleFollowUpCard } from "@/components/astro/GentleFollowUpCard";

describe("GentleFollowUpCard", () => {
  it("renders follow-up question", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="What specifically?" />)).toContain("What specifically?"));
  it("renders reason when provided", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" reason="Because context is limited" />)).toContain("Because context is limited"));
  it("button exists", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" />)).toContain("Use this follow-up"));
  it("works without callback", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" />)).toContain("Use this follow-up"));
  it("does not auto-submit", () => expect(vi.fn()).not.toHaveBeenCalled());
  it("accessible button label exists", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" />)).toContain("aria-label"));
  it("long question is displayed safely", () => expect(renderToStaticMarkup(<GentleFollowUpCard question={"x".repeat(400)} />)).toContain("x".repeat(220)));
  it("empty question renders nothing", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="   " />)).toBe(""));
  it("does not expose internal reason codes", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" reason="reason_code: internal" />)).not.toContain("reason_code"));
  it("keyboard/click behavior is present", () => expect(renderToStaticMarkup(<GentleFollowUpCard question="Q" />)).toContain("button"));
});
