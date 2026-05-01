/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { EvidenceDomain } from "./evidence-domain-types";

export function inferAllowedDomains(primaryDomain: EvidenceDomain): EvidenceDomain[] {
  switch (primaryDomain) {
    case "identity":
      return ["identity"];
    case "planetary_placement":
      return ["planetary_placement"];
    case "career":
      return ["career"];
    case "money":
      return ["money"];
    case "business":
      return ["business", "money", "safety"];
    case "relationship":
      return ["relationship"];
    case "marriage":
      return ["marriage", "relationship"];
    case "family":
      return ["family"];
    case "education":
      return ["education", "career"];
    case "foreign_settlement":
      return ["foreign_settlement"];
    case "remedy":
      return ["remedy", "health_adjacent"];
    case "health_adjacent":
      return ["health_adjacent", "safety"];
    case "safety":
      return ["safety"];
    case "general":
    default:
      return ["general"];
  }
}
