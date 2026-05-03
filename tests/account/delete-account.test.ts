/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { deleteAccountAndUserData } from '@/lib/account/delete-account'

function makeService() {
  const calls: Array<{ table: string; method: string; args?: unknown[] }> = []

  const deleteResult = Promise.resolve({ error: null })
  const selectResult = (data: Array<{ id: string }> = []) => Promise.resolve({ data, error: null })

  const service = {
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    },
    from: vi.fn((table: string) => {
      calls.push({ table, method: 'from' })
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(async (payload: unknown) => {
          calls.push({ table, method: 'insert', args: [payload] })
          return { error: null }
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(() => deleteResult),
          in: vi.fn(() => deleteResult),
        })),
      } as {
        select: ReturnType<typeof vi.fn>
        insert: ReturnType<typeof vi.fn>
        delete: ReturnType<typeof vi.fn>
      }
      if (table === 'birth_profiles') {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => selectResult([{ id: 'profile-1' }])),
        }))
      }
      if (table === 'chart_calculations') {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => selectResult([{ id: 'calc-1' }])),
        }))
      }
      if (table === 'chart_json_versions') {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => selectResult([{ id: 'chart-1' }])),
        }))
      }
      if (table === 'astro_chat_sessions') {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => selectResult([{ id: 'session-1' }])),
        }))
      }
      return chain
    }),
    _calls: calls,
  }

  return service
}

describe('deleteAccountAndUserData', () => {
  it('stores minimal deleted_users row and deletes owned data before auth deletion', async () => {
    const service = makeService()

    await deleteAccountAndUserData({
      userId: 'user-1',
      displayNameFallback: 'Fallback Name',
      service: service as never,
      authUser: { id: 'user-1', user_metadata: { full_name: 'Auth Name' } },
    })

    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
    expect(service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0]).toEqual({
      name: 'Auth Name',
      deletion_source: 'account_settings',
    })
    expect(service._calls.some((call) => call.table === 'birth_profiles')).toBe(true)
    expect(service._calls.some((call) => call.table === 'chart_json_versions')).toBe(true)
    expect(service._calls.some((call) => call.table === 'chart_calculations')).toBe(true)
    expect(service._calls.some((call) => call.table === 'astro_chat_sessions')).toBe(true)
  })

  it('falls back to Deleted user without leaking email or birth data', async () => {
    const service = makeService()

    await deleteAccountAndUserData({
      userId: 'user-2',
      service: service as never,
      authUser: { id: 'user-2', email: 'private@example.com', user_metadata: {} },
    })

    expect(service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0]).toEqual({
      name: 'Deleted user',
      deletion_source: 'account_settings',
    })
  })

  it('propagates auth deletion errors', async () => {
    const service = makeService()
    service.auth.admin.deleteUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'auth failed' } as never })

    await expect(deleteAccountAndUserData({
      userId: 'user-3',
      service: service as never,
      authUser: { id: 'user-3', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ message: 'auth failed' })
  })

  it('does not swallow unexpected table errors', async () => {
    const service = makeService()
    service.from.mockImplementation(((table: string) => {
      if (table === 'deleted_users') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      if (table === 'birth_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: { code: '42501', message: 'rls denied' } })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }) as never)

    await expect(deleteAccountAndUserData({
      userId: 'user-4',
      service: service as never,
      authUser: { id: 'user-4', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ code: '42501' })
  })

  it('aborts before app-data deletes when deleted_users table is missing', async () => {
    const service = makeService()
    service.from.mockImplementation(((table: string) => {
      if (table === 'deleted_users') {
        return {
          insert: vi.fn((payload: unknown) => {
            service._calls.push({ table, method: 'insert', args: [payload] })
            return Promise.resolve({ error: { code: '42P01', message: 'missing relation' } })
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }) as never)

    await expect(deleteAccountAndUserData({
      userId: 'user-missing',
      service: service as never,
      authUser: { id: 'user-missing', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ code: '42P01' })

    expect(service._calls.filter((call) => call.method === 'insert' && call.table === 'deleted_users')).toHaveLength(1)
    expect(service._calls.some((call) => call.table === 'birth_profiles')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_json_versions')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_calculations')).toBe(false)
    expect(service._calls.some((call) => call.table === 'astro_chat_sessions')).toBe(false)
    expect(service.auth.admin.deleteUser).not.toHaveBeenCalled()
  })

  it('aborts before app-data deletes when deleted_users insert fails', async () => {
    const service = makeService()
    service.from.mockImplementation(((table: string) => {
      if (table === 'deleted_users') {
        return {
          insert: vi.fn((payload: unknown) => {
            service._calls.push({ table, method: 'insert', args: [payload] })
            return Promise.resolve({ error: { message: 'insert failed' } })
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }) as never)

    await expect(deleteAccountAndUserData({
      userId: 'user-insert',
      service: service as never,
      authUser: { id: 'user-insert', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ message: 'insert failed' })

    expect(service._calls.some((call) => call.table === 'birth_profiles')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_json_versions')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_calculations')).toBe(false)
    expect(service._calls.some((call) => call.table === 'astro_chat_sessions')).toBe(false)
    expect(service.auth.admin.deleteUser).not.toHaveBeenCalled()
  })

  it('aborts before app-data deletes when deleted_users insert is blocked by RLS or permissions', async () => {
    const service = makeService()
    service.from.mockImplementation(((table: string) => {
      if (table === 'deleted_users') {
        return {
          insert: vi.fn((payload: unknown) => {
            service._calls.push({ table, method: 'insert', args: [payload] })
            return Promise.resolve({ error: { code: '42501', message: 'permission denied for table deleted_users' } })
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }) as never)

    await expect(deleteAccountAndUserData({
      userId: 'user-rls',
      service: service as never,
      authUser: { id: 'user-rls', user_metadata: { name: 'Name' } },
    })).rejects.toMatchObject({ code: '42501' })

    expect(service._calls.some((call) => call.table === 'birth_profiles')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_json_versions')).toBe(false)
    expect(service._calls.some((call) => call.table === 'chart_calculations')).toBe(false)
    expect(service._calls.some((call) => call.table === 'astro_chat_sessions')).toBe(false)
    expect(service.auth.admin.deleteUser).not.toHaveBeenCalled()
  })

  it('does not include private data in deleted_users payload', async () => {
    const service = makeService()

    await deleteAccountAndUserData({
      userId: 'user-5',
      displayNameFallback: '  Display Name  ',
      service: service as never,
      authUser: { id: 'user-5', email: 'a@b.com', user_metadata: { display_name: '  Display Name  ' } },
    })

    const payload = service._calls.find((call) => call.method === 'insert' && call.table === 'deleted_users')?.args?.[0] as Record<string, unknown>
    expect(payload).toEqual({ name: 'Display Name', deletion_source: 'account_settings' })
    expect(JSON.stringify(payload)).not.toMatch(/email|birth|chart|conversation|user_id|metadata|provider/i)
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
