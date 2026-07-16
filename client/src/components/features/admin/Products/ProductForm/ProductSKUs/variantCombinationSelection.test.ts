import { describe, expect, it } from 'vitest';
import { reconcileSelectedCombinations } from './variantCombinationSelection';

describe('reconcileSelectedCombinations', () => {
  it('preserves deselected combinations and selects only combinations for a new shade', () => {
    const previousAttributes = [
      { selectedValues: [{ value: 'Red' }] },
      { selectedValues: [{ value: 'Small' }, { value: 'Large' }] },
    ];
    const nextAttributes = [
      { selectedValues: [{ value: 'Red' }, { value: 'Blue' }] },
      { selectedValues: [{ value: 'Small' }, { value: 'Large' }] },
    ];
    const previousSelected = [{ primary: 'Red', secondary: 'Small' }];

    expect(
      reconcileSelectedCombinations(
        previousAttributes,
        nextAttributes,
        previousSelected
      )
    ).toEqual([
      { primary: 'Red', secondary: 'Small' },
      { primary: 'Blue', secondary: 'Small' },
      { primary: 'Blue', secondary: 'Large' },
    ]);
  });

  it('removes combinations that are no longer possible', () => {
    const previousAttributes = [
      { selectedValues: [{ value: 'Red' }, { value: 'Blue' }] },
    ];
    const nextAttributes = [{ selectedValues: [{ value: 'Blue' }] }];

    expect(
      reconcileSelectedCombinations(previousAttributes, nextAttributes, [
        { primary: 'Red', secondary: '' },
        { primary: 'Blue', secondary: '' },
      ])
    ).toEqual([{ primary: 'Blue', secondary: '' }]);
  });
});
