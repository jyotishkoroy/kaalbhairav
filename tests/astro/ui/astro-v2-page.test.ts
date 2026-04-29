import { describe, expect, it } from "vitest";

import AstroV2Page, { metadata } from "@/app/astro/v2/page";

describe("/astro/v2 page", () => {
  it("exports metadata", () => {
    expect(metadata.title).toContain("Astro Reading V2");
  });

  it("exports a page component", () => {
    expect(typeof AstroV2Page).toBe("function");
  });
});
