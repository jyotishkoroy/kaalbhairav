'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

type DraftWithSource = {
  id: string
  source_id: string | null
  source_url: string
  original_title: string | null
  llm_summary: string | null
  llm_category: string | null
  llm_tags: string[] | null
  cover_image_url: string | null
  news_sources: { name: string } | { name: string }[] | null
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function sourceName(draft: DraftWithSource) {
  if (Array.isArray(draft.news_sources)) {
    return draft.news_sources[0]?.name ?? 'Unknown'
  }

  return draft.news_sources?.name ?? 'Unknown'
}

export async function approveDraft(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const id = String(formData.get('id') || '').trim()

  if (!id) {
    throw new Error('Missing draft id')
  }

  const { data: draft, error: draftError } = await supabase
    .from('news_drafts')
    .select('id, source_id, source_url, original_title, llm_summary, llm_category, llm_tags, cover_image_url, news_sources(name)')
    .eq('id', id)
    .single()
    .returns<DraftWithSource>()

  if (draftError) {
    throw new Error(draftError.message)
  }

  if (!draft) {
    throw new Error('Draft not found')
  }

  const title = draft.original_title || 'Untitled draft'
  const slug = `${cleanSlug(title) || 'news'}-${id.slice(0, 8)}`
  const summary = draft.llm_summary || 'Curated story from a trusted source.'
  const category = draft.llm_category || 'general'

  const { error: postError } = await supabase.from('news_posts').insert({
    slug,
    title,
    summary,
    category,
    cover_image_url: draft.cover_image_url,
    source_id: draft.source_id,
    source_name: sourceName(draft),
    source_url: draft.source_url,
    tags: draft.llm_tags || [],
    status: 'published',
    published_at: new Date().toISOString(),
    created_by: user.id,
    approved_by: user.id,
  })

  if (postError) {
    throw new Error(postError.message)
  }

  const { error: updateError } = await supabase
    .from('news_drafts')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/drafts')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
}

export async function rejectDraft(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const id = String(formData.get('id') || '').trim()

  if (!id) {
    throw new Error('Missing draft id')
  }

  const { error } = await supabase
    .from('news_drafts')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/drafts')
}
