import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backfillAstroChartFactsCli } from "../../../scripts/backfill-astro-chart-facts";

describe("backfillAstroChartFactsCli", () => {
  it("runs in dry mode from input", async () => {
    const dir = mkdtempSync(join(tmpdir(), "astro-facts-"));
    const file = join(dir, "chart.json");
    writeFileSync(file, JSON.stringify({ lagna: { sign: "Leo" } }), "utf8");
    try {
      await expect(backfillAstroChartFactsCli(["--input", file, "--user-id", "user-1"])).resolves.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
