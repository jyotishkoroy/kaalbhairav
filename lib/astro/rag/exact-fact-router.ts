export type ExactFactRouterResult = {
  answered: boolean;
  answer: string | null;
  factKeys: string[];
  source: "deterministic";
};

export function answerExactFactIfPossible(_question: string): ExactFactRouterResult {
  void _question;
  return { answered: false, answer: null, factKeys: [], source: "deterministic" };
}
