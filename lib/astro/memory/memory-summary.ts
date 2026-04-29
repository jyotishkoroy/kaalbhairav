import type {
  AstrologyReadingMemoryItem,
  AstrologyUserMemory,
} from "@/lib/astro/memory/memory-types";

function summarizeReading(item: AstrologyReadingMemoryItem): string {
  return `Last time, the user asked about ${item.topic}. The guidance was: ${item.summary}.`;
}

export function buildMemorySummary(
  memory?: AstrologyUserMemory,
): string | undefined {
  if (!memory || memory.previousReadings.length === 0) return undefined;

  const last = memory.previousReadings.at(-1);

  if (!last) return undefined;

  return summarizeReading(last);
}

export function summarizeReadingForMemory(answer: string): string {
  const normalized = answer.replace(/\s+/g, " ").trim();

  if (normalized.length <= 240) return normalized;

  return `${normalized.slice(0, 237).trim()}...`;
}

export function extractGuidanceForMemory(answer: string): string[] {
  const sentences = answer
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences
    .filter((sentence) => {
      const lower = sentence.toLowerCase();

      return (
        lower.includes("guidance") ||
        lower.includes("focus") ||
        lower.includes("avoid") ||
        lower.includes("careful") ||
        lower.includes("next step")
      );
    })
    .slice(0, 3);
}
