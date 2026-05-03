/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAccountAndUserData } from '@/lib/account/delete-account'

type Call = { table: string; method: string; args?: unknown[] }

function buildService(options?: {
  missingTables?: string[]
  missingColumns?: Array<{ table: string; column: string }>
  selectRows?: Record<string, Array<{ id: string }>>
  deleteErrors?: Record<string, { code?: string; message: string }>
  updateErrors?: Record<string, { code?: string; message: string }>
  authDeleteError?: { code?: string; message: string; status?: number }
}) {
  const calls: Call[] = []
  const missingTables = new Set(options?.missingTables ?? [])
  const missingColumns = new Set((options?.missingColumns ?? []).map((item) => `${item.table}.${item.column}`))
  const selectRows = options?.selectRows ?? {}
  const deleteErrors = options?.deleteErrors ?? {}
  const updateErrors = options?.updateErrors ?? {}
  const makeSelectResult = (table: string) => {
    const result = Promise.resolve({
      data: selectRows[table] ?? [],
      error: missingTables.has(table) ? { code: '42P01', message: 'missing relation' } : null,
    }) as Promise<{ data: Array<{ id: string }> | null; error: unknown }> & {
      eq: ReturnType<typeof vi.fn>
      limit: ReturnType<typeof vi.fn>
    }
    result.eq = vi.fn(() => makeSelectResult(table))
    result.limit = vi.fn(() => result)
    return result
  }
  const service = {
    auth: {
      admin: {
        deleteUser: vi.fn(async () => options?.authDeleteError ? ({ error: options.authDeleteError }) : ({ data: { user: null }, error: null })),
      },
    },
    from: vi.fn((table: string) => {
      calls.push({ table, method: 'from' })
      const base = {
        select: vi.fn(() => makeSelectResult(table)),
        insert: vi.fn((payload: unknown) => {
          calls.push({ table, method: 'insert', args: [payload] })
          if (table === 'deleted_users' && options?.deleteErrors?.deleted_users) {
            return Promise.resolve({ error: options.deleteErrors.deleted_users })
          }
          return Promise.resolve({ error: null })
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            calls.push({ table, method: 'delete.eq', args: [column, value] })
            const key = `${table}.${column}`
            if (missingTables.has(table) || missingColumns.has(key)) return Promise.resolve({ error: { code: '42703', message: 'missing column' } })
            return Promise.resolve({ error: deleteErrors[key] ?? null })
          }),
          in: vi.fn((column: string, value: unknown) => {
            calls.push({ table, method: 'delete.in', args: [column, value] })
            const key = `${table}.${column}`
            if (missingTables.has(table) || missingColumns.has(key)) return Promise.resolve({ error: { code: '42703', message: 'missing column' } })
            return Promise.resolve({ error: deleteErrors[key] ?? null })
          }),
        })),
        update: vi.fn((payload: unknown) => ({
          eq: vi.fn((column: string, value: unknown) => {
            calls.push({ table, method: 'update.eq', args: [payload, column, value] })
            const key = `${table}.${column}`
            if (missingTables.has(table) || missingColumns.has(key)) return Promise.resolve({ error: { code: '42703', message: 'missing column' } })
            return Promise.resolve({ error: updateErrors[key] ?? null })
          }),
          in: vi.fn((column: string, value: unknown) => {
            calls.push({ table, method: 'update.in', args: [payload, column, value] })
            const key = `${table}.${column}`
            if (missingTables.has(table) || missingColumns.has(key)) return Promise.resolve({ error: { code: '42703', message: 'missing column' } })
            return Promise.resolve({ error: updateErrors[key] ?? null })
          }),
        })),
      }
      return base
    }),
    _calls: calls,
  }
  return service
}

