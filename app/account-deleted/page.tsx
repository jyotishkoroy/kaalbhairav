/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { AccountDeletedFeedbackForm } from './AccountDeletedFeedbackForm'

export default async function AccountDeletedPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const resolved = await props.searchParams
  const tokenValue = resolved?.token
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-serif">We’re sorry to see you go</h1>
        <p className="mt-4 text-white/70">Your account deletion request has completed.</p>
        <p className="mt-3 text-sm text-white/50">
          Your account and app data were deleted. If you would like to share feedback, you can do so below.
        </p>
        <AccountDeletedFeedbackForm token={typeof token === 'string' ? token : null} />
      </div>
    </main>
  )
}
