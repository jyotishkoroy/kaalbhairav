"use client";

import { useMemo, useState } from "react";
import { AstroReadingV2Panel } from "@/components/astro/AstroReadingV2Panel";
import { ReadAloudButton } from "@/components/astro/ReadAloudButton";
import { VoiceInputButton } from "@/components/astro/VoiceInputButton";
import type { ReadingMode } from "@/lib/astro/reading/reading-types";
import {
  buildAstroV2ChatRequest,
  emptyBirthDetails,
  extractAstroV2ChatResponse,
  shouldSubmitAstroV2Question,
  type AstroV2BirthDetailsForm,
} from "@/lib/astro/reading/v2-chat-client";

const SAFE_META_KEYS = [
  "version",
  "topic",
  "mode",
  "language",
  "evidenceCount",
  "usedFallback",
  "safetyLayer",
  "safetyRiskNames",
  "safetyReplacedAnswer",
  "forbiddenClaimsRemoved",
  "memoryLayer",
  "memorySummaryUsed",
  "remediesLayer",
  "remedyEvidenceIncluded",
  "monthlyLayer",
  "monthlyGuidanceIncluded",
  "llmProvider",
  "llmRefinerEnabled",
  "llmRefinerUsed",
  "llmRefinerFallback",
  "llmModel",
] as const;

type SafeMetaKey = (typeof SAFE_META_KEYS)[number];

function pickSafeMeta(meta: Record<string, unknown>): Partial<Record<SafeMetaKey, unknown>> {
  return Object.fromEntries(
    SAFE_META_KEYS.map((key) => [key, meta[key]]).filter(([, value]) => value !== undefined),
  ) as Partial<Record<SafeMetaKey, unknown>>;
}

function stringifyMetaValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

type AstroV2ChatClientProps = {
  profileId?: string;
};

