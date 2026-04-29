export type SafetyRisk = {
  selfHarm: boolean
  medical: boolean
  death: boolean
  legal: boolean
  pregnancy: boolean
  fearBased: boolean
  gemstone: boolean
}

export type SafetyRiskName = keyof SafetyRisk

export type SafetyClassification = {
  risk: SafetyRisk
  riskNames: SafetyRiskName[]
  hasRisk: boolean
}

const RISK_PATTERNS: Record<SafetyRiskName, RegExp[]> = {
  selfHarm: [
    /\b(suicide|kill myself|end my life|self harm|self-harm|harm myself)\b/i,
  ],
  medical: [
    /\b(disease|cancer|illness|diagnose|diagnosis|doctor|medical|hospital|symptom|treatment|serious disease)\b/i,
  ],
  death: [
    /\b(death|die|when will i die|lifespan|life span|death date|longevity)\b/i,
  ],
  legal: [
    /\b(court|case|jail|prison|legal|lawsuit|police|arrest)\b/i,
  ],
  pregnancy: [
    /\b(pregnant|pregnancy|conceive|miscarriage|fertility)\b/i,
  ],
  fearBased: [
    /\b(cursed|curse|black magic|evil eye|doomed|never marry|ruined)\b/i,
  ],
  gemstone: [
    /\b(blue sapphire|neelam|gemstone|stone|wear.*sapphire|wear.*gem)\b/i,
  ],
}

export function detectSafetyRisk(message: string): SafetyRisk {
  return {
    selfHarm: RISK_PATTERNS.selfHarm.some((pattern) => pattern.test(message)),
    medical: RISK_PATTERNS.medical.some((pattern) => pattern.test(message)),
    death: RISK_PATTERNS.death.some((pattern) => pattern.test(message)),
    legal: RISK_PATTERNS.legal.some((pattern) => pattern.test(message)),
    pregnancy: RISK_PATTERNS.pregnancy.some((pattern) => pattern.test(message)),
    fearBased: RISK_PATTERNS.fearBased.some((pattern) =>
      pattern.test(message),
    ),
    gemstone: RISK_PATTERNS.gemstone.some((pattern) => pattern.test(message)),
  }
}

export function classifySafety(message: string): SafetyClassification {
  const risk = detectSafetyRisk(message)
  const riskNames = Object.entries(risk)
    .filter(([, value]) => value)
    .map(([key]) => key as SafetyRiskName)

  return {
    risk,
    riskNames,
    hasRisk: riskNames.length > 0,
  }
}
