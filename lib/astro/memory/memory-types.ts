/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type {
  ReadingLanguage,
  ReadingTopic,
} from "@/lib/astro/reading/reading-types";

export const MAX_PREVIOUS_READINGS = 20;

export type AstrologyBirthProfileMemory = {
  date?: string;
  time?: string;
  place?: string;
  timezone?: number;
  latitude?: number;
  longitude?: number;
  lagna?: string;
  moonSign?: string;
  nakshatra?: string;
};

export type AstrologyReadingMemoryItem = {
  topic: ReadingTopic;
  question: string;
  summary: string;
  guidanceGiven: string[];
  createdAt: string;
};

export type AstrologyUserPreferences = {
  language?: ReadingLanguage;
  tone?: "gentle" | "direct" | "spiritual" | "practical";
  technicalDepth?: "low" | "medium" | "high";
};

export type AstrologyUserMemory = {
  userId: string;
  name?: string;
  birthProfile?: AstrologyBirthProfileMemory;
  mainConcerns: ReadingTopic[];
  emotionalPatterns: {
    topic: ReadingTopic;
    tone: string;
    lastSeenAt: string;
  }[];
  previousReadings: AstrologyReadingMemoryItem[];
  preferences: AstrologyUserPreferences;
  updatedAt: string;
};

export type SaveReadingMemoryInput = {
  userId: string;
  topic: ReadingTopic;
  question: string;
  summary: string;
  guidanceGiven?: string[];
  emotionalTone?: string;
  birthProfile?: AstrologyBirthProfileMemory;
  createdAt?: string;
};

export function createEmptyAstrologyUserMemory(
  userId: string,
): AstrologyUserMemory {
  const now = new Date().toISOString();

  return {
    userId,
    mainConcerns: [],
    emotionalPatterns: [],
    previousReadings: [],
    preferences: {},
    updatedAt: now,
  };
}
