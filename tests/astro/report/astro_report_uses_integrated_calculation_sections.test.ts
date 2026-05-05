/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildAstroReportContract } from "@/lib/astro/report/report-builder.ts";
import { validateReportFieldProvenance } from "@/lib/astro/report/fact-provenance-validator.ts";

const base = {
  schemaVersion: "chart_json_v2",
  metadata: { profileId: "p1", chartVersionId: "cv1", chartVersion: 16, inputHash: "i", settingsHash: "s", engineVersion: "e", ephemerisVersion: "ep", ayanamsha: "lahiri", houseSystem: "whole_sign", runtimeClockIso: "2026-05-05T00:00:00.000Z" },
  sections: {
    timeFacts: { status: "computed", source: "deterministic_calculation", fields: {} },
    planetaryPositions: { status: "computed", source: "deterministic_calculation", fields: { byBody: { Sun: { sign: "Taurus", house: 10 }, Moon: { sign: "Gemini", house: 11, nakshatra: "Ardra", pada: 2 } } } },
    lagna: { status: "computed", source: "deterministic_calculation", fields: { sign: "Leo", ascendant: { sign: "Leo" } } },
    houses: { status: "computed", source: "deterministic_calculation", fields: {} },
    panchang: { status: "computed", source: "deterministic_calculation", fields: { weekday: "Tuesday", tithi: "Pratipad", paksha: "Shukla", yoga: "Vishkambha", karana: "Bava" } },
    d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10 } },
    d9Chart: { status: "computed", source: "deterministic_calculation", fields: {} },
    shodashvarga: { status: "computed", source: "deterministic_calculation", fields: {} },
    shodashvargaBhav: { status: "computed", source: "deterministic_calculation", fields: {} },
    vimshottari: { status: "computed", source: "deterministic_calculation", fields: { currentMahadasha: { lord: "Saturn" }, currentAntardasha: { lord: "Mercury" } } },
    kp: { status: "partial", source: "deterministic_calculation", fields: { byBody: { Moon: { rashiLord: "Mercury", nakshatraLord: "Rahu", subLord: "Saturn", subSubLord: "Mercury" } }, significators: { status: "unavailable", value: null, reason: "module_not_implemented", source: "none", requiredModule: "kp_significators", fieldKey: "sections.kp.fields.significators" } } },
    dosha: { status: "computed", source: "deterministic_calculation", fields: { manglik: { isManglik: false }, kalsarpa: { isKalsarpa: false } } },
    ashtakavarga: { status: "computed", source: "deterministic_calculation", fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
    transits: { status: "unavailable", source: "none", reason: "missing", fields: {} },
    advanced: { status: "unavailable", source: "none", reason: "missing", fields: {} },
  },
};

describe("astro report uses integrated calculation sections", () => {
  it("resolves core deterministic fields", () => {
    const report = buildAstroReportContract({ chartJson: base, profileId: "p1", chartVersionId: "cv1", sourceMode: "test_fixture" });
    const fields = report.groups.flatMap((g) => g.fields);
    expect(fields.find((f) => f.fieldKey === "lagna_sign")?.status).toBe("resolved");
    expect((fields.find((f) => f.fieldKey === "moon_sign") as { value?: string } | undefined)?.value).toBe("Gemini");
    expect((fields.find((f) => f.fieldKey === "sun_sign") as { value?: string } | undefined)?.value).toBe("Taurus");
    expect((fields.find((f) => f.fieldKey === "lagna_sign") as { value?: string } | undefined)?.value).toBe("Leo");
  });
  it("keeps KP significators unavailable", () => {
    const report = buildAstroReportContract({ chartJson: base, profileId: "p1", chartVersionId: "cv1" });
    expect(report.groups.flatMap((g) => g.fields).find((f) => f.fieldKey === "kp_significators")?.status).toBe("unavailable");
  });
  it("rejects missing provenance", () => {
    const field = { fieldKey: "lagna_sign", groupId: "core_chart", displayLabel: "Lagna Sign", status: "resolved", value: "Leo", source_type: "astronomical_calculation", source_path: "sections.lagna.fields.sign", provenance: { registryFieldKey: "lagna_sign", sourceType: "astronomical_calculation", sourcePath: "sections.lagna.fields.sign" }, riskLevel: "MEDIUM", warnings: [] } as never;
    expect(validateReportFieldProvenance(field, { requireChartVersionId: true, requireProfileId: true }).ok).toBe(false);
  });
  it("marks unsupported advanced fields unavailable", () => {
    const report = buildAstroReportContract({ chartJson: { ...base, sections: { ...base.sections, advanced: { status: "unavailable", source: "none", reason: "missing", fields: {} } } }, profileId: "p1", chartVersionId: "cv1" });
    expect(report.groups.flatMap((g) => g.fields).find((f) => f.fieldKey === "shadbala")?.status).toBe("unavailable");
  });
  it("does not accept conflicting exact chart text", () => {
    const report = buildAstroReportContract({ chartJson: base, profileId: "p1", chartVersionId: "cv1" });
    expect(report.groups.flatMap((g) => g.fields).find((f) => f.fieldKey === "lagna_sign")?.status).toBe("resolved");
  });
});