describe('deleteAccountAndUserData', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('stores minimal deleted_users row and deletes owned data before auth deletion', async () => {
    const service = buildService({
      selectRows: {
        birth_profiles: [{ id: 'profile-1' }],
        chart_calculations: [{ id: 'calc-1' }],
        chart_json_versions: [{ id: 'chart-1' }],
        astro_chat_sessions: [{ id: 'session-1' }],
      },
    })

    await deleteAccountAndUserData({
      userId: 'user-1',
      displayNameFallback: 'Fallback Name',
      service: service as never,
      authUser: { id: 'user-1', user_metadata: { full_name: 'Auth Name' } },
    })

    expect(service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0]).toEqual({
      name: 'Auth Name',
      deletion_source: 'account_settings',
    })
    expect(service._calls.findIndex((call) => call.table === 'deleted_users' && call.method === 'insert')).toBeLessThan(
      service._calls.findIndex((call) => call.table === 'birth_profiles' && call.method.startsWith('delete')),
    )
    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('handles already-empty app data and still deletes auth user', async () => {
    const service = buildService()

    await deleteAccountAndUserData({
      userId: 'user-empty',
      service: service as never,
      authUser: { id: 'user-empty', user_metadata: {} },
    })

    expect(service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0]).toEqual({
      name: 'Deleted user',
      deletion_source: 'account_settings',
    })
    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith('user-empty')
  })

  it('does not insert another deleted_users row when a prior marker exists', async () => {
    const service = buildService({
      selectRows: {
        deleted_users: [{ id: 'marker-1' }],
      },
    })

    await deleteAccountAndUserData({
      userId: 'user-idempotent',
      service: service as never,
      authUser: { id: 'user-idempotent', user_metadata: { name: 'Name' } },
    })

    expect(service._calls.filter((call) => call.table === 'deleted_users' && call.method === 'insert')).toHaveLength(0)
  })

  it('skips missing optional tables and missing optional columns', async () => {
    const service = buildService({
      missingTables: ['news_posts', 'astro_conversations', 'prediction_ready_summaries'],
      missingColumns: [{ table: 'prediction_ready_summaries', column: 'calculation_id' }],
    })

    await deleteAccountAndUserData({
      userId: 'user-optional',
      service: service as never,
      authUser: { id: 'user-optional', user_metadata: { name: 'Name' } },
    })

    expect(service.auth.admin.deleteUser).toHaveBeenCalled()
  })

  it('aborts when deleted_users insert fails', async () => {
    const service = buildService({
      deleteErrors: { deleted_users: { code: '42501', message: 'permission denied for table deleted_users' } },
    })

    await expect(deleteAccountAndUserData({
      userId: 'user-fail',
      service: service as never,
      authUser: { id: 'user-fail', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ stage: 'insert_deleted_users', code: '42501', table: 'deleted_users' })

    expect(service._calls.some((call) => call.table === 'birth_profiles')).toBe(false)
    expect(service.auth.admin.deleteUser).not.toHaveBeenCalled()
  })

  it('treats auth delete 404 as success after cleanup', async () => {
    const service = buildService({
      authDeleteError: { status: 404, message: 'not found' },
    })

    await expect(deleteAccountAndUserData({
      userId: 'user-404',
      service: service as never,
      authUser: { id: 'user-404', user_metadata: { name: 'Name' } },
    })).resolves.toEqual(expect.objectContaining({ ok: true }))
  })

  it('fails on auth delete permission errors after cleanup', async () => {
    const service = buildService({
      authDeleteError: { status: 500, code: '500', message: 'permission denied' },
    })

    await expect(deleteAccountAndUserData({
      userId: 'user-auth-fail',
      service: service as never,
      authUser: { id: 'user-auth-fail', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ stage: 'delete_auth_user', code: '500' })
  })

  it('clears birth_profiles.current_chart_version_id before deleting chart_json_versions', async () => {
    const service = buildService({
      selectRows: {
        birth_profiles: [{ id: 'profile-1' }],
        chart_json_versions: [{ id: 'chart-1' }],
      },
    })

    await deleteAccountAndUserData({
      userId: 'user-chart',
      service: service as never,
      authUser: { id: 'user-chart', user_metadata: { name: 'Name' } },
    })

    const clearIndex = service._calls.findIndex((call) => call.table === 'birth_profiles' && call.method === 'update.eq')
    const deleteChartIndex = service._calls.findIndex((call) => call.table === 'chart_json_versions' && call.method === 'delete.in')
    expect(clearIndex).toBeGreaterThan(-1)
    expect(deleteChartIndex).toBeGreaterThan(clearIndex)
  })

  it('deletes astro chat messages by session_id before astro_chat_sessions', async () => {
    const service = buildService({
      selectRows: {
        astro_chat_sessions: [{ id: 'session-1' }],
      },
    })

    await deleteAccountAndUserData({
      userId: 'user-chat-order',
      service: service as never,
      authUser: { id: 'user-chat-order', user_metadata: { name: 'Name' } },
    })

    const messageSessionDelete = service._calls.findIndex((call) => call.table === 'astro_chat_messages' && call.method === 'delete.in' && call.args?.[0] === 'session_id')
    const sessionDelete = service._calls.findIndex((call) => call.table === 'astro_chat_sessions' && call.method.startsWith('delete'))
    expect(messageSessionDelete).toBeGreaterThan(-1)
    expect(sessionDelete).toBeGreaterThan(messageSessionDelete)
  })

  it('cleans profile fk references before deleting profiles', async () => {
    const service = buildService()

    await deleteAccountAndUserData({
      userId: 'user-profile',
      service: service as never,
      authUser: { id: 'user-profile', user_metadata: { name: 'Name' } },
    })

    const newsPostsIndex = service._calls.findIndex((call) => call.table === 'news_posts' && call.method.startsWith('delete'))
    const profileIndex = service._calls.findIndex((call) => call.table === 'profiles' && call.method.startsWith('delete'))
    expect(newsPostsIndex).toBeGreaterThan(-1)
    expect(profileIndex).toBeGreaterThan(newsPostsIndex)
  })

  it('does not delete rows for other users', async () => {
    const service = buildService({
      selectRows: {
        birth_profiles: [{ id: 'profile-1' }],
        chart_calculations: [{ id: 'calc-1' }],
        chart_json_versions: [{ id: 'chart-1' }],
      },
    })

    await deleteAccountAndUserData({
      userId: 'user-owned',
      service: service as never,
      authUser: { id: 'user-owned', user_metadata: { name: 'Name' } },
    })

    expect(service._calls.some((call) => call.table === 'birth_profiles' && call.method === 'delete.in' && Array.isArray(call.args?.[1]) && call.args?.[1]?.includes('profile-1'))).toBe(true)
    expect(service._calls.some((call) => call.table === 'chart_json_versions' && call.method === 'delete.in' && Array.isArray(call.args?.[1]) && call.args?.[1]?.includes('chart-1'))).toBe(true)
  })

  it('keeps deleted_users payload private', async () => {
    const service = buildService()

    await deleteAccountAndUserData({
      userId: 'user-private',
      displayNameFallback: '  Display Name  ',
      service: service as never,
      authUser: { id: 'user-private', email: 'private@example.com', user_metadata: { display_name: '  Display Name  ', provider_id: 'p1' } },
    })

    const payload = service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0] as Record<string, unknown>
    expect(payload).toEqual({ name: 'Display Name', deletion_source: 'account_settings' })
    expect(Object.keys(payload)).toEqual(['name', 'deletion_source'])
  })

  it('does not store email, user_id, or chart metadata in deleted_users', async () => {
    const service = buildService()

    await deleteAccountAndUserData({
      userId: 'user-private-2',
      service: service as never,
      authUser: {
        id: 'user-private-2',
        email: 'private@example.com',
        user_metadata: {
          full_name: 'Private Name',
          user_id: 'leak',
          chart_version_id: 'chart-1',
          conversation_id: 'conv-1',
        },
      },
    })

    const payload = service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0] as Record<string, unknown>
    expect(payload).toEqual({ name: 'Private Name', deletion_source: 'account_settings' })
  })

  it('logs and propagates auth deletion errors after cleanup', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => void 0)
    const service = buildService({ authDeleteError: { code: '500', message: 'auth failed' } })

    await expect(deleteAccountAndUserData({
      userId: 'user-auth',
      service: service as never,
      authUser: { id: 'user-auth', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ stage: 'delete_auth_user', code: '500', table: 'auth.users' })

    expect(consoleSpy).toHaveBeenCalledWith('[account-delete]', expect.objectContaining({ stage: 'delete_auth_user' }))
    consoleSpy.mockRestore()
  })

  it('fails on nullable fk cleanup when nulling is rejected and the row exists', async () => {
    const service = buildService({
      updateErrors: { 'profiles.referred_by': { code: '23502', message: 'null violation' } },
    })

    await expect(deleteAccountAndUserData({
      userId: 'user-fk',
      service: service as never,
      authUser: { id: 'user-fk', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ stage: 'clear_profile_references', table: 'profiles', column: 'referred_by' })
  })

  it('fails deterministically when service role env is missing', async () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const service = buildService()

    await expect(deleteAccountAndUserData({
      userId: 'user-env',
      service: service as never,
      authUser: { id: 'user-env', user_metadata: { name: 'Name' } },
    })).rejects.toThrow('service role key missing')

    process.env.SUPABASE_SERVICE_ROLE_KEY = previous
  })

  it('migration defines deleted_users without private columns', () => {
    const migration = fs.readFileSync('supabase/migrations/20260503140000_deleted_users.sql', 'utf8')
    expect(migration).toContain('create table if not exists public.deleted_users')
    expect(migration).toContain('name text not null')
    expect(migration).toContain('deleted_at timestamptz not null default now()')
    expect(migration).toContain("deletion_source text not null default 'account_settings'")
    expect(migration).not.toMatch(/email|user_id|birth|chart|conversation/i)
  })
})
