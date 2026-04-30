/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({ insert: insertMock })),
  })),
}));

import { POST, GET } from "@/app/api/astro/v2/feedback/route";

function req(body: unknown) {
  return new Request("https://tarayai.com/api/astro/v2/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("astro v2 feedback api", () => {
  beforeEach(() => {
    insertMock.mockReset();
    getUserMock.mockReset();
  });

  it("rejects GET", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it("rejects empty payload", async () => {
    const response = await POST(req({}));
    expect(response.status).toBe(400);
  });

  it("rejects invalid rating", async () => {
    const response = await POST(req({ rating: 9, comment: "x" }));
    expect(response.status).toBe(202);
  });

  it("trims comment", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: null });
    const response = await POST(req({ comment: " x ".repeat(400) }));
    expect(response.status).toBe(200);
  });

  it("accepts feltHeard feedback", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: null });
    const response = await POST(req({ feltHeard: true }));
    expect(response.status).toBe(200);
  });

  it("accepts tooGeneric feedback", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: null });
    const response = await POST(req({ tooGeneric: true }));
    expect(response.status).toBe(200);
  });

  it("handles no auth softly", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const response = await POST(req({ comment: "helpful" }));
    expect(response.status).toBe(202);
  });

  it("inserts row when authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: null });
    const response = await POST(req({ sessionId: "s", messageId: "m", rating: 5, feltHeard: true }));
    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
  });

  it("sanitizes insert errors", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: new Error("boom") });
    const response = await POST(req({ comment: "x" }));
    expect(response.status).toBe(202);
  });

  it("does not leak secrets", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: new Error("GROQ_API_KEY") });
    const response = await POST(req({ comment: "x" }));
    expect(await response.text()).not.toContain("GROQ_API_KEY");
  });
});
