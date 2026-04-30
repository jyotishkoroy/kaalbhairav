/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { CompanionMemoryItem, CompanionMemoryStore } from "./companion-memory-types";
import { sanitizeMemoryDraft } from "./companion-memory-redactor";

export type SupabaseLikeCompanionClient = {
  from: (table: string) => SupabaseLikeCompanionQuery;
};

type SupabaseLikeCompanionQuery = {
  select: (columns?: string) => SupabaseLikeCompanionQuery;
  eq: (column: string, value: unknown) => SupabaseLikeCompanionQuery;
  is: (column: string, value: unknown) => SupabaseLikeCompanionQuery;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseLikeCompanionQuery;
  or: (filter: string) => SupabaseLikeCompanionQuery;
  limit: (count: number) => Promise<{ data?: unknown }>;
  insert: (row: Record<string, unknown>) => Promise<{ data?: unknown }>;
  update: (row: Record<string, unknown>) => SupabaseLikeCompanionQuery;
};

function mapRow(row: Record<string, unknown>): CompanionMemoryItem | null {
  if (!row || typeof row !== "object") return null;
  const id = typeof row.id === "string" ? row.id : null;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const memoryType = typeof row.memory_type === "string" ? row.memory_type : null;
  const content = typeof row.content === "string" ? row.content : null;
  const confidence = typeof row.confidence === "string" ? row.confidence : "medium";
  const lastSeenAt = typeof row.last_seen_at === "string" ? row.last_seen_at : new Date().toISOString();
  const createdAt = typeof row.created_at === "string" ? row.created_at : lastSeenAt;
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : lastSeenAt;
  if (!id || !userId || !memoryType || !content) return null;
  return {
    id,
    userId,
    memoryType: memoryType as CompanionMemoryItem["memoryType"],
    topic: typeof row.topic === "string" ? row.topic : null,
    content,
    confidence: confidence as CompanionMemoryItem["confidence"],
    sourceMessageId: typeof row.source_message_id === "string" ? row.source_message_id : null,
    lastSeenAt,
    createdAt,
    updatedAt,
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
  };
}

export function createSupabaseCompanionMemoryStore(client: SupabaseLikeCompanionClient): CompanionMemoryStore {
  return {
    async listForUser(input) {
      try {
        let query = client.from("astro_companion_memory").select("*").eq("user_id", input.userId).is("archived_at", null).order("last_seen_at", { ascending: false });
        if (input.topic) query = query.or(`topic.eq.${input.topic},topic.eq.general,topic.eq.unknown`);
        const response = await query.limit(Math.min(input.maxItems ?? 8, 12));
        const rows: unknown[] = Array.isArray((response as { data?: unknown[] })?.data) ? ((response as { data?: unknown[] }).data ?? []) : [];
        return rows.map((row: unknown) => mapRow(row as Record<string, unknown>)).filter((row): row is CompanionMemoryItem => Boolean(row));
      } catch {
        return [];
      }
    },
    async upsertMemory(input) {
      const sanitized = sanitizeMemoryDraft(input.draft);
      if (!sanitized) return null;
      try {
        const payload = {
          user_id: input.userId,
          memory_type: sanitized.memoryType,
          topic: sanitized.topic ?? null,
          content: sanitized.content,
          confidence: sanitized.confidence ?? "medium",
          source_message_id: sanitized.sourceMessageId ?? null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const response = await client.from("astro_companion_memory").insert(payload);
        const row: unknown = Array.isArray(response?.data) ? response.data[0] : response?.data ?? payload;
        return mapRow(row as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    async archiveMemory(input) {
      try {
        await client.from("astro_companion_memory").update({ archived_at: new Date().toISOString() }).eq("user_id", input.userId).eq("id", input.memoryId);
        return true;
      } catch {
        return false;
      }
    },
    async clearUserMemory(input) {
      try {
        let query = client.from("astro_companion_memory").update({ archived_at: new Date().toISOString() }).eq("user_id", input.userId).is("archived_at", null);
        if (input.topic != null) query = query.eq("topic", input.topic);
        await query;
        return true;
      } catch {
        return false;
      }
    },
  };
}
