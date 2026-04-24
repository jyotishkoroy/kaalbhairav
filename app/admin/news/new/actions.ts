'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return supabase
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createPost(formData: FormData) {
  const supabase = await requireAdmin()

  const title = String(formData.get('title') || '').trim()
  const rawSlug = String(formData.get('slug') || '').trim()
  const slug = cleanSlug(rawSlug)
  const summary = String(formData.get('summary') || '').trim()
  const body = String(formData.get('body') || '').trim()
  const category = String(formData.get('category') || 'general').trim()
  const sourceName = String(formData.get('source_name') || 'Manual Admin Post').trim()
  const sourceUrl = String(formData.get('source_url') || 'https://tarayai.com').trim()

  if (!title || !slug || !summary) {
    throw new Error('Title, slug, and summary are required.')
  }

  const { error } = await supabase
    .from('news_posts')
    .insert({
      title,
      slug,
      summary,
      body: body || null,
      category,
      source_name: sourceName,
      source_url: sourceUrl || 'https://tarayai.com',
      status: 'draft',
      published_at: null,
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  redirect('/admin/news')
}