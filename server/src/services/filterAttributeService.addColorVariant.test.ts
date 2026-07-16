jest.mock('../models/FilterAttribute', () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
    findOne: jest.fn(),
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
import { addColorVariant, updateColorVariant } from './filterAttributeService';

const mockedFilterAttribute = FilterAttribute as unknown as {
  updateOne: jest.Mock;
  findOne: jest.Mock;
};

describe('addColorVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks a duplicate shade name across every color family atomically', async () => {
    mockedFilterAttribute.updateOne.mockResolvedValue({ modifiedCount: 0 });
    mockedFilterAttribute.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        colorFamilies: [
          {
            family: 'red',
            displayName: 'אדומים',
            variants: [{ name: 'אדום', hex: '#FF0000' }],
          },
          {
            family: 'blue',
            displayName: 'כחולים',
            variants: [{ name: 'Ocean', hex: '#0077AA' }],
          },
        ],
      }),
    });

    await expect(addColorVariant('red', ' ocean ', '#123456')).rejects.toThrow('כבר קיים');

    expect(mockedFilterAttribute.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = mockedFilterAttribute.updateOne.mock.calls[0];

    expect(filter).toEqual({
      key: 'color',
      'colorFamilies.family': 'red',
      $nor: [
        {
          colorFamilies: {
            $elemMatch: {
              variants: {
                $elemMatch: { name: expect.any(RegExp) },
              },
            },
          },
        },
      ],
    });

    const duplicateNamePattern =
      filter.$nor[0].colorFamilies.$elemMatch.variants.$elemMatch.name as RegExp;
    expect(duplicateNamePattern.source).toBe('^ocean$');
    expect(duplicateNamePattern.flags).toContain('i');
    expect(update).toEqual({
      $push: {
        'colorFamilies.$.variants': {
          name: 'ocean',
          hex: '#123456',
        },
      },
    });

    expect(mockedFilterAttribute.findOne).toHaveBeenCalledWith({ key: 'color' });
  });
});

describe('updateColorVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks a concurrent rename to a shade name used in another family', async () => {
    mockedFilterAttribute.findOne
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          colorFamilies: [
            {
              family: 'red',
              displayName: 'אדומים',
              variants: [{ name: 'Crimson', hex: '#AA1122' }],
            },
            {
              family: 'blue',
              displayName: 'כחולים',
              variants: [{ name: 'Ocean', hex: '#0077AA' }],
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          colorFamilies: [
            {
              family: 'red',
              displayName: 'אדומים',
              variants: [{ name: 'Crimson', hex: '#AA1122' }],
            },
            {
              family: 'green',
              displayName: 'ירוקים',
              variants: [{ name: 'Forest', hex: '#116633' }],
            },
          ],
        }),
      });
    mockedFilterAttribute.updateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(
      updateColorVariant('red', 'Crimson', { name: 'Forest' })
    ).rejects.toThrow('כבר קיים');

    const [filter] = mockedFilterAttribute.updateOne.mock.calls[0];
    expect(filter.colorFamilies).toEqual({
      $elemMatch: {
        family: 'red',
        'variants.name': 'Crimson',
      },
    });
    expect(filter.$nor[0].colorFamilies.$elemMatch.variants.$elemMatch.name)
      .toEqual(expect.any(RegExp));
  });
});
