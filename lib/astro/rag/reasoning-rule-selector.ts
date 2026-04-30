export type ReasoningRuleSelection = {
  selectedRuleIds: string[];
};

export function selectReasoningRules(): ReasoningRuleSelection {
  return { selectedRuleIds: [] };
}
