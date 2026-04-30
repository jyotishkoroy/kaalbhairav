export type AnswerValidationResult = {
  passed: boolean;
  failures: string[];
};

export function validateRagAnswer(): AnswerValidationResult {
  return { passed: true, failures: [] };
}
