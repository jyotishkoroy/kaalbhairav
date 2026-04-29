/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { Metadata } from "next";

import { AstroV2ChatClient } from "@/components/astro/AstroV2ChatClient";
import { createClient } from "@/lib/supabase/server";
import { isAstroReadingV2UiEnabled } from "@/lib/astro/reading/ui-feature-flags";

export const metadata: Metadata = {
  title: "Astro Reading V2 Preview | TarayAI",
  description:
    "A safe preview page for TarayAI Astro Reading V2 tools behind feature flags.",
};

export default async function AstroV2Page() {
  const uiEnabled = isAstroReadingV2UiEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileId: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    profileId = profile?.id;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">
            TarayAI
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Astro Reading V2 Preview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
            This page is a feature-flagged preview surface for Reading V2 tools.
            It does not enable the server-side Reading V2 runtime by itself.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-medium">Current status</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-white/50">UI flag</dt>
              <dd className="mt-1 font-medium">
                NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=
                {uiEnabled ? "true" : "false"}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-white/50">Server V2 runtime</dt>
              <dd className="mt-1 font-medium">
                Controlled separately by ASTRO_READING_V2_ENABLED
              </dd>
            </div>
          </dl>

          {!uiEnabled ? (
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              Reading V2 UI is currently disabled. This is expected in the safe
              default production state. Enable
              NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=true only in a controlled
              preview or rollout environment.
            </div>
          ) : null}
        </section>

        <AstroV2ChatClient profileId={profileId} />

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-medium">Safe rollout rules</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/70">
            <li>Stable production path remains default.</li>
            <li>Server-side V2 requires ASTRO_READING_V2_ENABLED=true.</li>
            <li>UI visibility requires NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=true.</li>
            <li>Voice controls require NEXT_PUBLIC_ASTRO_VOICE_ENABLED=true.</li>
            <li>This page does not call paid AI, local AI, or external services.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
