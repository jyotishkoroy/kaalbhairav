import type { ChartFact } from "./chart-fact-extractor";
import type { RequiredDataPlan } from "./required-data-planner";
import type { RetrievalContext, SupabaseLikeClient } from "./retrieval-types";
import type { ReasoningRuleSelection } from "./reasoning-rule-selector";
import { selectReasoningRules } from "./reasoning-rule-selector";

export type ReasoningPathStep = {
  id: string;
  label: string;
  factKeys: string[];
  ruleKeys: string[];
  explanation: string;
  confidence: "deterministic" | "derived" | "partial";
  tags: string[];
};

export type ReasoningPath = {
  domain: RequiredDataPlan["domain"] | string;
  steps: ReasoningPathStep[];
  selectedRuleKeys: string[];
  selectedRuleIds: string[];
  missingAnchors: string[];
  warnings: string[];
  summary: string;
  metadata: {
    factCount: number;
    ruleCount: number;
    partial: boolean;
    stored: boolean;
  };
};

export type BuildReasoningPathInput = {
  plan: RequiredDataPlan;
  context: RetrievalContext;
  selection?: ReasoningRuleSelection;
  maxSteps?: number;
};

type InsertResult = { data?: Array<Record<string, unknown>> | Record<string, unknown> | null; error?: { message?: string } | null };

type InsertChain = {
  select?: (columns?: string) => InsertChain;
  limit?: (count: number) => PromiseLike<InsertResult> | InsertChain;
  then?: unknown;
};

type TableChain = {
  insert: (row: Record<string, unknown>) => InsertChain | PromiseLike<InsertResult>;
  select?: (columns?: string) => InsertChain;
};

function hasSelect(value: unknown): value is { select: (columns?: string) => unknown } {
  return Boolean(value) && typeof (value as { select?: unknown }).select === "function";
}

