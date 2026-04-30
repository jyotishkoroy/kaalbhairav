/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadingFeedbackBar } from "@/components/astro/ReadingFeedbackBar";

const render = (props: Parameters<typeof ReadingFeedbackBar>[0]) => renderToStaticMarkup(<ReadingFeedbackBar {...props} />);

describe("ReadingFeedbackBar", () => {
  it.each([
    ["renders question", {}, "Did this feel helpful?"],
    ["yes button", {}, "Yes"],
    ["somewhat button", {}, "Somewhat"],
    ["too generic", {}, "Too generic"],
    ["too fearful", {}, "Too fearful"],
    ["not relevant", {}, "Not relevant"],
    ["comment textarea", {}, "Tell us what felt missing."],
    ["message/session ids hidden", { messageId: "m", sessionId: "s" }, "sr-only"],
    ["disabled prop disables", { disabled: true }, "disabled"],
    ["no internal metadata", {}, "Reading feedback"],
    ["no raw answer text", {}, "Reading feedback"],
    ["submit feedback button", {}, "Submit feedback"],
  ])("%s", (_, props, expected) => {
    const html = render(props as never);
    expect(html).toContain(expected);
  });
});
