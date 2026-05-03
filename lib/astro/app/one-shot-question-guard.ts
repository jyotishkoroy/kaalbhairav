/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroQuestionGuardResult =
  | { allowed: true; normalizedQuestion: string }
  | { allowed: false; code: string; answer: string }

const MODEL_SERVER_PATTERNS: RegExp[] = [
  /\bai\s*model\b/i,
  /\bwhich\s+model\b/i,
  /\bwhat\s+model\b/i,
  /\bllm\b/i,
  /\bgroq\b/i,
  /\bollama\b/i,
  /\bopenai\b/i,
  /\bgpt[-\s]?\d/i,
  /\bgemini\b/i,
  /\bserver\b/i,
  /\bvercel\b/i,
  /\bsupabase\b/i,
  /\bdatabase\b/i,
  /\bapi\s*key\b/i,
  /\bendpoint\b/i,
  /\bsource\s*code\b/i,
  /\bsystem\s*prompt\b/i,
  /\bprompt\s*injection\b/i,
  /\bdeveloper\s*message\b/i,
  /\btools?\s+used\b/i,
  /\barchitecture\b/i,
  /\blogs?\b/i,
  /\benvironment\b/i,
  /\benv\s+var\b/i,
  /\btoken\s+limit\b/i,
  /\bsecret\b/i,
  /\bhow\s+are\s+you\s+built\b/i,
  /\bwhat\s+(technology|tech)\b/i,
  /\bbackend\b/i,
  /\binfrastructure\b/i,
  /\bignore\s+(previous|prior|all)\s+instructions?\b/i,
  /\brepeat\s+the\s+(system|prompt)\b/i,
  /\bwhat\s+is\s+your\s+prompt\b/i,
  /\breveal\b.{0,40}\b(prompt|instruction|message|context|data)\b/i,
  /\bshow\b.{0,30}\b(logs?|prompt|system\s+message|developer\s+message|tool\s+call)\b/i,
  /\bleak\s+(database|data|profile|key|token|secret)\b/i,
  /\bbypass\s+(safety|security|filter|guard|restriction)\b/i,
  /\bact\s+as\s+(admin|root|developer|god|superuser)\b/i,
  /\bphishing\b/i,
  /\bclone\s+login\b/i,
  /\bsteal\s+(password|session|cookie|token)\b/i,
  /\bsession\s+cookie\b/i,
  /\bauth\s*token\b/i,
  /\bsupabase\s+key\b/i,
  /\bservice\s+role\b/i,
  /\benvironment\s+variable\b/i,
  /\bcross.site\b/i,
  /\bsql\s+inject/i,
  /\bexec\s*(ute)?\s*\(/i,
]

const COMPATIBILITY_PATTERNS: RegExp[] = [
  /\bcompatibility\b/i,
  /\bkundli\s*(match(ing)?|milan)\b/i,
  /\bsynastry\b/i,
  /\bpartner\s*(chart|birth)\b/i,
  /\bspouse\s*(chart|birth)\b/i,
  /\banother\s+person('s)?\s+birth\b/i,
  /\bboyfriend('s)?\s+birth\b/i,
  /\bgirlfriend('s)?\s+birth\b/i,
  /\bhusband('s)?\s+birth\b/i,
  /\bwife('s)?\s+birth\b/i,
  /\bcompare\s+(my\s+)?chart\s+with\b/i,
  /\bmarriage\s+compatibility\s+with\b/i,
  /\brelationship\s+compatibility\s+with\b/i,
  /\b(born\s+on|birth\s+date\s+of)\s+\d{4}/i,
  /\b(his|her|their)\s+birth\s+(date|time|place)\b/i,
  /\benter\s+(his|her|their|another|partner)\b/i,
  /\bsecond\s+person\s+birth\b/i,
]

const FILE_IMAGE_PATTERNS: RegExp[] = [
  /\bupload\s*(photo|picture|image|pdf|file|document|screenshot|kundli|chart)\b/i,
  /\bread\s*(this\s+)?(pdf|file|document|image)\b/i,
  /\banalyze\s*(image|photo|picture|screenshot|pdf|document|kundli|chart)\b/i,
  /\bkundli\s*screenshot\b/i,
  /\battachment\b/i,
  /\bsend\s*(photo|image|file|pdf)\b/i,
  /\bshare\s*(photo|image|file|pdf|document)\b/i,
]

// Devanagari script block (Hindi, Marathi, Sanskrit, Nepali)
const DEVANAGARI_RE = /[ऀ-ॿ]/

// Bengali script block
const BENGALI_RE = /[ঀ-৿]/

// Other non-Latin script blocks
const NON_LATIN_SCRIPT_RE = /[؀-ۿЀ-ӿ一-鿿぀-ヿ가-힯฀-๿]/

// Common Hinglish / Banglish romanized words that indicate non-English content
const HINGLISH_BANGLISH_PATTERNS: RegExp[] = [
  // Hindi romanized
  /\bkya\b/i,
  /\bkaise\b/i,
  /\bkab\b(?!\s*uli)/i,
  /\bmera\b/i,
  /\bmeri\b/i,
  /\bmujhe\b/i,
  /\bshaadi\b/i,
  /\bpaisa\b/i,
  /\bnaukri\b/i,
  /\bhoga\b/i,
  /\bhogi\b/i,
  /\bhoge\b/i,
  /\bkaro\b/i,
  /\bkarna\b/i,
  /\bkarta\b/i,
  /\bkarti\b/i,
  /\baapka\b/i,
  /\baapki\b/i,
  /\btumhara\b/i,
  /\btumhari\b/i,
  // Bengali romanized
  /\bbhalo\b/i,
  /\bkeno\b/i,
  /\bamar\b(?!\s+is|\s+god|\s+will|\s+lov)/i,
  /\btomar\b/i,
  /\bhobe\b/i,
  /\bkorbo\b/i,
  /\bami\b(?!\s+in|\s+is|\s+go|\s+ready|\s+sure|\s+not)/i,
  /\btumi\b/i,
  /\bkobe\b/i,
  /\bbiye\b/i,
  /\bchakri\b/i,
  /\bkothay\b/i,
  /\bkemon\b/i,
]

// Safe Vedic/Sanskrit terms written in English — not to be blocked
const SAFE_VEDIC_TERMS = new Set([
  'karma', 'puja', 'mantra', 'dharma', 'guru', 'kundali', 'kundli',
  'dasha', 'rashi', 'nakshatra', 'lagna', 'rahu', 'ketu', 'shani',
  'mangal', 'budha', 'shukra', 'surya', 'chandra', 'antardasha',
  'mahadasha', 'panchang', 'panchanga', 'navamsa', 'ashtakvarga',
  'vimshottari', 'jyotish', 'jyotisha', 'bhava', 'graha', 'yoga',
])

function hasOnlySymbolsOrEmoji(s: string): boolean {
  // After removing spaces, punctuation, and emoji, nothing meaningful remains
  const stripped = s.replace(/[\s\p{P}\p{S}\p{So}]/gu, '')
  return stripped.length === 0
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function guardOneShotAstroQuestion(question: string): AstroQuestionGuardResult {
  if (typeof question !== 'string') {
    return {
      allowed: false,
      code: 'invalid_input',
      answer: 'aadesh: Please ask one text question based on your own birth profile.',
    }
  }

  const normalized = normalizeWhitespace(question)

  if (!normalized || normalized.length < 2) {
    return {
      allowed: false,
      code: 'empty_question',
      answer: 'aadesh: Please enter a question to receive guidance.',
    }
  }

  if (normalized.length > 2000) {
    return {
      allowed: false,
      code: 'question_too_long',
      answer: 'aadesh: Your question is too long. Please ask one focused question.',
    }
  }

  // Block emoji/symbol-only input
  if (hasOnlySymbolsOrEmoji(normalized)) {
    return {
      allowed: false,
      code: 'malformed_question',
      answer: 'aadesh: Please ask a question in English text.',
    }
  }

  // Block non-Latin scripts
  if (DEVANAGARI_RE.test(normalized) || BENGALI_RE.test(normalized) || NON_LATIN_SCRIPT_RE.test(normalized)) {
    return {
      allowed: false,
      code: 'language_blocked',
      answer:
        'aadesh: Please ask in English only. Tarayai currently does not support Hindi, Bengali, Hinglish, Banglish, or other languages in the Ask Guru window.',
    }
  }

  // Block Hinglish/Banglish romanized patterns
  for (const pattern of HINGLISH_BANGLISH_PATTERNS) {
    if (pattern.test(normalized)) {
      // Make sure it's not a safe Vedic term or common English word
      const matchArr = normalized.match(pattern)
      const matchWord = matchArr ? matchArr[0].toLowerCase() : ''
      if (!SAFE_VEDIC_TERMS.has(matchWord)) {
        return {
          allowed: false,
          code: 'language_blocked',
          answer:
            'aadesh: Please ask in English only. Tarayai currently does not support Hindi, Bengali, Hinglish, Banglish, or other languages in the Ask Guru window.',
        }
      }
    }
  }

  for (const pattern of MODEL_SERVER_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        code: 'model_server_blocked',
        answer:
          'aadesh: I can answer astrology guidance from your saved birth profile, but I cannot help with bypassing safety, accessing private data, credentials, prompts, tools, logs, or system internals.',
      }
    }
  }

  for (const pattern of COMPATIBILITY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        code: 'compatibility_blocked',
        answer:
          'aadesh: Tarayai uses only your saved birth profile for one-person guidance. It cannot compare another person’s chart or process another person’s birth details.',
      }
    }
  }

  for (const pattern of FILE_IMAGE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        code: 'file_image_blocked',
        answer:
          'aadesh: Tarayai does not accept pictures, documents, screenshots, or uploaded charts. Please ask one text question based on your own saved birth profile.',
      }
    }
  }

  return { allowed: true, normalizedQuestion: normalized }
}
