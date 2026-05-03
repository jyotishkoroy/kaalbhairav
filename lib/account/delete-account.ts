/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
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

type DbError = { code?: string; message?: string }

type MaybeMutationResult = PromiseLike<{ error: unknown }>

type OwnedIds = {
  profileIds: string[]
  calculationIds: string[]
  chartVersionIds: string[]
  sessionIds: string[]
}

const OPTIONAL_MISSING_ERROR_CODES = new Set(['42P01', '42703'])

function isDbError(error: unknown): error is DbError {
  return Boolean(error && typeof error === 'object')
}

function getErrorCode(error: unknown) {
  return isDbError(error) ? error.code : undefined
}

function isMissingTableOrColumnError(error: unknown) {
  const code = getErrorCode(error)
  return Boolean(code && OPTIONAL_MISSING_ERROR_CODES.has(code))
}

function logSafeStage(stage: string, error: unknown, table?: string) {
  const payload: Record<string, unknown> = {
    stage,
    code: getErrorCode(error),
  }
  if (table) payload.table = table
  if (isDbError(error) && typeof error.message === 'string') {
    payload.message = error.message
  }
  console.error('[account-delete]', payload)
}

function assertServiceRoleAvailable() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('service role key missing')
    logSafeStage('require_service_role_env', error)
    throw error
  }
}

