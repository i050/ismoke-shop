jest.mock('../models/FilterAttribute', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../models/Sku', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../middleware/dynamicValidation', () => ({
  clearValidationCache: jest.fn(),
}));

jest.mock('../utils/colorFamilyDetector', () => ({
  loadColorFamilies: jest.fn(() => []),
  refreshColorFamiliesCache: jest.fn(),
}));

import FilterAttribute from '../models/FilterAttribute';
import { clearValidationCache } from '../middleware/dynamicValidation';
import {
  addAttributeValue,
  AttributeValueMutationError,
} from './filterAttributeService';

const mockedFilterAttribute = FilterAttribute as unknown as {
  findById: jest.Mock;
  updateOne: jest.Mock;
};
const mockedClearValidationCache = clearValidationCache as jest.Mock;

const mockFindByIdResult = (attribute: unknown): void => {
  mockedFilterAttribute.findById.mockReturnValueOnce({
    lean: jest.fn().mockResolvedValue(attribute),
  });
};

describe('addAttributeValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atomically adds a normalized Hebrew text value without creating an English slug', async () => {
    mockFindByIdResult({
      name: 'חומר',
      valueType: 'text',
      values: [],
    });
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(
      addAttributeValue('attribute-id', '  כותנה   אורגנית  ')
    ).resolves.toEqual({
      value: 'כותנה אורגנית',
      displayName: 'כותנה אורגנית',
      created: true,
    });

    expect(mockedFilterAttribute.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = mockedFilterAttribute.updateOne.mock.calls[0];

    expect(filter._id).toBe('attribute-id');
    expect(filter.valueType).toBe('text');
    expect(filter.$nor).toHaveLength(3);
    expect(filter.$nor[0].values).toEqual(expect.any(RegExp));
    expect(filter.$nor[1].values.$elemMatch.value).toEqual(expect.any(RegExp));
    expect(filter.$nor[2].values.$elemMatch.displayName).toEqual(expect.any(RegExp));
    expect(filter.$nor[0].values.source).toBe('^\\s*כותנה\\s+אורגנית\\s*$');
    expect(filter.$nor[0].values.flags).toContain('i');
    expect(update).toEqual({
      $push: {
        values: {
          value: 'כותנה אורגנית',
          displayName: 'כותנה אורגנית',
        },
      },
    });
    expect(options).toEqual({ runValidators: true });
    expect(mockedClearValidationCache).toHaveBeenCalledTimes(1);
  });

  it('returns the original legacy identity when the input matches displayName', async () => {
    const attribute = {
      name: 'חומר',
      valueType: 'text',
      values: [{ value: 'cotton', displayName: 'כותנה' }],
    };
    mockFindByIdResult(attribute);
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 0 });
    mockFindByIdResult(attribute);

    await expect(addAttributeValue('attribute-id', 'כותנה')).resolves.toEqual({
      value: 'cotton',
      displayName: 'כותנה',
      created: false,
    });

    expect(mockedFilterAttribute.updateOne).toHaveBeenCalledTimes(1);
    expect(mockedClearValidationCache).not.toHaveBeenCalled();
  });

  it('recognizes a legacy string value case-insensitively', async () => {
    const attribute = {
      name: 'מידה',
      valueType: 'text',
      values: ['XL'],
    };
    mockFindByIdResult(attribute);
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 0 });
    mockFindByIdResult(attribute);

    await expect(addAttributeValue('attribute-id', ' xl ')).resolves.toEqual({
      value: 'XL',
      displayName: 'XL',
      created: false,
    });
    expect(mockedFilterAttribute.updateOne).toHaveBeenCalledTimes(1);
  });

  it('returns the value created by a concurrent request instead of duplicating it', async () => {
    mockFindByIdResult({
      name: 'טעם',
      valueType: 'text',
      values: [],
    });
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 0 });
    mockFindByIdResult({
      name: 'טעם',
      valueType: 'text',
      values: [{ value: 'Mango', displayName: 'מנגו' }],
    });

    await expect(addAttributeValue('attribute-id', 'מנגו')).resolves.toEqual({
      value: 'Mango',
      displayName: 'מנגו',
      created: false,
    });

    expect(mockedFilterAttribute.updateOne).toHaveBeenCalledTimes(1);
    expect(mockedFilterAttribute.findById).toHaveBeenCalledTimes(2);
  });

  it('canonicalizes non-negative number values and rejects invalid numbers', async () => {
    mockFindByIdResult({
      name: 'התנגדות',
      valueType: 'number',
      values: [],
    });
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(addAttributeValue('attribute-id', '10.00')).resolves.toEqual({
      value: '10',
      displayName: '10',
      created: true,
    });

    mockFindByIdResult({
      name: 'התנגדות',
      valueType: 'number',
      values: [],
    });
    await expect(addAttributeValue('attribute-id', '-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects color attributes so their existing shade flow remains authoritative', async () => {
    mockFindByIdResult({
      name: 'צבע',
      valueType: 'color',
      values: [],
    });

    await expect(addAttributeValue('attribute-id', 'אדום')).rejects.toBeInstanceOf(
      AttributeValueMutationError
    );
    mockFindByIdResult(null);
    await expect(addAttributeValue('', 'אדום')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockedFilterAttribute.updateOne).not.toHaveBeenCalled();
  });

  it('rejects commas that would be interpreted as public-filter separators', async () => {
    mockFindByIdResult({
      name: 'טעם',
      valueType: 'text',
      values: [],
    });

    await expect(addAttributeValue('attribute-id', 'תפוח, קינמון')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockedFilterAttribute.updateOne).not.toHaveBeenCalled();
  });
});
