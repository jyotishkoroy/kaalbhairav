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

export async function publishPost(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { error } = await supabase
    .from('news_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
}

export async function unpublishPost(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { error } = await supabase
    .from('news_posts')
    .update({
      status: 'draft',
      published_at: null,
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
}

export async function deletePost(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { error } = await supabase
    .from('news_posts')
    .delete()
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
}