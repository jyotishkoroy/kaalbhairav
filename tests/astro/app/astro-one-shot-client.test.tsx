/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AstroOneShotClient } from "@/app/astro/AstroOneShotClient";

describe("AstroOneShotClient", () => {
  it("renders Ask Guru before aadesh in the DOM", () => {
    const html = renderToStaticMarkup(<AstroOneShotClient />);
    expect(html.indexOf("Ask Guru")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("aadesh")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("Ask Guru")).toBeLessThan(html.indexOf("aadesh"));
  });

  it("keeps Ask Guru above aadesh after submit-ready layout", () => {
    const html = renderToStaticMarkup(<AstroOneShotClient />);
    expect(html.indexOf("Ask Guru")).toBeLessThan(html.indexOf("aadesh"));
  });

  it("renders the answer in the aadesh block and no follow-up or metadata UI", () => {
    const html = renderToStaticMarkup(<AstroOneShotClient />);
    expect(html).toContain('aria-label="aadesh"');
    expect(html).toContain('aria-label="Ask Guru"');
    expect(html).not.toContain("follow-up");
    expect(html).not.toContain("provider");
    expect(html).not.toContain("model");
    expect(html).not.toContain("server");
  });
});
