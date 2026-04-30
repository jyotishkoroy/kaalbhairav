export type AnswerContract = {
  mustInclude: string[];
  mustNotInclude: string[];
  sections: string[];
};

export function buildAnswerContract(): AnswerContract {
  return { mustInclude: [], mustNotInclude: [], sections: [] };
}
