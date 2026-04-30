/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadingConfidenceNote } from "@/components/astro/ReadingConfidenceNote";

const render = (props: Parameters<typeof ReadingConfidenceNote>[0]) => renderToStaticMarkup(<ReadingConfidenceNote {...props} />);

describe("ReadingConfidenceNote", () => {
  it.each([
    ["renders limitations", { limitations: ["Limited context"] }, "Limited context"],
    ["renders safety boundaries", { safetyBoundaries: ["No lifespan predictions"] }, "No lifespan predictions"],
    ["low confidence grounded", { confidence: "low" }, "grounded"],
    ["high confidence avoids certainty", { confidence: "high" }, "avoid certainty"],
    ["unknown confidence is safe", { confidence: "maybe" }, "grounded"],
    ["hidden or minimal when no content", {}, ""],
    ["does not expose internal validator words", { limitations: ["validator failed"] }, "validator"],
    ["handles long limitations safely", { limitations: ["x".repeat(500)] }, "x".repeat(180)],
    ["avoids destiny wording", { limitations: ["not destiny"] }, "not destiny"],
    ["accessible label exists", { limitations: ["Limited"] }, "Reading confidence"],
  ])("%s", (_, props, expected) => {
    const html = render(props as never);
    if (expected) expect(html).toContain(expected);
    else expect(html).toBe("");
  });
});
