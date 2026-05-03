/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { createClient } from "@/lib/supabase/server"
import { getSafeRelativeRedirect } from "@/lib/security/safe-redirect"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const safeNext = getSafeRelativeRedirect(requestUrl.searchParams.get("next"), "/astro")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin))
    }

    const signInUrl = new URL("/sign-in", requestUrl.origin)
    signInUrl.searchParams.set("next", safeNext)
    signInUrl.searchParams.set("error", "auth_callback_failed")
    return NextResponse.redirect(signInUrl)
  }

  const signInUrl = new URL("/sign-in", requestUrl.origin)
  signInUrl.searchParams.set("next", safeNext)
  signInUrl.searchParams.set("error", "missing_code")
  return NextResponse.redirect(signInUrl)
}
