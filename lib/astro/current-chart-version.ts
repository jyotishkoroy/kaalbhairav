/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type CurrentChartLoadMode = "strict_user_runtime" | "diagnostic_repair";

export interface LoadCurrentAstroChartOptions {
  mode?: CurrentChartLoadMode;
}

export async function loadCurrentAstroChartForUser(input: {
  service: ServiceClient;
  userId: string;
  options?: LoadCurrentAstroChartOptions;
}): Promise<
  | { ok: true; profile: Record<string, unknown>; chartVersion: Record<string, unknown>; predictionSummary?: unknown }
  | { ok: false; status: number; error: string; message: string; fallbackUsed?: boolean }
> {
  const { service, userId, options } = input;
  const mode = options?.mode ?? "strict_user_runtime";

  // 1. Load active birth profile
  const { data: activeProfile, error: profileError } = await service
    .from("birth_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !activeProfile) {
    return { ok: false, status: 404, error: "setup_required", message: "Please complete birth profile setup first." };
  }

  const profile = activeProfile as Record<string, unknown>;

  // strict_user_runtime: require explicit current_chart_version_id pointer — no fallbacks.
  if (mode === "strict_user_runtime") {
    if (!profile.current_chart_version_id) {
      return {
        ok: false,
        status: 404,
        error: "chart_not_ready",
        message: "aadesh: Your birth chart has not been calculated yet or needs to be recalculated. Please update your birth details to generate your chart.",
        code: "current_chart_pointer_missing",
      } as never;
    }

    const { data: chartRow } = await service
      .from("chart_json_versions")
      .select("id, profile_id, user_id, chart_json, chart_version, created_at, is_current, status, input_hash")
      .eq("id", profile.current_chart_version_id as string)
      .eq("user_id", userId)
      .eq("profile_id", profile.id as string)
      .eq("status", "completed")
      .eq("is_current", true)
      .maybeSingle();

    if (!chartRow) {
      return {
        ok: false,
        status: 404,
        error: "chart_not_ready",
        message: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering.",
        code: "current_chart_pointer_invalid",
      } as never;
    }

    const chartVersion = chartRow as Record<string, unknown>;
    const predictionSummary = await loadPredictionSummary(service, profile.id as string, chartVersion.id as string);
    return { ok: true, profile, chartVersion, predictionSummary };
  }

  // diagnostic_repair mode: allows progressive fallbacks for repair scripts/admin tools.
  // This path MUST NOT be used by any user-facing API route.
  let chartVersion: Record<string, unknown> | null = null;
  let fallbackUsed = false;

  if (profile.current_chart_version_id) {
    const { data } = await service
      .from("chart_json_versions")
      .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
      .eq("id", profile.current_chart_version_id as string)
      .maybeSingle();
    if (data) chartVersion = data as Record<string, unknown>;
  }

  if (!chartVersion) {
    fallbackUsed = true;
    try {
      const { data } = await service
        .from("chart_json_versions")
        .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
        .eq("profile_id", profile.id as string)
        .eq("is_current", true)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) chartVersion = data as Record<string, unknown>;
    } catch {
      // Column may not exist yet, continue
    }
  }

  if (!chartVersion) {
    try {
      const { data } = await service
        .from("chart_json_versions")
        .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
        .eq("profile_id", profile.id as string)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) chartVersion = data as Record<string, unknown>;
    } catch {
      // Column may not exist yet, continue
    }
  }

  if (!chartVersion) {
    const { data } = await service
      .from("chart_json_versions")
      .select("id, profile_id, chart_json, chart_version, created_at")
      .eq("profile_id", profile.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) chartVersion = data as Record<string, unknown>;
  }

  if (!chartVersion) {
    return {
      ok: false,
      status: 404,
      error: "chart_not_ready",
      message: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering.",
    };
  }

  const predictionSummary = await loadPredictionSummary(service, profile.id as string, chartVersion.id as string);
  return { ok: true, profile, chartVersion, predictionSummary, fallbackUsed } as never;
}

async function loadPredictionSummary(service: ServiceClient, profileId: string, chartVersionId: string): Promise<unknown> {
  try {
    const { data: summary } = await service
      .from("prediction_ready_summaries")
      .select("id, chart_version_id, prediction_context, topic, created_at")
      .eq("profile_id", profileId)
      .eq("chart_version_id", chartVersionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return summary ?? undefined;
  } catch {
    return undefined;
  }
}
