'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleConfig(formData: FormData) {
  const key = formData.get('key') as string
  const value = formData.get('value') === 'true'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('site_config').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  })

  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'toggle_config',
    target_table: 'site_config',
    target_id: key,
    payload: { key, new_value: value },
  })

  revalidatePath('/admin/controls')
}