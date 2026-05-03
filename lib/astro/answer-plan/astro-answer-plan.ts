/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { VedicTopic } from "../rag/vedic-topic-classifier.ts";
import type { PublicChartFacts } from "../public-chart-facts.ts";
import { computeWholeSignHouse } from "../public-chart-facts.ts";

export type AstroAnswerPlan = {
  topic: VedicTopic;
  question: string;
  basisLine: string;
  requiredFacts: string[];
  natalFactors: Array<{ label: string; interpretation: string }>;
  timingFactors: Array<{ label: string; interpretation: string }>;
  practicalGuidance: string[];
  boundaries: string[];
  tone: "direct" | "gentle" | "reflective";
};

function ord(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

function houseOf(facts: PublicChartFacts, planet: "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Rahu" | "Ketu"): number | undefined {
  if (planet === "Sun") return facts.sunHouse ?? (facts.lagnaSign && facts.sunSign ? computeWholeSignHouse(facts.lagnaSign, facts.sunSign) : undefined);
  if (planet === "Moon") return facts.moonHouse ?? (facts.lagnaSign && facts.moonSign ? computeWholeSignHouse(facts.lagnaSign, facts.moonSign) : undefined);
  const pl = facts.placements[planet];
  if (!pl) return undefined;
  return pl.house ?? (facts.lagnaSign && pl.sign ? computeWholeSignHouse(facts.lagnaSign, pl.sign) : undefined);
}

function signOf(facts: PublicChartFacts, planet: "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Rahu" | "Ketu"): string | undefined {
  if (planet === "Sun") return facts.sunSign;
  if (planet === "Moon") return facts.moonSign;
  return facts.placements[planet]?.sign;
}

function planetDesc(facts: PublicChartFacts, planet: "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Rahu" | "Ketu"): string {
  const s = signOf(facts, planet);
  const h = houseOf(facts, planet);
  if (s && h) return `${planet} in ${s} in the ${ord(h)} house`;
  if (s) return `${planet} in ${s}`;
  if (h) return `${planet} in the ${ord(h)} house`;
  return planet;
}

function timingLine(facts: PublicChartFacts): string {
  if (facts.mahadasha && facts.antardashaNow) {
    return `${facts.mahadasha} Mahadasha, ${facts.antardashaNow} Antardasha${facts.antardashaEnd ? ` (until ${facts.antardashaEnd})` : ""}`;
  }
  if (facts.mahadasha) return `${facts.mahadasha} Mahadasha`;
  return "current dasha period";
}

function basisFor(facts: PublicChartFacts): string {
  const parts: string[] = [];
  if (facts.lagnaSign) parts.push(`${facts.lagnaSign} Lagna`);
  const mh = houseOf(facts, "Moon");
  if (facts.moonSign) parts.push(mh ? `${facts.moonSign} Moon in the ${ord(mh)} house` : `${facts.moonSign} Moon`);
  if (facts.nakshatra) parts.push(facts.nakshatraPada ? `${facts.nakshatra} Nakshatra Pada ${facts.nakshatraPada}` : facts.nakshatra);
  const timing = timingLine(facts);
  if (timing) parts.push(timing);
  return parts.join(", ");
}

export function buildAstroAnswerPlan(input: {
  question: string;
  topic: VedicTopic;
  facts: PublicChartFacts;
}): AstroAnswerPlan {
  const { question, topic, facts } = input;
  const basis = basisFor(facts);

  if (topic === "safety_death" || topic === "safety_medical" || topic === "safety_legal" || topic === "safety_financial" || topic === "security") {
    return { topic, question, basisLine: basis, requiredFacts: [], natalFactors: [], timingFactors: [], practicalGuidance: [], boundaries: ["Safety boundary applies. Do not give predictions."], tone: "gentle" };
  }

  if (topic === "career" || topic === "authority" || topic === "technology" || topic === "founder_business" || topic === "team") {
    const sunDesc = planetDesc(facts, "Sun");
    const moonDesc = planetDesc(facts, "Moon");
    const mercDesc = planetDesc(facts, "Mercury");
    const jupDesc = planetDesc(facts, "Jupiter");
    const sh = houseOf(facts, "Sun");
    const mh = houseOf(facts, "Moon");
    const natalFactors = [
      { label: sunDesc, interpretation: sh === 10 ? `${facts.sunSign ?? "Sun"} in the 10th house indicates career prominence, visible authority, and reputation built through sustained effort.` : `${facts.sunSign ?? "Sun"} placement shapes career identity and sense of authority.` },
      { label: moonDesc, interpretation: mh === 11 ? `${facts.moonSign ?? "Moon"} in the 11th house supports gains through networks, communities, communication, clients, and friendships.` : `${facts.moonSign ?? "Moon"} influences work relationships and emotional engagement at work.` },
    ];
    if (facts.placements["Mercury"]?.sign || facts.placements["Mercury"]?.house) {
      natalFactors.push({ label: mercDesc, interpretation: "Mercury supports written, analytical, or communication-based work streams." });
    }
    if (facts.placements["Jupiter"]?.sign || facts.placements["Jupiter"]?.house) {
      const jh = houseOf(facts, "Jupiter");
      natalFactors.push({ label: jupDesc, interpretation: jh === 9 ? "Jupiter in the 9th house supports mentors, higher learning, overseas connections, and long-term credibility." : "Jupiter expands through wisdom, learning, and principle-driven work." });
    }
    const timingFactors = [
      { label: timingLine(facts), interpretation: facts.mahadasha === "Jupiter" ? `Jupiter Mahadasha supports growth through knowledge, mentors, and expanded reach. ${facts.antardashaNow ? `The ${facts.antardashaNow} Antardasha${facts.antardashaEnd ? ` until ${facts.antardashaEnd}` : ""} may bring some detachment or internal pruning — this is a consolidation phase, not a permanent block.` : ""}` : `The ${timingLine(facts)} shapes the pace and direction of current efforts.` },
    ];
    const q = question.toLowerCase();
    const isBlocked = /blocked|stuck|not moving|nothing is working|fail/.test(q);
    const practicalGuidance = isBlocked ? [
      "Your chart does not show a permanently blocked career — blocks often feel most intense in Ketu sub-periods because Ketu strips away attachment and familiar patterns.",
      "Choose one clear direction and make your output visible. Your chart rewards demonstrated work over silent effort.",
      "Reach out to one senior or mentor for direct feedback this week.",
      "Publish or demonstrate concrete proof of progress, even in a small way.",
    ] : [
      "Your chart's strength lies in visible output, clear communication, and network-building.",
      `${facts.lagnaSign ?? "Your Lagna"} favors leadership by example over hierarchy alone.`,
      "Connect with peers, clients, and communities where your skills are directly applicable.",
    ];
    return { topic, question, basisLine: basis, requiredFacts: ["sunSign","sunHouse","moonSign","moonHouse","mahadasha","antardashaNow"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not guarantee income or promotions."], tone: "direct" };
  }

  if (topic === "relationship" || topic === "marriage") {
    const moonDesc = planetDesc(facts, "Moon");
    const venusDesc = planetDesc(facts, "Venus");
    const mh = houseOf(facts, "Moon");
    const vh = houseOf(facts, "Venus");
    const natalFactors = [
      { label: moonDesc, interpretation: mh === 11 ? `${facts.moonSign ?? "Moon"} in the 11th house brings emotional connection through friendship, conversation, and shared ideas. This pattern values mental compatibility highly.` : `${facts.moonSign ?? "Moon"} shapes emotional needs and communication style in relationships.` },
      { label: venusDesc, interpretation: vh === 12 ? "Venus in the 12th house brings a private, selective, or romantic inner world. Feelings may stay unexpressed unless trust is established." : `Venus placement shapes relationship style, comfort, and what you value in partnerships.` },
    ];
    const timingFactors = [
      { label: timingLine(facts), interpretation: facts.antardashaNow?.includes("Ketu") ? "Ketu Antardasha can bring emotional detachment, confusion, or re-evaluation in relationships. This is not a signal that the relationship is wrong — it is a time to release old patterns." : `The ${timingLine(facts)} influences the emotional mood and timing of relationship events.` },
    ];
    const mangal = facts.mangalDosha;
    const q = question.toLowerCase();
    const practicalGuidance: string[] = [
      facts.moonSign ? `Your ${facts.moonSign} Moon values clear conversation, patience, and mental connection. Avoid jumping to conclusions from silence or delays.` : "Stay patient and communicate clearly.",
      mangal === false ? "Your chart does not show Mangal Dosha — do not treat ordinary relationship delays as a permanent blockage." : "Use this period to understand your emotional patterns, not to force outcomes.",
      "Keep interactions calm, clear, and low-pressure today. Sarcasm and urgency tend to backfire.",
    ];
    if (/today|this week|right now/.test(q)) {
      practicalGuidance.unshift(`Based on ${basis}, today is better suited for calm, clear communication than emotional pressure or testing.`);
    }
    return { topic, question, basisLine: basis, requiredFacts: ["moonSign","moonHouse","mangalDosha","antardashaNow"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not predict marriage timing or guarantee compatibility."], tone: "gentle" };
  }

  if (topic === "dasha" || topic === "annual_timing") {
    const natalFactors = [
      { label: `${facts.mahadasha ?? "Current"} Mahadasha`, interpretation: facts.mahadasha === "Jupiter" ? `Jupiter Mahadasha (${facts.mahadashaStart ?? "ongoing"} to ${facts.mahadashaEnd ?? "future"}) is the longest growth arc — it supports expansion through learning, mentors, higher purpose, and long-distance connections.` : `The ${facts.mahadasha} Mahadasha shapes the dominant theme of this chapter in your life.` },
    ];
    if (facts.antardashaNow) {
      natalFactors.push({
        label: `${facts.antardashaNow} Antardasha${facts.antardashaEnd ? ` (until ${facts.antardashaEnd})` : ""}`,
        interpretation: facts.antardashaNow?.includes("Ketu") ? "Ketu Antardasha brings a period of detachment, simplification, and re-evaluation. External progress may feel slower. Internal clarity often emerges. It ends, and what remains afterward is usually more aligned." : facts.antardashaNow?.includes("Venus") ? "Venus Antardasha brings ease, creativity, relationship warmth, and social connection." : `The ${facts.antardashaNow} Antardasha modifies the Mahadasha's energy for this sub-period.`,
      });
    }
    const timingFactors = [
      { label: "Current moment", interpretation: `On today's date, the active saved timing is ${timingLine(facts)}.` },
    ];
    const practicalGuidance = [
      "Use the Mahadasha period for long-term investment in knowledge, relationships, and principled work.",
      facts.antardashaNow?.includes("Ketu") ? "During Ketu sub-period: simplify, release what isn't working, and do not make impulsive major changes." : "Use this sub-period's energy intentionally.",
      "The end of this sub-period will bring a shift in pace — prepare gradually rather than reacting suddenly.",
    ];
    return { topic, question, basisLine: basis, requiredFacts: ["mahadasha","mahadashaStart","mahadashaEnd","antardashaNow","antardashaEnd"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not predict specific events or guarantee timing."], tone: "reflective" };
  }

  if (topic === "finance") {
    const moonDesc = planetDesc(facts, "Moon");
    const venusDesc = planetDesc(facts, "Venus");
    const vh = houseOf(facts, "Venus");
    const mh = houseOf(facts, "Moon");
    const natalFactors = [
      { label: moonDesc, interpretation: mh === 11 ? `${facts.moonSign ?? "Moon"} in the 11th house supports income and gains through networks, communities, and recurring relationships.` : `${facts.moonSign ?? "Moon"} shapes how you relate to income and financial security.` },
      { label: venusDesc, interpretation: vh === 12 ? "Venus in the 12th can increase comfort-spending or investment in private/foreign areas — watch for unconscious over-spending." : "Venus shapes financial values and comfort thresholds." },
    ];
    const timingFactors = [{ label: timingLine(facts), interpretation: `The ${timingLine(facts)} period influences financial pace and opportunity.` }];
    const practicalGuidance = ["Focus income growth on networks, communication, and recurring client work.", "Track spending patterns — especially comfort or luxury items — and set clear limits.", "This period favors sustainable growth over speculative risk."];
    return { topic, question, basisLine: basis, requiredFacts: ["moonSign","moonHouse","mahadasha"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not guarantee income amounts or investment returns."], tone: "direct" };
  }

  if (topic === "spiritual" || topic === "teaching" || topic === "education") {
    const jupDesc = planetDesc(facts, "Jupiter");
    const jh = houseOf(facts, "Jupiter");
    const natalFactors = [
      { label: facts.nakshatra ? `${facts.nakshatra} Nakshatra${facts.nakshatraPada ? ` Pada ${facts.nakshatraPada}` : ""}` : "Nakshatra", interpretation: `${facts.nakshatra ?? "Your birth nakshatra"} supports inquiry, comparison, and the search for meaning.` },
      { label: jupDesc, interpretation: jh === 9 ? "Jupiter in the 9th house is strongly placed for higher learning, philosophy, spiritual study, teaching, and long-distance guidance." : "Jupiter expands through teaching, learning, and wisdom." },
    ];
    const timingFactors = [{ label: timingLine(facts), interpretation: `${facts.mahadasha === "Jupiter" ? "Jupiter Mahadasha is especially supportive of spiritual and academic growth." : `The ${timingLine(facts)} shapes the current pace of learning and inner development.`}` }];
    const practicalGuidance = ["Deepen one practice or area of study consistently rather than sampling many at once.", "Seek one teacher or mentor whose framework you can examine critically.", "Writing down insights — even briefly — makes intuitions more lasting."];
    return { topic, question, basisLine: basis, requiredFacts: ["nakshatra","mahadasha"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not predict spiritual awakening or guarantee outcomes."], tone: "reflective" };
  }

  if (topic === "remedies") {
    return {
      topic, question, basisLine: basis, requiredFacts: [],
      natalFactors: [{ label: "Chart basis", interpretation: `Based on ${basis}, remedies should be practical, low-cost, and aligned with building discipline and clarity.` }],
      timingFactors: [{ label: timingLine(facts), interpretation: "Simple daily practices are more effective than expensive one-time rituals during this period." }],
      practicalGuidance: ["Simplify your daily routine: fix sleep, meals, and a short morning practice.", "Be careful with commitments — speak fewer words and keep the ones you speak.", "Avoid expensive gemstones or fear-based rituals. Discipline and consistency are the most effective remedies for this chart."],
      boundaries: ["Do not prescribe specific gemstones, mantras, or puja routines. Recommend only general discipline."],
      tone: "gentle",
    };
  }

  if (topic === "personality") {
    const natalFactors = [
      { label: facts.lagnaSign ? `${facts.lagnaSign} Lagna` : "Lagna", interpretation: facts.lagnaSign === "Leo" ? "Leo Lagna gives natural presence, a strong sense of identity, and a need to be seen for genuine effort and character — not just output." : `${facts.lagnaSign ?? "Your Lagna"} shapes your fundamental approach to life and how others initially perceive you.` },
      { label: facts.moonSign ? `${facts.moonSign} Moon` : "Moon", interpretation: facts.moonSign === "Gemini" ? "Gemini Moon adds adaptability, curiosity, and a dual nature — able to see multiple sides, but can overthink when uncertain." : `${facts.moonSign ?? "Your Moon"} shapes your emotional nature and habitual response patterns.` },
      { label: facts.nakshatra ? `${facts.nakshatra} Nakshatra` : "Nakshatra", interpretation: facts.nakshatra?.includes("Mrigasira") ? "Mrigasira gives a searching, restless quality — always looking for something more perfect, more aligned. This drives both creativity and over-analysis." : `${facts.nakshatra ?? "Your Nakshatra"} shapes your temperament and instinctual patterns.` },
    ];
    const timingFactors = [{ label: timingLine(facts), interpretation: `The ${timingLine(facts)} influences how your natural traits are expressed in this phase.` }];
    const practicalGuidance = ["Work with your strengths deliberately: your chart rewards demonstrated skill and visible presence.", "Watch the restless-searching pattern — it can scatter energy across too many simultaneous projects.", "Rest and simplification are genuinely useful, not signs of weakness."];
    return { topic, question, basisLine: basis, requiredFacts: ["lagnaSign","moonSign","nakshatra"], natalFactors, timingFactors, practicalGuidance, boundaries: [], tone: "reflective" };
  }

  if (topic === "mind") {
    const natalFactors = [
      { label: facts.moonSign ? `${facts.moonSign} Moon` : "Moon", interpretation: facts.moonSign === "Gemini" ? "Gemini Moon creates an active, quick-processing mind that thrives on variety but struggles with rumination when inputs are overwhelming." : `${facts.moonSign ?? "Your Moon"} shapes emotional processing and mental patterns.` },
      { label: facts.nakshatra ? `${facts.nakshatra} Nakshatra` : "Nakshatra", interpretation: facts.nakshatra?.includes("Mrigasira") ? "Mrigasira can keep the mind searching for certainty where none exists — turning a strength into a source of mental restlessness if not managed consciously." : `${facts.nakshatra ?? "Your Nakshatra"} shapes habitual mental tendencies.` },
    ];
    const timingFactors = [{ label: timingLine(facts), interpretation: facts.antardashaNow?.includes("Ketu") ? "Ketu Antardasha tends to amplify feelings of confusion or purposelessness temporarily. This is normal for this sub-period — it passes." : `The ${timingLine(facts)} shapes the emotional tone of this phase.` }];
    const practicalGuidance = ["Reduce open loops: write down everything you are tracking so your mind does not loop through it passively.", "One focused task at a time. Your chart benefits from depth over breadth.", "Short physical activity or time outdoors helps reset Gemini Moon's tendency to over-process."];
    return { topic, question, basisLine: basis, requiredFacts: ["moonSign","nakshatra","antardashaNow"], natalFactors, timingFactors, practicalGuidance, boundaries: ["Do not diagnose anxiety or mental health conditions."], tone: "gentle" };
  }

  if (topic === "health") {
    return {
      topic, question, basisLine: basis, requiredFacts: [],
      natalFactors: [{ label: "Chart vitality basis", interpretation: `${facts.lagnaSign ?? "Your Lagna"} and Moon placement shape energy levels and recovery rhythms.` }],
      timingFactors: [{ label: timingLine(facts), interpretation: `The ${timingLine(facts)} can affect energy and immunity — use this period to stabilize routines rather than push to extremes.` }],
      practicalGuidance: ["Maintain consistent sleep and meal timing — this is the simplest and most effective health anchor.", "Do not ignore persistent issues; consult a medical professional for symptoms.", "Reduce stimulant overload (screens, caffeine late in day) during Ketu sub-periods especially."],
      boundaries: ["Do not diagnose illness or prescribe treatment. Always refer to medical professionals."],
      tone: "gentle",
    };
  }

  if (topic === "family") {
    return {
      topic, question, basisLine: basis, requiredFacts: [],
      natalFactors: [{ label: "Family dynamics basis", interpretation: `${facts.lagnaSign ?? "Your Lagna"} and Moon placement shape how you relate to family members and household dynamics.` }],
      timingFactors: [{ label: timingLine(facts), interpretation: `The ${timingLine(facts)} influences emotional tone in family interactions right now.` }],
      practicalGuidance: ["Approach family conversations with patience and clarity — your Moon benefits from calm, explicit communication.", "Avoid assuming others know your needs; state them directly.", "Use this period to stabilize recurring patterns rather than force sudden changes."],
      boundaries: ["Do not predict specific family events or guarantee outcomes."],
      tone: "gentle",
    };
  }

  if (topic === "foreign") {
    const jupDesc = planetDesc(facts, "Jupiter");
    const jh = houseOf(facts, "Jupiter");
    return {
      topic, question, basisLine: basis, requiredFacts: ["mahadasha"],
      natalFactors: [
        { label: jupDesc, interpretation: jh === 9 ? "Jupiter in the 9th house is strongly associated with long-distance travel, foreign connections, and opportunities abroad." : "Jupiter shapes opportunities for travel and foreign links." },
      ],
      timingFactors: [{ label: timingLine(facts), interpretation: facts.mahadasha === "Jupiter" ? "Jupiter Mahadasha is an active period for foreign connections, study abroad, and distant opportunities." : `The ${timingLine(facts)} shapes the current pace of foreign and travel opportunities.` }],
      practicalGuidance: ["Actively pursue connections with people in distant locations or different cultural contexts.", "Documentation, applications, and planning for foreign moves benefit from early preparation.", "This period rewards building visible credentials that transfer across borders."],
      boundaries: ["Do not guarantee visa approval, job offers, or relocation outcomes."],
      tone: "direct",
    };
  }

  if (topic === "sade_sati" || topic === "panoti") {
    return {
      topic, question, basisLine: basis, requiredFacts: [],
      natalFactors: [{ label: "Saturn transit basis", interpretation: `Based on ${facts.lagnaSign ?? "your Lagna"} and ${facts.moonSign ?? "Moon sign"}, current Saturn transits should be checked against a live transit table for your chart.` }],
      timingFactors: [{ label: timingLine(facts), interpretation: "The current Mahadasha and Antardasha interact with any transit effects." }],
      practicalGuidance: ["Focus on disciplined work, responsibility, and patience — these are Saturn's natural remedies.", "Sade Sati and Panoti are periods of restructuring, not necessarily destruction.", "Avoid major impulsive changes; slow and steady progress works best during Saturn's transit influence."],
      boundaries: ["Do not predict exact Sade Sati dates without a live transit calculation."],
      tone: "gentle",
    };
  }

  if (topic === "dosha") {
    const mangal = facts.mangalDosha;
    const kalsarpa = facts.kalsarpaYoga;
    const natalFactors = [];
    if (mangal !== undefined) natalFactors.push({ label: "Mangal Dosha", interpretation: mangal ? "Mangal Dosha is present. This does not doom any relationship — it indicates Mars energy that benefits from a compatible partner and conscious management." : "Mangal Dosha is not present in this chart. Do not frame relationship difficulties as caused by this yoga." });
    if (kalsarpa !== undefined) natalFactors.push({ label: "Kalsarpa Yoga", interpretation: kalsarpa ? "Kalsarpa Yoga is present. This period can feel intense but also brings singular focus and persistence when channeled constructively." : "Kalsarpa Yoga is not present in this chart." });
    return {
      topic, question, basisLine: basis, requiredFacts: ["mangalDosha","kalsarpaYoga"],
      natalFactors: natalFactors.length ? natalFactors : [{ label: "Yoga analysis", interpretation: "The saved chart data should contain yoga analysis. If not present, a recalculation may be needed." }],
      timingFactors: [{ label: timingLine(facts), interpretation: "Yogas are natal — they do not disappear — but their expression varies by Dasha period." }],
      practicalGuidance: ["Yogas describe tendencies, not fixed destinies.", "Focus on using the energy constructively rather than treating yogas as obstacles."],
      boundaries: ["Do not guarantee yoga effects or predict specific events caused by yogas."],
      tone: "direct",
    };
  }

  if (topic === "planet_placement") {
    return {
      topic, question, basisLine: basis, requiredFacts: ["lagnaSign","moonSign","sunSign"],
      natalFactors: [
        { label: facts.moonSign ? `${facts.moonSign} Moon${facts.moonHouse ? ` in the ${ord(facts.moonHouse)} house` : ""}` : "Moon placement", interpretation: `${facts.moonSign ?? "Moon"} in the ${facts.moonHouse ? ord(facts.moonHouse) : "relevant"} house shapes emotional processing, networks, and communication style.` },
        { label: facts.sunSign ? `${facts.sunSign} Sun${facts.sunHouse ? ` in the ${ord(facts.sunHouse)} house` : ""}` : "Sun placement", interpretation: `${facts.sunSign ?? "Sun"} in the ${facts.sunHouse ? ord(facts.sunHouse) : "relevant"} house shapes career identity, authority, and visibility.` },
      ],
      timingFactors: [{ label: timingLine(facts), interpretation: `Placements express through ${timingLine(facts)} in this period.` }],
      practicalGuidance: ["Each placement has both strengths and challenges — focus on the strengths for this question."],
      boundaries: [],
      tone: "reflective",
    };
  }

  // Default: general
  const natalFactors = [
    { label: facts.lagnaSign ? `${facts.lagnaSign} Lagna` : "Lagna", interpretation: facts.lagnaSign ? `${facts.lagnaSign} Lagna shapes your overall approach, identity, and how you engage with the world.` : "Your Lagna shapes your fundamental approach to life." },
    { label: facts.moonSign ? `${facts.moonSign} Moon${facts.moonHouse ? ` in the ${ord(facts.moonHouse)} house` : ""}` : "Moon", interpretation: facts.moonSign ? `${facts.moonSign} Moon brings its emotional quality to this area of life.` : "Your Moon shapes emotional processing and habitual responses." },
  ];
  if (facts.nakshatra) {
    natalFactors.push({ label: `${facts.nakshatra} Nakshatra${facts.nakshatraPada ? ` Pada ${facts.nakshatraPada}` : ""}`, interpretation: `${facts.nakshatra} gives a particular searching and comparative quality to your natural temperament.` });
  }
  const timingFactors = [{ label: timingLine(facts), interpretation: `The ${timingLine(facts)} provides context and timing for this question.` }];
  const q = question.toLowerCase();
  const practicalGuidance = /today|this week|right now/.test(q) ? [
    `Based on ${basis}, today favors calm, focused effort over scattered activity.`,
    "One clear priority is more effective than multiple competing ones right now.",
    `${facts.antardashaNow?.includes("Ketu") ? "During Ketu sub-period, simplicity and discipline pay more than ambition and expansion." : "Stay consistent with your current commitments."}`,
  ] : [
    "Your chart's recurring strength is in communication, visible effort, and building genuine expertise.",
    "Focus on what is within your direct control this week.",
    `${facts.mahadasha === "Jupiter" ? "Jupiter Mahadasha rewards learning, mentors, and long-horizon thinking." : `The ${facts.mahadasha ?? "current"} Mahadasha shapes what kind of effort is most rewarded now.`}`,
  ];
  return { topic, question, basisLine: basis, requiredFacts: ["lagnaSign","moonSign","nakshatra","mahadasha"], natalFactors, timingFactors, practicalGuidance, boundaries: [], tone: "direct" };
}
