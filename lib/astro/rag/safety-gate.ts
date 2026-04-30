export type RagSafetyGateResult = {
  allowed: boolean;
  riskFlags: string[];
  restrictions: string[];
  source: "deterministic";
};

export function ragSafetyGate(_question: string): RagSafetyGateResult {
  void _question;
  return { allowed: true, riskFlags: [], restrictions: [], source: "deterministic" };
}