function resolveAuthenticatedUser(params: DeleteAccountParams) {
  if (!params.authUser?.id || params.authUser.id !== params.userId) {
    const error = new Error('authenticated user mismatch')
    logSafeStage('resolve_authenticated_user', error)
    throw error
  }
  return params.authUser
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

async function runQuery<T>(query: PromiseLike<{ data: T | null; error: unknown }>) {
  return await query
}

async function insertDeletedUserRecord(service: ServiceClient, displayName: string) {
  const { error } = await service.from('deleted_users').insert({
    name: displayName,
    deletion_source: 'account_settings',
  })
  if (error) {
    logSafeStage('insert_deleted_users', error, 'deleted_users')
    throw error
  }
}

async function collectOwnedIds(service: ServiceClient, userId: string): Promise<OwnedIds> {
  const profileIds: string[] = []
  const calculationIds: string[] = []
  const chartVersionIds: string[] = []
  const sessionIds: string[] = []

  const readIds = async (table: string, selectColumns: string, target: string[]) => {
    const { data, error } = await runQuery<{ id?: string }[]>(
      service.from(table).select(selectColumns).eq('user_id', userId) as unknown as PromiseLike<{ data: { id?: string }[] | null; error: unknown }>,
    )
    if (error) {
      if (isMissingTableOrColumnError(error)) return
      logSafeStage(`collect_ids:${table}`, error, table)
      throw error
    }
    for (const row of data ?? []) {
      if (row?.id) target.push(row.id)
    }
  }

  await readIds('birth_profiles', 'id', profileIds)
  await readIds('chart_calculations', 'id', calculationIds)
  await readIds('chart_json_versions', 'id', chartVersionIds)
  await readIds('astro_chat_sessions', 'id', sessionIds)

  return { profileIds, calculationIds, chartVersionIds, sessionIds }
}

async function deleteRowsByUserColumn(service: ServiceClient, table: string, column: string, userId: string) {
  const { error } = await service.from(table).delete().eq(column, userId)
  if (error && !isMissingTableOrColumnError(error)) {
    logSafeStage(`delete:${table}.${column}`, error, table)
    throw error
  }
}

async function nullColumnIfNullableOrDelete(
  service: ServiceClient,
  table: string,
  column: string,
  userId: string,
) {
  const { error: updateError } = await service.from(table).update({ [column]: null }).eq(column, userId)
  if (!updateError) return
  if (isMissingTableOrColumnError(updateError)) return
  logSafeStage(`null:${table}.${column}`, updateError, table)
  throw updateError
}

async function deleteRowsByUserColumns(
  service: ServiceClient,
  table: string,
  columns: string[],
  userId: string,
) {
  for (const column of columns) {
    await deleteRowsByUserColumn(service, table, column, userId)
  }
}

async function deleteRowsByIds(service: ServiceClient, table: string, column: string, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await service.from(table).delete().in(column, ids)
  if (error && !isMissingTableOrColumnError(error)) {
    logSafeStage(`delete:${table}.${column}`, error, table)
    throw error
  }
}

async function clearBirthProfileCurrentChartPointers(service: ServiceClient, userId: string, profileIds: string[], chartVersionIds: string[]) {
  const { error } = await service
    .from('birth_profiles')
    .update({ current_chart_version_id: null })
    .eq('user_id', userId)

  if (error) {
    if (isMissingTableOrColumnError(error)) return
    logSafeStage('clear_birth_profile_current_chart_pointer', error, 'birth_profiles')
    throw error
  }

  if (profileIds.length > 0) {
    const { error: byProfileError } = await service
      .from('birth_profiles')
      .update({ current_chart_version_id: null })
      .in('id', profileIds)
    if (byProfileError && !isMissingTableOrColumnError(byProfileError)) {
      logSafeStage('clear_birth_profile_current_chart_pointer_by_profile', byProfileError, 'birth_profiles')
      throw byProfileError
    }
  }

  if (chartVersionIds.length > 0) {
    const { error: byVersionError } = await service
      .from('birth_profiles')
      .update({ current_chart_version_id: null })
      .in('current_chart_version_id', chartVersionIds)
    if (byVersionError && !isMissingTableOrColumnError(byVersionError)) {
      logSafeStage('clear_birth_profile_current_chart_pointer_by_version', byVersionError, 'birth_profiles')
      throw byVersionError
    }
  }
}

async function deleteProfileReferenceTables(service: ServiceClient, userId: string) {
  await deleteRowsByUserColumns(service, 'admin_audit_log', ['admin_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_conversations', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_messages', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'birth_charts', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'llm_usage_daily', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'news_bookmarks', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'news_comments', ['user_id'], userId)
  await nullColumnIfNullableOrDelete(service, 'news_drafts', 'reviewed_by', userId)
  await deleteRowsByUserColumns(service, 'news_likes', ['user_id'], userId)
  await nullColumnIfNullableOrDelete(service, 'news_posts', 'approved_by', userId)
  await deleteRowsByUserColumns(service, 'news_posts', ['created_by'], userId)
  await nullColumnIfNullableOrDelete(service, 'profiles', 'referred_by', userId)
  await deleteRowsByUserColumns(service, 'referrals', ['referred_id', 'referrer_id'], userId)
  await nullColumnIfNullableOrDelete(service, 'site_config', 'updated_by', userId)
  await deleteRowsByUserColumns(service, 'still_progress', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'still_sessions', ['user_id'], userId)
}

async function deleteAstroChildRows(service: ServiceClient, userId: string, ownedIds: OwnedIds) {
  await deleteRowsByUserColumns(service, 'astro_chat_messages', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_chat_sessions', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_reading_feedback', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_companion_memory', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'user_terms_acceptances', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'prediction_ready_summaries', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'calculation_audit_logs', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astrology_settings', ['user_id'], userId)
  await deleteRowsByIds(service, 'astro_chat_messages', 'session_id', ownedIds.sessionIds)
  await deleteRowsByIds(service, 'astro_chat_messages', 'chart_version_id', ownedIds.chartVersionIds)
  await deleteRowsByIds(service, 'prediction_ready_summaries', 'chart_version_id', ownedIds.chartVersionIds)
  await deleteRowsByIds(service, 'calculation_audit_logs', 'chart_version_id', ownedIds.chartVersionIds)
  await deleteRowsByIds(service, 'calculation_audit_logs', 'calculation_id', ownedIds.calculationIds)
  await deleteRowsByIds(service, 'astro_chat_sessions', 'profile_id', ownedIds.profileIds)
  await deleteRowsByIds(service, 'astro_chat_messages', 'profile_id', ownedIds.profileIds)
  await deleteRowsByIds(service, 'prediction_ready_summaries', 'profile_id', ownedIds.profileIds)
  await deleteRowsByIds(service, 'calculation_audit_logs', 'profile_id', ownedIds.profileIds)
  await deleteRowsByIds(service, 'astrology_settings', 'profile_id', ownedIds.profileIds)
}

async function deleteJournalAndReportRows(service: ServiceClient, userId: string) {
  await deleteRowsByUserColumns(service, 'journal_entries', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'astro_journal_entries', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'saved_reports', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'report_exports', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'chat_sessions', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'chat_messages', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'conversations', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'messages', ['user_id'], userId)
  await deleteRowsByUserColumns(service, 'reading_sessions', ['user_id'], userId)
}

async function deleteBirthProfilesAndCharts(service: ServiceClient, userId: string, ownedIds: OwnedIds) {
  await clearBirthProfileCurrentChartPointers(service, userId, ownedIds.profileIds, ownedIds.chartVersionIds)
  await deleteRowsByIds(service, 'chart_json_versions', 'id', ownedIds.chartVersionIds)
  await deleteRowsByIds(service, 'chart_calculations', 'id', ownedIds.calculationIds)
  await deleteRowsByIds(service, 'birth_profiles', 'id', ownedIds.profileIds)
  await deleteRowsByUserColumn(service, 'birth_profiles', 'user_id', userId)
}

async function deletePublicProfile(service: ServiceClient, userId: string) {
  const { error } = await service.from('profiles').delete().eq('id', userId)
  if (error && !isMissingTableOrColumnError(error)) {
    logSafeStage('delete_public_profile', error, 'profiles')
    throw error
  }
}

export async function deleteAccountAndUserData(params: DeleteAccountParams) {
  assertServiceRoleAvailable()
  resolveAuthenticatedUser(params)
  const displayName = resolveDisplayName(params)

  await insertDeletedUserRecord(params.service, displayName)

  const ownedIds = await collectOwnedIds(params.service, params.userId)

  await deleteProfileReferenceTables(params.service, params.userId)
  await deleteAstroChildRows(params.service, params.userId, ownedIds)
  await deleteJournalAndReportRows(params.service, params.userId)
  await deleteBirthProfilesAndCharts(params.service, params.userId, ownedIds)
  await deletePublicProfile(params.service, params.userId)

  const { error: authDeleteError } = await params.service.auth.admin.deleteUser(params.userId)
  if (authDeleteError) {
    logSafeStage('delete_auth_user', authDeleteError, 'auth.users')
    throw authDeleteError
  }

  return { ok: true, name: displayName }
}
