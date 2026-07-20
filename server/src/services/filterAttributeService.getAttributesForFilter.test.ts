jest.mock('../models/FilterAttribute', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('../models/Sku', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock('../middleware/dynamicValidation', () => ({
  clearValidationCache: jest.fn(),
}));

jest.mock('../utils/colorFamilyDetector', () => ({
  loadColorFamilies: jest.fn(() => []),
  refreshColorFamiliesCache: jest.fn(),
}));

import FilterAttribute from '../models/FilterAttribute';
import SKU from '../models/Sku';
import { loadColorFamilies } from '../utils/colorFamilyDetector';
import {
  clearAttributesCache,
  getAttributesForFilter,
} from './filterAttributeService';

const mockedFilterAttribute = FilterAttribute as unknown as {
  find: jest.Mock;
};

const mockedSku = SKU as unknown as {
  aggregate: jest.Mock;
};

const mockedLoadColorFamilies = loadColorFamilies as jest.Mock;

const mockAttributes = (attributes: unknown[]) => {
  const lean = jest.fn().mockResolvedValue(attributes);
  const sort = jest.fn().mockReturnValue({ lean });
  mockedFilterAttribute.find.mockReturnValue({ sort });
};

describe('getAttributesForFilter active value projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAttributesCache();
    mockedLoadColorFamilies.mockReturnValue([]);
  });

  it('publishes only library values used by active SKUs and keeps variant-field fallbacks', async () => {
    mockAttributes([
      {
        _id: 'material-id',
        key: 'material',
        name: 'חומר',
        valueType: 'text',
        values: [
          { value: 'cotton', displayName: 'כותנה' },
          { value: 'bamboo', displayName: 'במבוק' },
          'wool',
          { displayName: 'linen' },
        ],
      },
      {
        _id: 'strength-id',
        key: 'strength',
        name: 'חוזק',
        valueType: 'text',
        values: [{ value: '3mg', displayName: '3 מ״ג' }],
      },
      {
        _id: 'unused-id',
        key: 'unused',
        name: 'לא בשימוש',
        valueType: 'text',
        values: [{ value: 'new-library-value', displayName: 'ערך חדש' }],
      },
    ]);

    mockedSku.aggregate
      .mockResolvedValueOnce([
        {
          _id: { key: 'material', value: 'cotton' },
          skuIds: ['sku-1'],
        },
        {
          _id: { key: '__variantName', value: 'wool' },
          skuIds: ['sku-2'],
        },
        {
          _id: { key: '__subVariantName', value: '3mg' },
          skuIds: ['sku-2', 'sku-3'],
        },
        {
          _id: { key: '__variantName', value: 'linen' },
          skuIds: ['sku-5'],
        },
        {
          _id: { key: 'material', value: 'not-in-library' },
          skuIds: ['sku-4'],
        },
      ])
      // buildDynamicColorFamilies has its own active-color aggregation.
      .mockResolvedValueOnce([]);

    const result = await getAttributesForFilter();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      usageCount: 3,
      attribute: {
        key: 'material',
        values: [
          { value: 'cotton', displayName: 'כותנה' },
          { value: 'wool', displayName: 'wool' },
          { value: 'linen', displayName: 'linen' },
        ],
      },
    });
    expect(result[1]).toMatchObject({
      usageCount: 2,
      attribute: {
        key: 'strength',
        values: [{ value: '3mg', displayName: '3 מ״ג' }],
      },
    });
    expect(result.some(({ attribute }) => attribute.key === 'unused')).toBe(false);

    const usagePipeline = mockedSku.aggregate.mock.calls[0][0];
    expect(usagePipeline[0]).toEqual({ $match: { isActive: true } });
    expect(JSON.stringify(usagePipeline)).not.toContain('$$ROOT');
    expect(JSON.stringify(usagePipeline)).toContain('"value":"$color"');
    expect(JSON.stringify(usagePipeline)).toContain('$attributes');
    expect(JSON.stringify(usagePipeline)).toContain('__variantName');
    expect(JSON.stringify(usagePipeline)).toContain('__subVariantName');
  });

  it('keeps the existing dynamic color-family projection and counts active color SKUs', async () => {
    mockAttributes([
      {
        _id: 'color-id',
        key: 'color',
        name: 'צבע',
        valueType: 'color',
        colorFamilies: [],
      },
    ]);

    mockedLoadColorFamilies.mockReturnValue([
      {
        family: 'red',
        displayName: 'אדומים',
        variants: [{ name: 'אדום', hex: '#FF0000' }],
      },
    ]);

    mockedSku.aggregate
      .mockResolvedValueOnce([
        {
          _id: { key: 'color', value: '#FF0000' },
          skuIds: ['sku-color'],
        },
      ])
      .mockResolvedValueOnce([
        { _id: 'red', colors: ['#FF0000'] },
      ]);

    const result = await getAttributesForFilter();

    expect(result).toHaveLength(1);
    expect(result[0].usageCount).toBe(1);
    expect(result[0].attribute.colorFamilies).toEqual([
      {
        family: 'red',
        displayName: 'אדומים',
        variants: [{ name: 'אדום', hex: '#FF0000' }],
      },
    ]);

    const usagePipeline = mockedSku.aggregate.mock.calls[0][0];
    expect(JSON.stringify(usagePipeline)).toContain('"key":"color"');
    expect(JSON.stringify(usagePipeline)).toContain('"value":"$color"');
  });

  it('does not publish a color filter when no active color family can be built', async () => {
    mockAttributes([
      {
        _id: 'color-id',
        key: 'color',
        name: 'צבע',
        valueType: 'color',
        colorFamilies: [],
      },
    ]);

    mockedSku.aggregate
      .mockResolvedValueOnce([
        {
          _id: { key: 'color', value: 'אדום' },
          skuIds: ['sku-without-family'],
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(getAttributesForFilter()).resolves.toEqual([]);
  });
});
