/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

type JsonRecord = Record<string, unknown>;

export type CalculationSettingsMetadata = {
  zodiac?: string;
  ayanamsa?: string;
  houseSystem?: string;
  nodeType?: string;
  dashaYearBasis?: string;
  panchangConvention?: string;
  engine?: string;
  engineVersion?: string;
  schemaVersion?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function atPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function normalizeSettingValue(value?: string): string | undefined {
  return value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function mergeCandidateSettings(chartJson: unknown): CalculationSettingsMetadata {
  const metadata = atPath(chartJson, ["metadata"]);
  const settings = atPath(chartJson, ["calculation_settings"]);
  const settingsSnapshot = atPath(chartJson, ["settings_snapshot"]);
  const metadataSettings = atPath(metadata, ["calculation_settings"]);
  const metadataSettingsSnapshot = atPath(metadata, ["settings_snapshot"]);
  const metadataSettingsAlt = atPath(metadata, ["settings"]);

  const houseSystem = readString(
    atPath(metadataSettings, ["house_system"]),
    atPath(metadataSettingsAlt, ["house_system"]),
    atPath(metadataSettingsSnapshot, ["house_system"]),
    atPath(settingsSnapshot, ["house_system"]),
    atPath(settings, ["house_system"]),
    atPath(metadata, ["house_system"]),
  );
  const zodiac = readString(
    atPath(metadataSettings, ["zodiac_type"]),
    atPath(metadataSettingsAlt, ["zodiac_type"]),
    atPath(metadataSettingsSnapshot, ["zodiac_type"]),
    atPath(settingsSnapshot, ["zodiac_type"]),
    atPath(settings, ["zodiac_type"]),
    atPath(metadata, ["zodiac_type"]),
  );
  const ayanamsa = readString(
    atPath(metadataSettings, ["ayanamsa"]),
    atPath(metadataSettingsAlt, ["ayanamsa"]),
    atPath(metadataSettingsSnapshot, ["ayanamsa"]),
    atPath(settingsSnapshot, ["ayanamsa"]),
    atPath(settings, ["ayanamsa"]),
    atPath(metadata, ["ayanamsa"]),
  );
  const nodeType = readString(
    atPath(metadataSettings, ["node_type"]),
    atPath(metadataSettingsAlt, ["node_type"]),
    atPath(metadataSettingsSnapshot, ["node_type"]),
    atPath(settingsSnapshot, ["node_type"]),
    atPath(settings, ["node_type"]),
    atPath(metadata, ["node_type"]),
  );
  const dashaYearBasis = readString(
    atPath(metadataSettings, ["dasha_year_basis"]),
    atPath(metadataSettingsAlt, ["dasha_year_basis"]),
    atPath(metadataSettingsSnapshot, ["dasha_year_basis"]),
    atPath(settingsSnapshot, ["dasha_year_basis"]),
    atPath(settings, ["dasha_year_basis"]),
    atPath(metadata, ["dasha_year_basis"]),
  );
  const engineVersion = readString(
    atPath(metadataSettings, ["engine_version"]),
    atPath(metadataSettingsAlt, ["engine_version"]),
    atPath(metadataSettingsSnapshot, ["engine_version"]),
    atPath(settingsSnapshot, ["engine_version"]),
    atPath(settings, ["engine_version"]),
    atPath(metadata, ["engine_version"]),
  );
  const schemaVersion = readString(
    atPath(metadataSettings, ["schema_version"]),
    atPath(metadataSettingsAlt, ["schema_version"]),
    atPath(metadataSettingsSnapshot, ["schema_version"]),
    atPath(settingsSnapshot, ["schema_version"]),
    atPath(settings, ["schema_version"]),
    atPath(metadata, ["schema_version"]),
  );
  const engine = readString(
    atPath(metadataSettings, ["engine"]),
    atPath(metadataSettingsAlt, ["engine"]),
    atPath(metadataSettingsSnapshot, ["engine"]),
    atPath(settingsSnapshot, ["engine"]),
    atPath(settings, ["engine"]),
    atPath(metadata, ["engine"]),
  );
  const panchangConvention = readString(
    atPath(chartJson, ["panchang", "convention"]),
    atPath(chartJson, ["expanded_sections", "panchang", "convention"]),
    atPath(chartJson, ["astronomical_data", "panchang", "convention"]),
    atPath(metadataSettings, ["panchang_convention"]),
    atPath(metadataSettingsAlt, ["panchang_convention"]),
    atPath(metadataSettingsSnapshot, ["panchang_convention"]),
    atPath(settingsSnapshot, ["panchang_convention"]),
    atPath(settings, ["panchang_convention"]),
    atPath(metadata, ["panchang_convention"]),
  );

  return {
    zodiac: normalizeSettingValue(zodiac),
    ayanamsa: normalizeSettingValue(ayanamsa),
    houseSystem: normalizeSettingValue(houseSystem),
    nodeType: normalizeSettingValue(nodeType),
    dashaYearBasis: normalizeSettingValue(dashaYearBasis),
    panchangConvention: normalizeSettingValue(panchangConvention),
    engine: normalizeSettingValue(engine),
    engineVersion: normalizeSettingValue(engineVersion),
    schemaVersion: normalizeSettingValue(schemaVersion),
  };
}

export function extractCalculationSettingsMetadata(chartJson: unknown): CalculationSettingsMetadata {
  try {
    if (!isRecord(chartJson)) return {};
    return mergeCandidateSettings(chartJson);
  } catch {
    return {};
  }
}

export function requireWholeSignHouseSystem(settings: CalculationSettingsMetadata): boolean {
  const normalized = normalizeSettingValue(settings.houseSystem);
  return normalized === "whole_sign";
}

export function requireSiderealLahiriOrSupportedAyanamsa(settings: CalculationSettingsMetadata): boolean {
  const zodiac = normalizeSettingValue(settings.zodiac);
  const ayanamsa = normalizeSettingValue(settings.ayanamsa);
  if (!zodiac || !ayanamsa) return false;
  if (zodiac !== "sidereal") return false;
  return ayanamsa === "lahiri";
}
