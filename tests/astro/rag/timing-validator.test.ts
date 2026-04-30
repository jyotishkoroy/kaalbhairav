// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateAnswerTiming } from "../../../lib/astro/rag/validators/timing-validator";
import { fakeContract, fakeTiming, makeInput } from "./test-fixtures";

const timingAllowedContract = fakeContract({ timingAllowed: true });
const timingDisallowedContract = fakeContract({ timingAllowed: false });

describe("timing validator", () => {
  it("fails when timing is disallowed and a date is stated", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingDisallowedContract, answer: "It will happen on 2026-01-01." }));
    expect(result.some((issue) => issue.code === "timing_not_allowed")).toBe(true);
  });

  it("passes timing unavailable limitation text", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingDisallowedContract, answer: "Timing is unavailable here." }));
    expect(result).toHaveLength(0);
  });

  it("passes a grounded date range", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingAllowedContract, timing: fakeTiming(true), answer: "The grounded window is 2026-01-01 to 2026-06-30." }));
    expect(result).toHaveLength(0);
  });

  it("fails a date outside the grounded window", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingAllowedContract, timing: fakeTiming(true), answer: "The event will happen on 2027-01-01." }));
    expect(result.some((issue) => issue.code === "invented_timing")).toBe(true);
  });

  it("fails next month second half without source", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingAllowedContract, timing: { ...fakeTiming(true), windows: [], available: true }, answer: "Next month second half looks best." }));
    expect(result.some((issue) => issue.code === "invented_timing")).toBe(true);
  });

  it("fails exact dates when only dasha backdrop exists", () => {
    const timing = { ...fakeTiming(true), windows: [{ ...fakeTiming(true).windows[0], startsOn: undefined, endsOn: undefined, interpretation: "Dasha backdrop only" }] };
    const result = validateAnswerTiming(makeInput({ contract: timingAllowedContract, timing, answer: "Use 2026-05-01." }));
    expect(result.some((issue) => issue.code === "invented_timing")).toBe(true);
  });

  it("passes a grounded unavailable-timing limitation", () => {
    const result = validateAnswerTiming(makeInput({ contract: timingAllowedContract, timing: { ...fakeTiming(false), available: false }, answer: "No grounded timing source is available." }));
    expect(result).toHaveLength(0);
  });
});
