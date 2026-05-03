/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function loadCurrentAstroChartForUser(input: {
  service: ServiceClient;
  userId: string;
}): Promise<
  | { ok: true; profile: Record<string, unknown>; chartVersion: Record<string, unknown>; predictionSummary?: unknown }
  | { ok: false; status: number; error: string; message: string }
> {
  const { service, userId } = input;

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
  let chartVersion: Record<string, unknown> | null = null;

  // 2. Try current_chart_version_id (explicit pointer)
  if (profile.current_chart_version_id) {
    const { data } = await service
      .from("chart_json_versions")
      .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
      .eq("id", profile.current_chart_version_id)
      .maybeSingle();
    if (data) chartVersion = data as Record<string, unknown>;
  }

  // 3. Try is_current = true and status = completed
  if (!chartVersion) {
    try {
      const { data } = await service
        .from("chart_json_versions")
        .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
        .eq("profile_id", profile.id)
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

  // 4. Try status = completed (fallback without is_current)
  if (!chartVersion) {
    try {
      const { data } = await service
        .from("chart_json_versions")
        .select("id, profile_id, chart_json, chart_version, created_at, is_current, status, input_hash")
        .eq("profile_id", profile.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) chartVersion = data as Record<string, unknown>;
    } catch {
      // Column may not exist yet, continue
    }
  }

  // 5. Last resort: latest by created_at (old behaviour preserved as final fallback)
  if (!chartVersion) {
    const { data } = await service
      .from("chart_json_versions")
      .select("id, profile_id, chart_json, chart_version, created_at")
      .eq("profile_id", profile.id)
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

  // 6. Load prediction summary for this chart version
  let predictionSummary: unknown = undefined;
  try {
    const { data: summary } = await service
      .from("prediction_ready_summaries")
      .select("id, chart_version_id, prediction_context, topic, created_at")
      .eq("profile_id", profile.id)
      .eq("chart_version_id", chartVersion.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (summary) predictionSummary = summary;
  } catch {
    // Table may not exist, continue without it
  }

  return { ok: true, profile, chartVersion, predictionSummary };
}