function hasLimit(value: unknown): value is { limit: (count: number) => unknown } {
  return Boolean(value) && typeof (value as { limit?: unknown }).limit === "function";
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function factLabel(fact: ChartFact): string {
  const parts = [fact.factValue, fact.sign, fact.planet, fact.house ? `house ${fact.house}` : null].filter(Boolean);
  return parts.join(" ").trim() || fact.factKey;
}

function formatFactForStep(fact: ChartFact): string {
  return `${fact.factKey}: ${factLabel(fact)}`;
}

function findFactByKey(context: RetrievalContext, key: string): ChartFact | undefined {
  const target = normalizeKey(key);
  return (context.chartFacts ?? []).find((fact) => normalizeKey(fact.factKey) === target || normalizeKey(fact.factType) === target);
}

function findPlanetPlacement(context: RetrievalContext, planet: string): ChartFact | undefined {
  const target = normalizeKey(planet);
  return (context.chartFacts ?? []).find((fact) => normalizeKey(fact.factType) === "planet_placement" && normalizeKey(fact.planet) === target);
}

function findHouseFact(context: RetrievalContext, house: number): ChartFact | undefined {
  return (context.chartFacts ?? []).find((fact) => fact.factType === "house" && fact.house === house || normalizeKey(fact.factKey) === `house_${house}`);
}

function findHouseLordFact(context: RetrievalContext, house: number): ChartFact | undefined {
  return (context.chartFacts ?? []).find((fact) => normalizeKey(fact.factType) === "house_lord" && normalizeKey(fact.factKey) === `lord_${house}`);
}

function findDashaFact(context: RetrievalContext): ChartFact | undefined {
  return (context.chartFacts ?? []).find((fact) => normalizeKey(fact.factType) === "dasha" || normalizeKey(fact.factKey) === "current_mahadasha" || normalizeKey(fact.factKey) === "current_antardasha");
}

function factsByDomainTags(context: RetrievalContext, tags: string[]): ChartFact[] {
  const normalized = tags.map(normalizeKey);
  return (context.chartFacts ?? []).filter((fact) => fact.tags?.some((tag) => normalized.includes(normalizeKey(tag))));
}

function requiredFactsMissing(plan: RequiredDataPlan, context: RetrievalContext): string[] {
  const facts = context.chartFacts ?? [];
  const missing: string[] = [];
  for (const required of plan.requiredFacts ?? []) {
    const key = normalizeKey(required);
    const found = facts.some(
      (fact) => normalizeKey(fact.factKey) === key || normalizeKey(fact.factType) === key || (fact.tags ?? []).map(normalizeKey).includes(key),
    );
    if (!found) missing.push(key);
  }
  return [...new Set(missing)];
}

function baseStep(id: string, label: string, explanation: string, factKeys: string[], ruleKeys: string[], tags: string[], confidence: ReasoningPathStep["confidence"] = "derived"): ReasoningPathStep {
  return { id, label, explanation, factKeys, ruleKeys, tags, confidence };
}

function selectedByDomain(selection: ReasoningRuleSelection | undefined, domain: string): ReasoningRuleSelection["selectedRules"] {
  return (selection?.selectedRules ?? []).filter((match) => normalizeKey(match.rule.domain) === normalizeKey(domain));
}

function stepFromRule(match: ReasoningRuleSelection["selectedRules"][number], fallbackId: string, label: string, explanation: string, factKeys: string[], tags: string[]): ReasoningPathStep {
  const template = match.rule.reasoningTemplate ? ` Anchor: ${match.rule.reasoningTemplate.trim().slice(0, 300)}` : "";
  return baseStep(fallbackId, label, `${explanation}${template}`.trim(), factKeys, [match.rule.ruleKey], tags, factKeys.length ? "deterministic" : "partial");
}

function buildCareerSteps(_plan: RequiredDataPlan, context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  const lagna = findFactByKey(context, "lagna");
  const sun = findPlanetPlacement(context, "sun");
  const house10 = findHouseFact(context, 10);
  const lord10 = findHouseLordFact(context, 10);
  const venus = findPlanetPlacement(context, "venus");
  const house11 = findHouseFact(context, 11);
  const moon = findPlanetPlacement(context, "moon");
  const mercury = findPlanetPlacement(context, "mercury");
  const dasha = findDashaFact(context);
  const careerRules = selectedByDomain(selection, "career");

  if (lagna) steps.push(baseStep("career-lagna", "Lagna", `Lagna sets the baseline temperament and visibility pattern. ${formatFactForStep(lagna)}`, [lagna.factKey], careerRules.slice(0, 1).map((match) => match.rule.ruleKey), ["career", "lagna"], "deterministic"));
  else missing.push("lagna");

  if (sun || house10) {
    const factKeys = [sun?.factKey, house10?.factKey].filter(Boolean) as string[];
    const detail = [sun ? `Sun in ${sun.sign ?? sun.factValue}` : null, house10 ? `10th house ${house10.factValue}` : null].filter(Boolean).join(" anchors ");
    steps.push(stepFromRule(careerRules[0] ?? selection.selectedRules[0], "career-10th", "10th House", `${detail || "10th house anchors career/status/authority themes."}`, factKeys, ["career", "house_10", "sun"]));
  } else missing.push("house_10");

  if (lord10 || venus) {
    const factKeys = [lord10?.factKey, venus?.factKey].filter(Boolean) as string[];
    steps.push(baseStep("career-lord-10", "10th Lord", `${lord10 ? formatFactForStep(lord10) : "10th lord is missing"} links career outcomes to Venus placement and routing. ${venus ? formatFactForStep(venus) : ""}`.trim(), factKeys, careerRules.slice(0, 2).map((match) => match.rule.ruleKey), ["career", "house_lord", "venus"], factKeys.length ? "deterministic" : "partial"));
  } else missing.push("lord_10");

  if (house11 || moon || mercury) {
    const factKeys = [house11?.factKey, moon?.factKey, mercury?.factKey].filter(Boolean) as string[];
    steps.push(baseStep("career-gains", "11th House", `${house11 ? formatFactForStep(house11) : "11th house is missing"} supports gains through networks, communication, and support systems. ${moon ? formatFactForStep(moon) : ""} ${mercury ? formatFactForStep(mercury) : ""}`.trim(), factKeys, careerRules.slice(0, 3).map((match) => match.rule.ruleKey), ["career", "gains", "network"], factKeys.length ? "deterministic" : "partial"));
  } else missing.push("house_11");

  if (dasha) {
    steps.push(baseStep("career-dasha", "Dasha", `Current dasha provides the timing backdrop. ${formatFactForStep(dasha)}`, [dasha.factKey], careerRules.map((match) => match.rule.ruleKey), ["career", "dasha"], "derived"));
  } else missing.push("current_dasha");

  if (venus && normalizeKey(venus.sign) === "cancer" && normalizeKey(venus.factValue).includes("12")) {
    warnings.push("Hidden/foreign work links are only mentioned because the supporting Venus fact is present.");
  }

  if (!steps.length) {
    warnings.push("Career reasoning is partial because required anchors are missing.");
  }
  const summary = steps.length
    ? "Career reasoning is anchored in Lagna, 10th-house/status factors, 11th-house gains, and dasha backdrop."
    : "Reasoning path is partial because required anchors are missing.";
  return { steps, missing, warnings, summary };
}

function buildSleepSteps(plan: RequiredDataPlan, context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const house12 = findHouseFact(context, 12);
  const moon = findPlanetPlacement(context, "moon");
  const house6 = findHouseFact(context, 6);
  const safeRule = selection.selectedRules.find((match) => normalizeKey(match.rule.domain) === "safety") ?? selection.selectedRules[0];
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  if (house12) steps.push(baseStep("sleep-12th", "12th House", "12th house facts anchor sleep, rest, and expense themes. " + formatFactForStep(house12), [house12.factKey], [safeRule?.rule.ruleKey].filter(Boolean) as string[], ["sleep", "house_12"], "deterministic"));
  else missing.push("house_12");
  if (moon) steps.push(baseStep("sleep-moon", "Moon", "Moon placement anchors mind, restlessness, and emotional rhythm. " + formatFactForStep(moon), [moon.factKey], [safeRule?.rule.ruleKey].filter(Boolean) as string[], ["sleep", "moon"], "deterministic"));
  else missing.push("moon_placement");
  if (house6) steps.push(baseStep("sleep-6th", "6th House", "6th house facts anchor routine, stress, and health-service patterns. " + formatFactForStep(house6), [house6.factKey], [safeRule?.rule.ruleKey].filter(Boolean) as string[], ["sleep", "house_6"], "deterministic"));
  else missing.push("house_6");
  steps.push(baseStep("sleep-remedy", "Safe Remedy", "Remedy guidance must stay optional, low-cost, non-medical, and non-guaranteed.", [], [safeRule?.rule.ruleKey].filter(Boolean) as string[], ["sleep", "remedy"], "partial"));
  const summary = "Sleep reasoning is anchored in 12th-house rest factors, Moon placement, 6th-house routine/stress, and safe remedy restrictions.";
  if (!moon) warnings.push("Moon placement is missing, so sleep reasoning is partial.");
  return { steps, missing, warnings, summary };
}

function buildMarriageSteps(context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const house7 = findHouseFact(context, 7);
  const lord7 = findHouseLordFact(context, 7);
  const venus = findPlanetPlacement(context, "venus");
  const dasha = findDashaFact(context);
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  if (house7) steps.push(baseStep("marriage-7th", "7th House", "7th house anchors partnership and spouse themes. " + formatFactForStep(house7), [house7.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["marriage", "house_7"], "deterministic"));
  else missing.push("house_7");
  if (lord7) steps.push(baseStep("marriage-lord", "7th Lord", "7th lord shows how relationship outcomes are routed. " + formatFactForStep(lord7), [lord7.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["marriage", "lord_7"], "deterministic"));
  else missing.push("lord_7");
  if (venus) steps.push(baseStep("marriage-venus", "Venus", "Venus placement anchors relationship comfort, attraction, and support themes. " + formatFactForStep(venus), [venus.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["marriage", "venus"], "deterministic"));
  else missing.push("venus_placement");
  if (dasha) steps.push(baseStep("marriage-dasha", "Dasha", "Current dasha can support timing interpretation only when timing sources are available. " + formatFactForStep(dasha), [dasha.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["marriage", "dasha"], "derived"));
  const summary = "Marriage reasoning is anchored in 7th-house factors, 7th lord, Venus, and dasha backdrop.";
  return { steps, missing, warnings: [], summary };
}

function buildMoneySteps(context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const house2 = findHouseFact(context, 2);
  const house11 = findHouseFact(context, 11);
  const dasha = findDashaFact(context);
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  if (house2) steps.push(baseStep("money-2nd", "2nd House", "2nd house anchors savings, family, speech, and income base. " + formatFactForStep(house2), [house2.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["money", "house_2"], "deterministic"));
  else missing.push("house_2");
  if (house11) steps.push(baseStep("money-11th", "11th House", "11th house anchors gains, network, and income expansion. " + formatFactForStep(house11), [house11.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["money", "house_11"], "deterministic"));
  else missing.push("house_11");
  if (dasha) steps.push(baseStep("money-dasha", "Dasha", "Dasha gives backdrop, but no financial guarantee is allowed. " + formatFactForStep(dasha), [dasha.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["money", "dasha"], "derived"));
  const summary = "Money reasoning is anchored in 2nd-house and 11th-house gains factors, with dasha as backdrop.";
  return { steps, missing, warnings: [], summary };
}

function buildForeignSteps(context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const house12 = findHouseFact(context, 12);
  const rahu = findPlanetPlacement(context, "rahu");
  const dasha = findDashaFact(context);
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  if (house12) steps.push(baseStep("foreign-12th", "12th House", "12th house anchors foreign, remote, and away-from-birthplace themes. " + formatFactForStep(house12), [house12.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["foreign", "house_12"], "deterministic"));
  else missing.push("house_12");
  if (rahu) steps.push(baseStep("foreign-rahu", "Rahu", "Rahu placement can support unconventional or foreign links when present. " + formatFactForStep(rahu), [rahu.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["foreign", "rahu"], "deterministic"));
  else missing.push("rahu_placement");
  if (dasha) steps.push(baseStep("foreign-dasha", "Dasha", "Dasha provides backdrop; exact timing requires grounded timing source. " + formatFactForStep(dasha), [dasha.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["foreign", "dasha"], "derived"));
  const summary = "Foreign reasoning is anchored in 12th-house, Rahu, and dasha backdrop.";
  if (!dasha) warnings.push("Timing cannot be grounded because no dasha fact is present.");
  return { steps, missing, warnings, summary };
}

function buildEducationSteps(context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const house5 = findHouseFact(context, 5);
  const house9 = findHouseFact(context, 9);
  const mercury = findPlanetPlacement(context, "mercury");
  const jupiter = findPlanetPlacement(context, "jupiter");
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  if (house5) steps.push(baseStep("edu-5th", "5th House", "5th house anchors learning, intelligence, and exam preparation. " + formatFactForStep(house5), [house5.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["education", "house_5"], "deterministic"));
  else missing.push("house_5");
  if (house9) steps.push(baseStep("edu-9th", "9th House", "9th house anchors higher learning, mentors, and fortune. " + formatFactForStep(house9), [house9.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["education", "house_9"], "deterministic"));
  else missing.push("house_9");
  if (mercury || jupiter) steps.push(baseStep("edu-planets", "Mercury/Jupiter", `${mercury ? formatFactForStep(mercury) : ""} ${jupiter ? formatFactForStep(jupiter) : ""}`.trim() || "Mercury and Jupiter placements anchor study, analysis, guidance, and wisdom.", [mercury?.factKey, jupiter?.factKey].filter(Boolean) as string[], selection.selectedRules.map((match) => match.rule.ruleKey), ["education", "mercury", "jupiter"], "deterministic"));
  const summary = "Education reasoning is anchored in 5th-house, 9th-house, Mercury, and Jupiter factors.";
  return { steps, missing, warnings: [], summary };
}

function buildSafetySteps(plan: RequiredDataPlan): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  return {
    steps: [
      baseStep("safety-restriction", "Safety", "Safety gate restricts this topic.", [], [], ["safety"], "deterministic"),
    ],
    missing: [],
    warnings: [...plan.safetyRestrictions],
    summary: "Safety gate restricts this topic.",
  };
}

function buildExactFactSteps(): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  return {
    steps: [],
    missing: [],
    warnings: ["Exact fact questions should be answered by the deterministic exact fact router before reasoning graph."],
    summary: "Exact fact questions should be answered by the deterministic exact fact router before reasoning graph.",
  };
}

function buildGenericSteps(context: RetrievalContext, selection: ReasoningRuleSelection): { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string } {
  const steps: ReasoningPathStep[] = [];
  const missing: string[] = [];
  const warnings: string[] = ["Generic reasoning is partial and should be narrowed to a specific topic."];
  const lagna = findFactByKey(context, "lagna");
  const moon = findPlanetPlacement(context, "moon");
  if (lagna) steps.push(baseStep("generic-lagna", "Lagna", "Lagna gives the baseline chart frame. " + formatFactForStep(lagna), [lagna.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["general", "lagna"], "deterministic"));
  else missing.push("lagna");
  if (moon) steps.push(baseStep("generic-moon", "Moon", "Moon gives the emotional and mind baseline. " + formatFactForStep(moon), [moon.factKey], selection.selectedRules.map((match) => match.rule.ruleKey), ["general", "moon"], "deterministic"));
  else missing.push("moon_placement");
  return { steps, missing, warnings, summary: "Reasoning path is partial because required anchors are missing." };
}

export function buildReasoningPath(input?: BuildReasoningPathInput): ReasoningPath {
  if (!input?.plan || !input?.context) {
    return {
      domain: input?.plan?.domain ?? "general",
      steps: [],
      selectedRuleKeys: [],
      selectedRuleIds: [],
      missingAnchors: [],
      warnings: [],
      summary: "Reasoning path is partial because required anchors are missing.",
      metadata: { factCount: 0, ruleCount: 0, partial: true, stored: false },
    };
  }

  const selection = input.selection ?? selectReasoningRules({ plan: input.plan, context: input.context });
  const maxSteps = input.maxSteps ?? 7;
  const domain = input.plan.domain;
  let built: { steps: ReasoningPathStep[]; missing: string[]; warnings: string[]; summary: string };
  if (input.plan.answerType === "exact_fact") built = buildExactFactSteps();
  else if (domain === "safety" || input.plan.blockedBySafety) built = buildSafetySteps(input.plan);
  else if (domain === "sleep") built = buildSleepSteps(input.plan, input.context, selection);
  else if (domain === "marriage") built = buildMarriageSteps(input.context, selection);
  else if (domain === "money") built = buildMoneySteps(input.context, selection);
  else if (domain === "foreign") built = buildForeignSteps(input.context, selection);
  else if (domain === "education") built = buildEducationSteps(input.context, selection);
  else if (domain === "career") built = buildCareerSteps(input.plan, input.context, selection);
  else built = buildGenericSteps(input.context, selection);

  const steps = built.steps.slice(0, maxSteps);
  const selectedRuleKeys = [...new Set(selection.selectedRules.map((match) => match.rule.ruleKey))];
  const selectedRuleIds = [...new Set(selection.selectedRules.map((match) => match.rule.id))];
  const missingAnchors = [...new Set(built.missing)];
  for (const missing of requiredFactsMissing(input.plan, input.context)) {
    if (!missingAnchors.includes(missing)) missingAnchors.push(missing);
  }
  const warnings = [...new Set([...built.warnings, ...(selection.metadata.warnings ?? []), ...(input.context.metadata.partial ? ["Retrieval context was partial; reasoning path may be incomplete."] : [])])];
  const summary = steps.length ? built.summary : "Reasoning path is partial because required anchors are missing.";

  return {
    domain,
    steps,
    selectedRuleKeys,
    selectedRuleIds,
    missingAnchors,
    warnings,
    summary,
    metadata: {
      factCount: input.context.chartFacts.length,
      ruleCount: selection.selectedRules.length,
      partial: Boolean(input.context.metadata.partial || steps.length === 0),
      stored: false,
    },
  };
}

function ensurePromiseLike<T>(value: T | PromiseLike<T>): Promise<T> {
  return Promise.resolve(value as T);
}

export async function storeReasoningPath(input: {
  supabase: SupabaseLikeClient;
  userId: string;
  profileId?: string | null;
  question: string;
  path: ReasoningPath;
  retrievalSnapshot?: Record<string, unknown>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!input.supabase || !input.userId || !input.question || !input.path) {
    return { ok: false, error: "missing storage input" };
  }
  try {
    const row = {
      user_id: input.userId,
      profile_id: input.profileId ?? null,
      question: input.question,
      domain: input.path.domain,
      selected_rule_ids: input.path.selectedRuleIds,
      path_steps: input.path.steps,
      retrieval_snapshot: input.retrievalSnapshot ?? {},
      metadata: {
        summary: input.path.summary,
        warnings: input.path.warnings,
        missingAnchors: input.path.missingAnchors,
      },
    };
    const table = input.supabase.from("astro_reasoning_paths") as unknown as TableChain;
    const inserted = await Promise.resolve(table.insert(row) as PromiseLike<InsertResult> | InsertResult);
    const selected = hasSelect(inserted) ? inserted.select("id") : inserted;
    const limited = hasLimit(selected) ? selected.limit(1) : selected;
    const result = await ensurePromiseLike(limited as PromiseLike<InsertResult> | InsertResult);
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    const id = data && typeof data === "object" && "id" in data ? String((data as Record<string, unknown>).id) : undefined;
    return { ok: !result.error, id, error: result.error?.message };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "failed to store reasoning path" };
  }
}

export {
  formatFactForStep,
  findFactByKey,
  findPlanetPlacement,
  findHouseFact,
  findHouseLordFact,
  findDashaFact,
  factsByDomainTags,
  buildCareerSteps,
};

export function buildDomainSpecificSteps(plan: RequiredDataPlan, context: RetrievalContext, selectedRules: ReasoningRuleSelection["selectedRules"]): ReasoningPathStep[] {
  const selection = { selectedRules, rejectedRules: [], metadata: { candidateCount: selectedRules.length, selectedCount: selectedRules.length, requiredFactKeys: [], retrievalTags: [], partial: false, warnings: [] }, selectedRuleIds: selectedRules.map((match) => match.rule.id), domain: plan.domain };
  const built = plan.domain === "career" ? buildCareerSteps(plan, context, selection as ReasoningRuleSelection) : plan.domain === "sleep" ? buildSleepSteps(plan, context, selection as ReasoningRuleSelection) : plan.domain === "marriage" ? buildMarriageSteps(context, selection as ReasoningRuleSelection) : plan.domain === "money" ? buildMoneySteps(context, selection as ReasoningRuleSelection) : plan.domain === "foreign" ? buildForeignSteps(context, selection as ReasoningRuleSelection) : plan.domain === "education" ? buildEducationSteps(context, selection as ReasoningRuleSelection) : buildGenericSteps(context, selection as ReasoningRuleSelection);
  return built.steps;
}
