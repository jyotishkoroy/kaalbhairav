export type RequiredDataPlan = {
  requiredFacts: string[];
  optionalFacts: string[];
  needsTiming: boolean;
};

export function planRequiredData(): RequiredDataPlan {
  return { requiredFacts: [], optionalFacts: [], needsTiming: false };
}
