import type {
  MonthlyActionSet,
  MonthlyGuidanceTheme,
} from "@/lib/astro/monthly/monthly-types";

const ACTIONS_BY_THEME: Record<MonthlyGuidanceTheme, MonthlyActionSet> = {
  discipline: {
    mainTheme: "Build stability through discipline and consistency.",
    emotionalTheme:
      "This month asks you to stay steady even when progress feels slower than expected.",
    careerFocus:
      "Focus on completing pending work, improving reliability, and avoiding impulsive career moves.",
    relationshipFocus:
      "Show consistency through actions rather than making promises under pressure.",
    avoid: [
      "Avoid rushed decisions from frustration.",
      "Avoid comparing your timing with others.",
      "Avoid leaving responsibilities half-finished.",
    ],
    doMoreOf: [
      "Keep one fixed routine.",
      "Finish delayed tasks.",
      "Make decisions after checking facts.",
    ],
    remedy:
      "Keep one simple routine for 21 to 40 days and complete unfinished responsibilities.",
  },
  growth: {
    mainTheme: "Use learning, guidance, and wise expansion.",
    emotionalTheme:
      "This month supports growth when confidence is balanced with patience and humility.",
    careerFocus:
      "Improve knowledge, seek mentorship, and choose opportunities that expand long-term value.",
    relationshipFocus:
      "Use honest guidance and mature conversation instead of assuming you already know the outcome.",
    avoid: [
      "Avoid overpromising.",
      "Avoid ignoring practical limits.",
      "Avoid taking advice from unreliable people.",
    ],
    doMoreOf: [
      "Study consistently.",
      "Speak to a mentor.",
      "Choose ethical and long-term paths.",
    ],
    remedy:
      "Read or study something meaningful daily and offer guidance or help where you can.",
  },
  communication: {
    mainTheme: "Create clarity through communication and planning.",
    emotionalTheme:
      "This month may feel mentally active, so clarity must be written down and checked.",
    careerFocus:
      "Update documents, improve communication, prepare for interviews, and reduce scattered work.",
    relationshipFocus:
      "Ask direct questions instead of reading too much into silence or mixed signals.",
    avoid: [
      "Avoid gossip.",
      "Avoid careless promises.",
      "Avoid multitasking so much that nothing finishes.",
    ],
    doMoreOf: [
      "Write down priorities.",
      "Clarify expectations.",
      "Follow up on pending communication.",
    ],
    remedy:
      "Write your top three tasks each morning and close one communication loop daily.",
  },
  emotional_clarity: {
    mainTheme: "Choose emotional clarity over reaction.",
    emotionalTheme:
      "This month asks you to understand your feelings without letting every feeling become a final decision.",
    careerFocus:
      "Do not let mood swings decide professional choices. Use a written plan.",
    relationshipFocus:
      "Observe consistency, respect, and emotional safety before deciding what the relationship means.",
    avoid: [
      "Avoid reacting instantly.",
      "Avoid assuming silence means rejection.",
      "Avoid making emotional ultimatums.",
    ],
    doMoreOf: [
      "Journal emotions.",
      "Sleep on major decisions.",
      "Ask calm direct questions.",
    ],
    remedy:
      "Journal for 10 minutes before sleep and reduce emotional overthinking at night.",
  },
  relationship_balance: {
    mainTheme: "Balance affection with self-respect and stability.",
    emotionalTheme:
      "This month highlights where closeness needs consistency, respect, and mature boundaries.",
    careerFocus:
      "Do not let relationship stress disturb basic responsibilities and work discipline.",
    relationshipFocus:
      "Choose steady communication, honest expectations, and practical compatibility over intensity alone.",
    avoid: [
      "Avoid chasing mixed signals.",
      "Avoid confusing attraction with commitment.",
      "Avoid deciding from fear of being alone.",
    ],
    doMoreOf: [
      "Notice repeated actions.",
      "Set respectful boundaries.",
      "Choose calm conversations.",
    ],
    remedy:
      "Keep your space clean and peaceful, and practice respectful communication daily.",
  },
  financial_stability: {
    mainTheme: "Strengthen money habits and reduce avoidable pressure.",
    emotionalTheme:
      "This month asks you to treat money with patience, structure, and realistic planning.",
    careerFocus:
      "Prioritize stable income work, practical skill-building, and careful commitments.",
    relationshipFocus:
      "Keep money conversations clear and avoid emotional spending for validation.",
    avoid: [
      "Avoid speculative risks.",
      "Avoid borrowing from panic.",
      "Avoid spending to escape stress.",
    ],
    doMoreOf: [
      "Track expenses.",
      "Reduce one avoidable cost.",
      "Build a small reserve.",
    ],
    remedy:
      "Track every expense for 21 days and make one disciplined saving decision each week.",
  },
  wellbeing: {
    mainTheme: "Support wellbeing through routine and grounded care.",
    emotionalTheme:
      "This month should be handled with steadiness, rest, and practical self-care.",
    careerFocus:
      "Keep work sustainable. Avoid overloading your schedule without recovery time.",
    relationshipFocus:
      "Do not use emotional pressure to carry every relationship issue alone.",
    avoid: [
      "Avoid ignoring symptoms.",
      "Avoid using astrology instead of medical advice.",
      "Avoid exhausting yourself to prove something.",
    ],
    doMoreOf: [
      "Rest properly.",
      "Maintain routine.",
      "Seek qualified help if symptoms are present.",
    ],
    remedy:
      "Keep a stable sleep routine and take health concerns to qualified professionals when needed.",
  },
  general: {
    mainTheme: "Move steadily and make decisions from clarity.",
    emotionalTheme:
      "This month is best used for calm observation, practical planning, and reducing unnecessary pressure.",
    careerFocus:
      "Focus on one useful improvement instead of trying to change everything at once.",
    relationshipFocus:
      "Look for consistency, respect, and peace rather than dramatic signs.",
    avoid: [
      "Avoid fear-based decisions.",
      "Avoid rushing for certainty.",
      "Avoid ignoring repeated patterns.",
    ],
    doMoreOf: [
      "Plan calmly.",
      "Finish one pending task.",
      "Choose the next practical step.",
    ],
    remedy:
      "Choose one small daily practice and keep it consistent for 21 days.",
  },
};

export function getMonthlyActionSet(
  theme: MonthlyGuidanceTheme,
): MonthlyActionSet {
  return ACTIONS_BY_THEME[theme] ?? ACTIONS_BY_THEME.general;
}

export function getAllMonthlyThemes(): MonthlyGuidanceTheme[] {
  return Object.keys(ACTIONS_BY_THEME) as MonthlyGuidanceTheme[];
}
