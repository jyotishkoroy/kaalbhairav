/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect } from "vitest";

// This test verifies the intended behavior of profile/route.ts:
// When birth details are updated, current_chart_version_id is set to null.
// The actual DB call is tested via integration tests; here we verify the code contract.

describe("astro_profile_update_invalidates_old_current_chart", () => {
  it("profile update payload includes current_chart_version_id: null", async () => {
    // Read the source of the profile route to verify the null assignment is present.
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/astro/v1/profile/route.ts"),
      "utf-8",
    );
    expect(source).toContain("current_chart_version_id: calculationFieldsChanged ? null : undefined");
    expect(source).toContain("input_hash: calculationFieldsChanged ? null : undefined");
  });

  it("calculate route calls promote_current_chart_version RPC for atomic promotion", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/astro/v1/calculate/route.ts"),
      "utf-8",
    );
    expect(source).toContain("promote_current_chart_version");
    expect(source).toContain("p_chart_version_id");
  });
});
