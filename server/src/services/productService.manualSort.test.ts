import { applyManualSortPositions } from './productService';

describe('applyManualSortPositions', () => {
  it('places manually positioned products without changing the baseline order of the rest', () => {
    const products = [
      { id: 'newest', newSortPosition: null },
      { id: 'second', newSortPosition: null },
      { id: 'chosen', newSortPosition: 2 },
      { id: 'oldest', newSortPosition: null },
    ];

    const ordered = applyManualSortPositions(products, 'newSortPosition');

    expect(ordered.map((product) => product.id)).toEqual(['newest', 'chosen', 'second', 'oldest']);
  });

  it('keeps the two manual sort modes independent', () => {
    const products = [
      { id: 'a', newSortPosition: 3, popularSortPosition: null },
      { id: 'b', newSortPosition: null, popularSortPosition: 2 },
      { id: 'c', newSortPosition: null, popularSortPosition: 1 },
    ];

    expect(applyManualSortPositions(products, 'newSortPosition').map((product) => product.id))
      .toEqual(['b', 'c', 'a']);
    expect(applyManualSortPositions(products, 'popularSortPosition').map((product) => product.id))
      .toEqual(['c', 'b', 'a']);
  });

  it('handles a stale duplicate position deterministically', () => {
    const products = [
      { id: 'a', popularSortPosition: 1 },
      { id: 'b', popularSortPosition: 1 },
      { id: 'c', popularSortPosition: null },
    ];

    const ordered = applyManualSortPositions(products, 'popularSortPosition');

    expect(ordered.map((product) => product.id)).toEqual(['a', 'b', 'c']);
  });
});
