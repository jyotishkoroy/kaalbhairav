/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { summarizeCompanionLiveResults, writeCompanionParityReport } from "../../../lib/astro/validation/live-parity"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

describe("companion live parity summary", () => {
  it("keeps warning-only page availability non-failing", () => {
    const summary = summarizeCompanionLiveResults([
      {
        id: "astro_v2_page",
        passed: false,
        failures: [],
        warnings: ["page_available"],
      },
    ])

    expect(summary.failed).toBe(0)
    expect(summary.passed).toBe("partial")
    expect(summary.failures).toEqual([])
  })

  it("keeps warning-only failed false result non-failing", () => {
    const summary = summarizeCompanionLiveResults([
      {
        id: "astro_v2_page",
        passed: false,
        failures: [],
        warnings: ["astro_v2_page:page_available"],
        passFailWarning: "warning",
      } as never,
    ])

    expect(summary.failed).toBe(0)
    expect(summary.passed).toBe("yes")
    expect(summary.failures).toEqual([])
  })

  it("synthesizes a failure detail when passed is false without warning status", () => {
    const summary = summarizeCompanionLiveResults([
      {
        id: "unknown",
        passed: false,
        failures: [],
        warnings: [],
      },
    ])

    expect(summary.failed).toBe(1)
    expect(summary.failures).toContain("unknown:case_failed_without_failure_detail")
    expect(summary.passed).toBe("no")
  })

  it("does not report Failed: 1 with Failures - none", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "parity-"))
    const report = writeCompanionParityReport({
      outputDir: dir,
      label: "astro-companion-live-parity",
      results: [
        {
          id: "astro_v2_page",
          passed: false,
          failures: [],
          warnings: ["page_available"],
        },
      ],
    })

    const markdown = readFileSync(report.markdownPath, "utf8")
    expect(markdown).toContain("Failed: 0")
    expect(markdown).toContain("## Failures\n- none")
  })

  it("does not print passed no failed 0 without explanation", () => {
    const summary = summarizeCompanionLiveResults([
      {
        id: "astro_v2_page",
        passed: false,
        failures: [],
        warnings: ["page_available"],
      },
    ])

    expect(summary.passed).toBe("partial")
    expect(summary.failed).toBe(0)
  })
})
