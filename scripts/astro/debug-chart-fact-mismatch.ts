import { DEFAULT_SETTINGS } from "../../lib/astro/settings.ts";
import { normalizeBirthInput } from "../../lib/astro/normalize.ts";
import { buildProfileChartJsonFromMasterOutput } from "../../lib/astro/profile-chart-json-adapter.ts";
import { calculateMasterAstroOutput } from "../../lib/astro/calculations/master.ts";
import { buildAstroChartContext } from "../../lib/astro/chart-context.ts";

type SanitizedBirthData = {
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean;
  birth_time_precision: "exact" | "minute" | "hour" | "day_part" | "unknown";
  birth_place_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  data_consent_version: string;
};

function collectPaths(value: unknown, path: string[] = [], matches: string[] = []): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return matches;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (/ascendant|lagna/i.test(key)) {
      matches.push(nextPath.join("."));
    }
    collectPaths(nested, nextPath, matches);
  }
  return matches;
}

function parseSanitizedBirthData(): SanitizedBirthData {
  return {
    birth_date: process.env.DEBUG_BIRTH_DATE ?? "1999-06-14",
    birth_time: process.env.DEBUG_BIRTH_TIME ?? "09:58",
    birth_time_known: (process.env.DEBUG_BIRTH_TIME_KNOWN ?? "true") === "true",
    birth_time_precision: (process.env.DEBUG_BIRTH_TIME_PRECISION ?? "exact") as SanitizedBirthData["birth_time_precision"],
    birth_place_name: process.env.DEBUG_BIRTH_PLACE_NAME ?? "Kolkata, West Bengal, India",
    latitude: Number(process.env.DEBUG_LATITUDE ?? "22.5726"),
    longitude: Number(process.env.DEBUG_LONGITUDE ?? "88.3639"),
    timezone: process.env.DEBUG_TIMEZONE ?? "Asia/Kolkata",
    data_consent_version: process.env.DEBUG_CONSENT_VERSION ?? "astro-v1",
    display_name: process.env.DEBUG_DISPLAY_NAME ?? "Jyotishko Roy",
  };
}

async function main() {
  const input = parseSanitizedBirthData();
  const normalized = normalizeBirthInput(input);
  const output = await calculateMasterAstroOutput({
    input,
    normalized,
    settings: DEFAULT_SETTINGS,
    runtime: {
      user_id: "sanitized-user",
      profile_id: "sanitized-profile",
      current_utc: new Date().toISOString(),
      production: false,
    },
  });

  const chartJson = buildProfileChartJsonFromMasterOutput({
    output,
    userId: "sanitized-user",
    profileId: "sanitized-profile",
    calculationId: "sanitized-calculation",
    chartVersionId: "sanitized-chart-version",
    chartVersion: 1,
    inputHash: "sanitized-input-hash",
    settingsHash: "sanitized-settings-hash",
    settingsForHash: DEFAULT_SETTINGS,
    normalized: {
      birth_date_iso: normalized.birth_date_iso,
      birth_time_iso: normalized.birth_time_iso,
      birth_time_known: normalized.birth_time_known,
      birth_time_precision: normalized.birth_time_precision,
      timezone: normalized.timezone,
      timezone_status: normalized.timezone_status,
      latitude_full: normalized.latitude_full,
      longitude_full: normalized.longitude_full,
      latitude_rounded: normalized.latitude_rounded,
      longitude_rounded: normalized.longitude_rounded,
    },
    engineVersion: "sanitized-engine",
    ephemerisVersion: "sanitized-ephemeris",
    schemaVersion: "sanitized-schema",
  });

  const chartContext = buildAstroChartContext({
    profileId: "sanitized-profile",
    chartVersionId: "sanitized-chart-version",
    chartJson,
  });

  const ascendantPaths = collectPaths(chartJson);
  const lagnaSign = chartContext.ready ? chartContext.publicFacts.lagnaSign ?? null : null;
  const settings = {
    zodiac_type: DEFAULT_SETTINGS.zodiac_type,
    ayanamsa: DEFAULT_SETTINGS.ayanamsa,
    house_system: DEFAULT_SETTINGS.house_system,
  };

  console.log(JSON.stringify({
    normalized_birth_date: normalized.birth_date_iso,
    normalized_birth_time: normalized.birth_time_iso,
    timezone: normalized.timezone,
    latitude_rounded: normalized.latitude_rounded,
    longitude_rounded: normalized.longitude_rounded,
    settings,
    calculated_lagna: output.calculation_status === "calculated" ? (output as Record<string, unknown>).prediction_ready_context && typeof (output as Record<string, unknown>).prediction_ready_context === "object"
      ? ((output as Record<string, unknown>).prediction_ready_context as Record<string, unknown>).core_natal_summary && typeof ((output as Record<string, unknown>).prediction_ready_context as Record<string, unknown>).core_natal_summary === "object"
        ? (((output as Record<string, unknown>).prediction_ready_context as Record<string, unknown>).core_natal_summary as Record<string, unknown>).ascendant && typeof (((output as Record<string, unknown>).prediction_ready_context as Record<string, unknown>).core_natal_summary as Record<string, unknown>).ascendant === "object"
          ? ((((output as Record<string, unknown>).prediction_ready_context as Record<string, unknown>).core_natal_summary as Record<string, unknown>).ascendant as Record<string, unknown>).sign ?? null
          : null
        : null
      : null : null,
    chart_json_ascendant_paths: ascendantPaths,
    chart_context_lagna: lagnaSign,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exitCode = 1;
});
