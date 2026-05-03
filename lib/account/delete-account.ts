/*
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

type ServiceClient = SupabaseClient

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

type DeleteAccountParams = {
  userId: string
  displayNameFallback?: string
  service: ServiceClient
  authUser?: AuthUser | null
}

type TableQuery = {
  select: (...args: unknown[]) => TableQuery
  insert: (payload: Record<string, unknown>) => PromiseLike<{ error: unknown }>
  delete: () => TableDeleteQuery
  eq: (...args: unknown[]) => TableQuery
  in: (...args: unknown[]) => PromiseLike<{ error: unknown }>
}

type TableDeleteQuery = {
  eq: (...args: unknown[]) => PromiseLike<{ error: unknown }>
  in: (...args: unknown[]) => PromiseLike<{ error: unknown }>
}

function isMissingTableError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '42P01',
  )
}

function resolveDisplayName(params: DeleteAccountParams) {
  const fromMetadata =
    params.authUser?.user_metadata?.full_name ??
    params.authUser?.user_metadata?.name ??
    params.authUser?.user_metadata?.display_name
  const name = typeof fromMetadata === 'string' && fromMetadata.trim()
    ? fromMetadata.trim()
    : params.displayNameFallback?.trim()
  return name && name.length > 0 ? name : 'Deleted user'
}

async function runOptionalQuery(tableQuery: PromiseLike<{ error: unknown }>) {
  const { error } = await tableQuery
  if (error && !isMissingTableError(error)) throw error
}

async function deleteOptionalTableRows(
  service: ServiceClient,
  table: string,
  builder: (query: TableQuery) => PromiseLike<{ error: unknown }>,
) {
  try {
    await runOptionalQuery(builder(service.from(table) as unknown as TableQuery))
  } catch (error) {
    if (!isMissingTableError(error)) throw error
  }
}

async function insertDeletedUserRecord(service: ServiceClient, displayName: string) {
  const { error } = await service.from('deleted_users').insert({
    name: displayName,
    deletion_source: 'account_settings',
  })
  if (error) throw error
}

export async function deleteAccountAndUserData(params: DeleteAccountParams) {
  const displayName = resolveDisplayName(params)

  await insertDeletedUserRecord(params.service, displayName)

  const profileIds: string[] = []
  const calculationIds: string[] = []
  const chartVersionIds: string[] = []
  const sessionIds: string[] = []

  const { data: profiles, error: profileError } = await params.service
    .from('birth_profiles')
    .select('id')
    .eq('user_id', params.userId)

  if (profileError && !isMissingTableError(profileError)) throw profileError
  for (const row of profiles ?? []) {
    const id = (row as { id?: string }).id
    if (id) profileIds.push(id)
  }

  const { data: calculations, error: calculationError } = await params.service
    .from('chart_calculations')
    .select('id')
    .eq('user_id', params.userId)

  if (calculationError && !isMissingTableError(calculationError)) throw calculationError
  for (const row of calculations ?? []) {
    const id = (row as { id?: string }).id
    if (id) calculationIds.push(id)
  }

  const { data: chartVersions, error: chartVersionError } = await params.service
    .from('chart_json_versions')
    .select('id')
    .eq('user_id', params.userId)

  if (chartVersionError && !isMissingTableError(chartVersionError)) throw chartVersionError
  for (const row of chartVersions ?? []) {
    const id = (row as { id?: string }).id
    if (id) chartVersionIds.push(id)
  }

  const { data: sessions, error: sessionError } = await params.service
    .from('astro_chat_sessions')
    .select('id')
    .eq('user_id', params.userId)

  if (sessionError && !isMissingTableError(sessionError)) throw sessionError
  for (const row of sessions ?? []) {
    const id = (row as { id?: string }).id
    if (id) sessionIds.push(id)
  }

  await deleteOptionalTableRows(params.service, 'astro_chat_messages', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'astro_reading_feedback', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'astro_companion_memory', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'user_terms_acceptances', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'prediction_ready_summaries', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'calculation_audit_logs', (query) =>
    query.delete().eq('user_id', params.userId),
  )
  await deleteOptionalTableRows(params.service, 'astrology_settings', (query) =>
    query.delete().eq('user_id', params.userId),
  )

  if (sessionIds.length > 0) {
    await deleteOptionalTableRows(params.service, 'astro_chat_messages', (query) =>
      query.delete().in('session_id', sessionIds),
    )
    await deleteOptionalTableRows(params.service, 'astro_chat_sessions', (query) =>
      query.delete().in('id', sessionIds),
    )
  }

  if (chartVersionIds.length > 0) {
    await deleteOptionalTableRows(params.service, 'astro_chat_messages', (query) =>
      query.delete().in('chart_version_id', chartVersionIds),
    )
    await deleteOptionalTableRows(params.service, 'prediction_ready_summaries', (query) =>
      query.delete().in('chart_version_id', chartVersionIds),
    )
    await deleteOptionalTableRows(params.service, 'calculation_audit_logs', (query) =>
      query.delete().in('chart_version_id', chartVersionIds),
    )
    await deleteOptionalTableRows(params.service, 'chart_json_versions', (query) =>
      query.delete().in('id', chartVersionIds),
    )
  }

  if (calculationIds.length > 0) {
    await deleteOptionalTableRows(params.service, 'calculation_audit_logs', (query) =>
      query.delete().in('calculation_id', calculationIds),
    )
    await deleteOptionalTableRows(params.service, 'chart_json_versions', (query) =>
      query.delete().in('calculation_id', calculationIds),
    )
    await deleteOptionalTableRows(params.service, 'chart_calculations', (query) =>
      query.delete().in('id', calculationIds),
    )
  }

  if (profileIds.length > 0) {
    await deleteOptionalTableRows(params.service, 'astro_chat_messages', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'prediction_ready_summaries', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'calculation_audit_logs', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'astro_chat_sessions', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'astrology_settings', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'chart_json_versions', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'chart_calculations', (query) =>
      query.delete().in('profile_id', profileIds),
    )
    await deleteOptionalTableRows(params.service, 'birth_profiles', (query) =>
      query.delete().in('id', profileIds),
    )
  }

  await deleteOptionalTableRows(params.service, 'birth_profiles', (query) =>
    query.delete().eq('user_id', params.userId),
  )

  const { error: authDeleteError } = await params.service.auth.admin.deleteUser(params.userId)
  if (authDeleteError) throw authDeleteError

  return { ok: true, name: displayName }
}
