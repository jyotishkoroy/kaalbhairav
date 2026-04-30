export type GroqAnswerWriterResult = {
  used: false;
  answer: null;
};

export async function writeGroqRagAnswer(): Promise<GroqAnswerWriterResult> {
  return { used: false, answer: null };
}
