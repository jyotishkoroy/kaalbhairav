export type LocalCriticResult = {
  used: false;
  shouldRetry: false;
  correctionInstruction: "";
};

export async function critiqueAnswerLocally(): Promise<LocalCriticResult> {
  return { used: false, shouldRetry: false, correctionInstruction: "" };
}
