import type { Combination } from './CombinationsGrid';

interface AttributeValues {
  selectedValues: Array<{ value: string }>;
}

const combinationKey = (combination: Combination): string =>
  JSON.stringify([combination.primary, combination.secondary]);

export const buildPossibleCombinations = (
  attributes: AttributeValues[]
): Combination[] => {
  if (
    attributes.length === 0 ||
    attributes.some((attribute) => attribute.selectedValues.length === 0)
  ) {
    return [];
  }

  if (attributes.length === 1) {
    return attributes[0].selectedValues.map((value) => ({
      primary: value.value,
      secondary: '',
    }));
  }

  return attributes[0].selectedValues.flatMap((primaryValue) =>
    attributes[1].selectedValues.map((secondaryValue) => ({
      primary: primaryValue.value,
      secondary: secondaryValue.value,
    }))
  );
};

/**
 * Keeps the manager's explicit deselections while selecting only combinations
 * that became possible because a new attribute value was added.
 */
export const reconcileSelectedCombinations = (
  previousAttributes: AttributeValues[],
  nextAttributes: AttributeValues[],
  previousSelected: Combination[]
): Combination[] => {
  const previousPossibleKeys = new Set(
    buildPossibleCombinations(previousAttributes).map(combinationKey)
  );
  const previousSelectedKeys = new Set(previousSelected.map(combinationKey));

  return buildPossibleCombinations(nextAttributes).filter((combination) => {
    const key = combinationKey(combination);
    return previousSelectedKeys.has(key) || !previousPossibleKeys.has(key);
  });
};
