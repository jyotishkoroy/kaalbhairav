/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect } from "vitest";
import { unavailableAstroField } from "@/lib/astro/types";

const UNIMPLEMENTED_SECTIONS = [
  "ashtakvarga",
  "prastharashtakvarga",
  "shadbala",
  "bhavabala",
  "kp_nakshatra_nadi",
  "varshaphal",
  "yogini_dasha",
  "jaimini",
  "char_dasha",
  "lal_kitab",
  "chalit",
  "sade_sati",
  "kalsarpa",
  "manglik",
  "western_aspects",
  "aspects_bhav_madhya",
  "aspects_kp_cusp",
];

describe("astro_unimplemented_sections_return_unavailable", () => {
  it("unavailableAstroField returns correct shape", () => {
    const result = unavailableAstroField("ashtakvarga");
    expect(result.status).toBe("unavailable");
    expect(result.source).toBe("none");
    expect(result.reason).toBe("not_implemented");
    expect(result.field).toBe("ashtakvarga");
  });

  it("all unimplemented sections can be represented with unavailableAstroField", () => {
    for (const section of UNIMPLEMENTED_SECTIONS) {
      const result = unavailableAstroField(section);
      expect(result.status).toBe("unavailable");
      expect(result.source).toBe("none");
      expect(result.field).toBe(section);
    }
  });

  it("unavailableAstroField accepts custom reason", () => {
    const result = unavailableAstroField("varshaphal", "requires_solar_return_engine");
    expect(result.reason).toBe("requires_solar_return_engine");
  });
});
