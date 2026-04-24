'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

export async function approvePost(formData: FormData) {
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
  revalidatePath('/news')
}

export async function rejectPost(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { error } = await supabase
    .from('news_posts')
    .update({
      status: 'rejected',
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
}