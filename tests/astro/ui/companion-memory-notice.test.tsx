/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanionMemoryNotice } from "@/components/astro/CompanionMemoryNotice";

const render = (props: Parameters<typeof CompanionMemoryNotice>[0]) => renderToStaticMarkup(<CompanionMemoryNotice {...props} />);

describe("CompanionMemoryNotice", () => {
  it.each([
    ["hidden when off", {}, ""],
    ["shows used copy", { memoryUsed: true }, "avoid repeating a generic answer"],
    ["shows saved copy", { memorySaved: true }, "remember that this topic matters"],
    ["shows safe short summary", { memorySaved: true, summary: "Short summary" }, "Short summary"],
    ["hides/clamps unsafe long summary", { memorySaved: true, summary: "x".repeat(500) }, "x".repeat(140)],
    ["clear button calls callback", { memoryUsed: true, onClearMemory: () => void 0 }, "Clear remembered context"],
    ["works without callback", { memoryUsed: true }, "Memory"],
    ["does not imply surveillance", { memoryUsed: true }, "small amount of your previous context"],
    ["does not show raw memory json", { memoryUsed: true, summary: "{\"raw\":true}" }, "raw:true"],
    ["does not show private details", { memorySaved: true, summary: "private details" }, "private details"],
    ["accessible label exists", { memoryUsed: true }, "Companion memory"],
    ["flags alone without used/saved do not show notice", { summary: "x" }, ""],
  ])("%s", (_, props, expected) => {
    const html = render(props as never);
    if (expected) expect(html).toContain(expected);
    else expect(html).toBe("");
  });
});
