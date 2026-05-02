// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { routeAstroRagRequest } from "../../../lib/astro/rag/rag-routing";

const flags = {
  ragEnabled: true,
  routingEnabled: true,
} as never;

describe("rag routing foundation", () => {
  it("routes to rag when feature flags and request are valid", () => {
    const result = routeAstroRagRequest({ question: "What is my Lagna?", userId: "u1", flags, routingEnabled: true });
    expect(result.kind).toBe("rag");
    expect(result.questionFrame?.coreQuestion).toBe("What is my Lagna?");
    expect(result.structuredIntent?.primaryIntent).toBe("exact_fact");
  });

  it("falls back without a question", () => {
    const result = routeAstroRagRequest({ question: "   ", userId: "u1", flags, routingEnabled: true });
    expect(result.kind).toBe("fallback");
    expect(result.reason).toBe("missing_question");
  });

  it("falls back without a user id", () => {
    const result = routeAstroRagRequest({ question: "What is my Lagna?", userId: null, flags, routingEnabled: true });
    expect(result.kind).toBe("fallback");
    expect(result.reason).toBe("missing_user_id");
  });

  it("preserves old route when routing is disabled", () => {
    const result = routeAstroRagRequest({ question: "What is my Lagna?", userId: "u1", flags, routingEnabled: false });
    expect(result.kind).toBe("old_v2");
    expect(result.reason).toBe("routing_disabled");
  });
});
