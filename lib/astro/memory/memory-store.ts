import {
  createEmptyAstrologyUserMemory,
  type AstrologyUserMemory,
  type SaveReadingMemoryInput,
} from "@/lib/astro/memory/memory-types";
import {
  capMemory,
  sanitizeMemorySummary,
  shouldStoreQuestionInMemory,
} from "@/lib/astro/memory/memory-policy";

const memoryByUserId = new Map<string, AstrologyUserMemory>();

export type AstrologyMemoryStore = {
  get(userId: string): Promise<AstrologyUserMemory | undefined>;
  saveReading(input: SaveReadingMemoryInput): Promise<AstrologyUserMemory>;
  clear(userId: string): Promise<void>;
};

function mergeUniqueTopics(
  existing: AstrologyUserMemory["mainConcerns"],
  nextTopic: SaveReadingMemoryInput["topic"],
): AstrologyUserMemory["mainConcerns"] {
  return Array.from(new Set([...existing, nextTopic]));
}

export const inMemoryAstrologyMemoryStore: AstrologyMemoryStore = {
  async get(userId) {
    return memoryByUserId.get(userId);
  },

  async saveReading(input) {
    const existing =
      memoryByUserId.get(input.userId) ??
      createEmptyAstrologyUserMemory(input.userId);

    if (!shouldStoreQuestionInMemory(input.question)) {
      return existing;
    }

    const createdAt = input.createdAt ?? new Date().toISOString();
    const summary = sanitizeMemorySummary(input.summary);

    const next: AstrologyUserMemory = capMemory({
      ...existing,
      birthProfile: input.birthProfile ?? existing.birthProfile,
      mainConcerns: mergeUniqueTopics(existing.mainConcerns, input.topic),
      emotionalPatterns: input.emotionalTone
        ? [
            ...existing.emotionalPatterns,
            {
              topic: input.topic,
              tone: input.emotionalTone,
              lastSeenAt: createdAt,
            },
          ]
        : existing.emotionalPatterns,
      previousReadings: [
        ...existing.previousReadings,
        {
          topic: input.topic,
          question: input.question,
          summary,
          guidanceGiven: input.guidanceGiven ?? [],
          createdAt,
        },
      ],
      updatedAt: createdAt,
    });

    memoryByUserId.set(input.userId, next);

    return next;
  },

  async clear(userId) {
    memoryByUserId.delete(userId);
  },
};

export async function getAstrologyMemory(
  userId: string,
  store: AstrologyMemoryStore = inMemoryAstrologyMemoryStore,
): Promise<AstrologyUserMemory | undefined> {
  return store.get(userId);
}

export async function saveAstrologyReadingMemory(
  input: SaveReadingMemoryInput,
  store: AstrologyMemoryStore = inMemoryAstrologyMemoryStore,
): Promise<AstrologyUserMemory> {
  return store.saveReading(input);
}

export async function clearAstrologyMemory(
  userId: string,
  store: AstrologyMemoryStore = inMemoryAstrologyMemoryStore,
): Promise<void> {
  await store.clear(userId);
}
