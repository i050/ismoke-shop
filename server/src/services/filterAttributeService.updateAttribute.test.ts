jest.mock('../models/FilterAttribute', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('../models/Sku', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
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
import {
  AttributeUpdateConflictError,
  updateAttribute,
} from './filterAttributeService';

const mockedFilterAttribute = FilterAttribute as unknown as {
  findById: jest.Mock;
  findOneAndUpdate: jest.Mock;
  exists: jest.Mock;
};

describe('updateAttribute value-library concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires the loaded revision when replacing the values array', async () => {
    await expect(updateAttribute('attribute-id', { values: [] }))
      .rejects.toBeInstanceOf(AttributeUpdateConflictError);

    expect(mockedFilterAttribute.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('updates the value library only when updatedAt still matches', async () => {
    const updatedAt = '2026-07-20T10:00:00.000Z';
    const returnedAttribute = { _id: 'attribute-id', name: 'חומר' };
    mockedFilterAttribute.findOneAndUpdate.mockResolvedValue(returnedAttribute);

    await expect(updateAttribute('attribute-id', {
      name: 'חומר',
      values: [{ value: 'cotton', displayName: 'כותנה' }],
      expectedUpdatedAt: updatedAt,
    })).resolves.toBe(returnedAttribute);

    expect(mockedFilterAttribute.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'attribute-id',
        updatedAt: new Date(updatedAt),
      },
      {
        name: 'חומר',
        values: [{ value: 'cotton', displayName: 'כותנה' }],
      },
      { new: true, runValidators: true }
    );
  });

  it('returns a conflict instead of overwriting a concurrently changed library', async () => {
    mockedFilterAttribute.findOneAndUpdate.mockResolvedValue(null);
    mockedFilterAttribute.exists.mockResolvedValue({ _id: 'attribute-id' });

    await expect(updateAttribute('attribute-id', {
      values: [{ value: 'linen', displayName: 'פשתן' }],
      expectedUpdatedAt: '2026-07-20T10:00:00.000Z',
    })).rejects.toBeInstanceOf(AttributeUpdateConflictError);
  });

  it('still allows metadata-only updates without a library revision', async () => {
    const returnedAttribute = { _id: 'attribute-id', name: 'חומר חדש' };
    mockedFilterAttribute.findOneAndUpdate.mockResolvedValue(returnedAttribute);

    await expect(updateAttribute('attribute-id', { name: 'חומר חדש' }))
      .resolves.toBe(returnedAttribute);

    expect(mockedFilterAttribute.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'attribute-id' },
      { name: 'חומר חדש' },
      { new: true, runValidators: true }
    );
  });
});