export function AstroV2ChatClient({ profileId }: AstroV2ChatClientProps) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<ReadingMode>("practical_guidance");
  const [birthDetails, setBirthDetails] =
    useState<AstroV2BirthDetailsForm>(emptyBirthDetails);
  const [showBirthDetails, setShowBirthDetails] = useState(false);
  const [answer, setAnswer] = useState("");
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const safeMeta = useMemo(() => pickSafeMeta(meta), [meta]);
  const canSubmit = shouldSubmitAstroV2Question(question) && !isLoading && Boolean(profileId);

  function updateBirthDetails<K extends keyof AstroV2BirthDetailsForm>(
    key: K,
    value: AstroV2BirthDetailsForm[K],
  ) {
    setBirthDetails((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleFollowUp(message: string) {
    setQuestion(message);
  }

  function handleVoiceTranscript(text: string) {
    setQuestion((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed} ${text}` : text;
    });
  }

  async function readErrorMessage(response: Response): Promise<string> {
    const payload = await response.text().catch(() => "");

    if (!payload) {
      return `Request failed with status ${response.status}. Please try again.`;
    }

    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const message =
        typeof parsed.message === "string"
          ? parsed.message
          : typeof parsed.error === "string"
            ? parsed.error
            : "";

      return message || `Request failed with status ${response.status}. Please try again.`;
    } catch {
      return payload.slice(0, 240);
    }
  }

  async function handleSubmit() {
    if (!profileId) {
      setError("No active profile is available for chat yet.");
      return;
    }

    if (!shouldSubmitAstroV2Question(question)) {
      setError("Please enter a question first.");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/astro/v1/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          profile_id: profileId,
          ...buildAstroV2ChatRequest({
            question,
            mode,
            birthDetails,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("The server returned no response stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let latestAnswer = "";
      let latestMeta: Record<string, unknown> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const json = JSON.parse(payload) as Record<string, unknown>;

            if (json.type === "meta" && typeof json.session_id === "string") {
              latestMeta = {
                ...latestMeta,
                sessionId: json.session_id,
                remaining:
                  typeof json.remaining === "number" ? json.remaining : latestMeta.remaining,
              };
            }

            if (json.type === "final_answer") {
              if (typeof json.rendered === "string") {
                latestAnswer = json.rendered;
              } else if (typeof json.answer === "string") {
                latestAnswer = json.answer;
              }

              if (json.answer && typeof json.answer === "object") {
                const answerRecord = json.answer as Record<string, unknown>;
                if (answerRecord.final_answer && typeof answerRecord.final_answer === "object") {
                  latestMeta = {
                    ...latestMeta,
                    ...(answerRecord.final_answer as Record<string, unknown>),
                  };
                }
              }
            }

            if (json.type === "token" && typeof json.t === "string") {
              latestAnswer += json.t;
            }
          } catch {
            // Ignore malformed stream events and continue reading.
          }
        }
      }

      const parsed = extractAstroV2ChatResponse({
        answer: latestAnswer,
        meta: latestMeta,
      });

      if (!parsed.answer) {
        throw new Error("The server returned an empty answer.");
      }

      setAnswer(parsed.answer);
      setMeta(parsed.meta);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <h2 className="text-xl font-medium">Ask Reading V2</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Ask a question. The server decides whether to use Reading V2 based on
          ASTRO_READING_V2_ENABLED. This page does not expose secrets or call
          Groq directly from the browser.
        </p>
        {!profileId ? (
          <p className="mt-2 text-sm leading-6 text-amber-100/80">
            No active birth profile was found for your account, so chat is disabled
            until one is available.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <label className="text-sm font-medium" htmlFor="astro-v2-question">
          Your question
        </label>
        <textarea
          id="astro-v2-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Example: I am working hard but not getting promotion. When will things improve?"
          rows={5}
          className="min-h-32 rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-white/40"
        />
        <div className="flex flex-wrap items-center gap-2">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            language={String(meta.language ?? "english")}
            disabled={isLoading}
          />
          {answer ? (
            <ReadAloudButton
              text={answer}
              language={String(meta.language ?? "english")}
              disabled={isLoading}
            />
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowBirthDetails((current) => !current)}
        className="w-fit rounded-full border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10"
      >
        {showBirthDetails ? "Hide birth details" : "Optional birth details"}
      </button>

      {showBirthDetails ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Date of birth
            <input
              type="date"
              value={birthDetails.dateOfBirth}
              onChange={(event) =>
                updateBirthDetails("dateOfBirth", event.target.value)
              }
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none focus:border-white/40"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Time of birth
            <input
              type="time"
              value={birthDetails.timeOfBirth}
              onChange={(event) =>
                updateBirthDetails("timeOfBirth", event.target.value)
              }
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none focus:border-white/40"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Place of birth
            <input
              type="text"
              value={birthDetails.placeOfBirth}
              onChange={(event) =>
                updateBirthDetails("placeOfBirth", event.target.value)
              }
              placeholder="City, State, Country"
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none placeholder:text-white/35 focus:border-white/40"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Latitude
            <input
              type="text"
              inputMode="decimal"
              value={birthDetails.latitude}
              onChange={(event) =>
                updateBirthDetails("latitude", event.target.value)
              }
              placeholder="22.5726"
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none placeholder:text-white/35 focus:border-white/40"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Longitude
            <input
              type="text"
              inputMode="decimal"
              value={birthDetails.longitude}
              onChange={(event) =>
                updateBirthDetails("longitude", event.target.value)
              }
              placeholder="88.3639"
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none placeholder:text-white/35 focus:border-white/40"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Timezone
            <input
              type="text"
              value={birthDetails.timezone}
              onChange={(event) =>
                updateBirthDetails("timezone", event.target.value)
              }
              placeholder="Asia/Kolkata"
              className="rounded-lg border border-white/10 bg-black/30 p-2 outline-none placeholder:text-white/35 focus:border-white/40"
            />
          </label>
          <p className="text-xs leading-5 text-white/55 sm:col-span-2">
            No geocoding API is used. Enter coordinates manually if needed.
          </p>
        </div>
      ) : null}

      <AstroReadingV2Panel
        mode={mode}
        onModeChange={setMode}
        onFollowUpSelect={handleFollowUp}
        memoryEnabled={Boolean(meta.memoryLayer && meta.memoryLayer !== "disabled")}
        memorySummary={
          meta.memorySummaryUsed ? "Previous reading context was used." : undefined
        }
        previousTopic={typeof meta.topic === "string" ? meta.topic : undefined}
        voiceLanguage={String(meta.language ?? "english")}
        latestAnswer={answer}
        onVoiceTranscript={handleVoiceTranscript}
        disabled={isLoading}
      />

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className={[
          "rounded-xl px-4 py-3 text-sm font-medium transition",
          canSubmit
            ? "bg-white text-black hover:bg-white/90"
            : "cursor-not-allowed bg-white/20 text-white/45",
        ].join(" ")}
      >
        {isLoading ? "Generating reading..." : "Generate Reading V2 answer"}
      </button>

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
          {error}
        </div>
      ) : null}

      {answer ? (
        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-sm font-medium text-white/70">Answer</div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-white/90">
            {answer}
          </div>
        </article>
      ) : null}

      {Object.keys(safeMeta).length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-medium text-white/70">
            Safe metadata
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(safeMeta).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-white/10 bg-black/20 p-2"
              >
                <dt className="text-xs text-white/45">{key}</dt>
                <dd className="mt-1 break-words text-white/85">
                  {stringifyMetaValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </section>
  );
}
