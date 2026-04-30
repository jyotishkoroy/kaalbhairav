/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedbackBody = {
  sessionId?: unknown;
  messageId?: unknown;
  rating?: unknown;
  feltHeard?: unknown;
  tooGeneric?: unknown;
  tooFearful?: unknown;
  inaccurate?: unknown;
  comment?: unknown;
};

function isBool(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRating(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  return [1, 2, 3, 4, 5].includes(value as never) ? (value as 1 | 2 | 3 | 4 | 5) : undefined;
}

export async function POST(request: Request) {
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ ok: false, stored: false, reason: "invalid_json" }, { status: 400 });
  }

  const comment = readString(body.comment);
  const trimmedComment = comment ? comment.slice(0, 1000) : undefined;
  const payload = {
    sessionId: readString(body.sessionId),
    messageId: readString(body.messageId),
    rating: readRating(body.rating),
    feltHeard: isBool(body.feltHeard) ? body.feltHeard : undefined,
    tooGeneric: isBool(body.tooGeneric) ? body.tooGeneric : undefined,
    tooFearful: isBool(body.tooFearful) ? body.tooFearful : undefined,
    inaccurate: isBool(body.inaccurate) ? body.inaccurate : undefined,
    comment: trimmedComment,
  };

  if (!payload.rating && !payload.feltHeard && !payload.tooGeneric && !payload.tooFearful && !payload.inaccurate && !payload.comment) {
    return NextResponse.json({ ok: false, stored: false, reason: "empty_feedback" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, stored: false, reason: "feedback_unavailable" }, { status: 202 });
    }
    const { error } = await supabase.from("astro_reading_feedback").insert({
      user_id: user.id,
      session_id: payload.sessionId ?? null,
      message_id: payload.messageId ?? null,
      rating: payload.rating ?? null,
      felt_heard: payload.feltHeard ?? null,
      too_generic: payload.tooGeneric ?? null,
      too_fearful: payload.tooFearful ?? null,
      inaccurate: payload.inaccurate ?? null,
      comment: payload.comment ?? null,
    });
    if (error) {
      return NextResponse.json({ ok: false, stored: false, reason: "feedback_unavailable" }, { status: 202 });
    }
    return NextResponse.json({ ok: true, stored: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, stored: false, reason: "feedback_unavailable" }, { status: 202 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, reason: "method_not_allowed" }, { status: 405 });
}
