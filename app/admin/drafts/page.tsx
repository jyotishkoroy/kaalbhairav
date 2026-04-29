/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { approveDraft, rejectDraft } from './actions'
import { requireAdmin } from '@/lib/admin'

type NewsDraft = {
  id: string
  source_url: string
  original_title: string | null
  original_excerpt: string | null
  llm_summary: string | null
  llm_category: string | null
  cover_image_url: string | null
  created_at: string | null
  news_sources: { name: string } | { name: string }[] | null
}

function sourceName(draft: NewsDraft) {
  if (Array.isArray(draft.news_sources)) {
    return draft.news_sources[0]?.name ?? 'Unknown'
  }

  return draft.news_sources?.name ?? 'Unknown'
}

export default async function DraftsPage() {
  const { supabase } = await requireAdmin()

  const { data: drafts, error } = await supabase
    .from('news_drafts')
    .select('id, source_url, original_title, original_excerpt, llm_summary, llm_category, cover_image_url, created_at, news_sources(name)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .returns<NewsDraft[]>()

  if (error) {
    console.error(error)
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-5xl">RSS Drafts</h1>
        <p className="mt-3 text-white/60">
          Review auto-ingested stories before publishing them.
        </p>
      </div>

      {!drafts?.length && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-white/50">
          No RSS drafts pending review.
        </div>
      )}

      <div className="space-y-6">
        {drafts?.map((draft) => (
          <article
            key={draft.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="text-xs uppercase tracking-widest text-orange-400">
              {draft.llm_category || 'general'} · {sourceName(draft)}
            </div>
            <h2 className="mt-3 font-serif text-2xl">
              {draft.original_title || 'Untitled draft'}
            </h2>
            {draft.llm_summary && (
              <p className="mt-3 text-white/70">{draft.llm_summary}</p>
            )}
            {draft.original_excerpt && (
              <p className="mt-3 line-clamp-3 text-sm text-white/40">
                {draft.original_excerpt}
              </p>
            )}
            <a
              href={draft.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-orange-400 hover:text-orange-300"
            >
              View source
            </a>

            <div className="mt-5 flex flex-wrap gap-3">
              <form action={approveDraft}>
                <input type="hidden" name="id" value={draft.id} />
                <button
                  type="submit"
                  className="rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-black hover:bg-green-400"
                >
                  Approve & publish
                </button>
              </form>
              <form action={rejectDraft}>
                <input type="hidden" name="id" value={draft.id} />
                <button
                  type="submit"
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400"
                >
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
