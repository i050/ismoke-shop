jest.mock('../models/Brand', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock('../models/Product', () => ({
  __esModule: true,
  default: {
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

import mongoose from 'mongoose';
import Brand from '../models/Brand';
import Product from '../models/Product';
import {
  BRAND_COLLATION,
  BrandInUseError,
  DuplicateBrandError,
  StaleBrandUpdateError,
  countProductsUsingBrand,
  deleteBrandIfUnused,
  updateBrandAndProductReferences,
} from './brandService';

const mockedBrand = Brand as unknown as {
  findById: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  deleteOne: jest.Mock;
};

const mockedProduct = Product as unknown as {
  updateMany: jest.Mock;
  countDocuments: jest.Mock;
};

const session = {
  withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
  endSession: jest.fn(),
};

const mockFindById = (value: unknown): jest.Mock => {
  const sessionMethod = jest.fn().mockResolvedValue(value);
  mockedBrand.findById.mockReturnValue({ session: sessionMethod });
  return sessionMethod;
};

const mockFindOne = (value: unknown): { collation: jest.Mock; sessionMethod: jest.Mock } => {
  const sessionMethod = jest.fn().mockResolvedValue(value);
  const collation = jest.fn().mockReturnValue({ session: sessionMethod });
  mockedBrand.findOne.mockReturnValue({ collation });
  return { collation, sessionMethod };
};

describe('brandService', () => {
  beforeAll(() => {
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(session as never);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session.withTransaction.mockImplementation(async (callback: () => Promise<void>) => callback());
    mockedProduct.updateMany.mockResolvedValue({ modifiedCount: 0 });
    mockedBrand.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renames the brand and every case-insensitive product reference in one transaction', async () => {
    const updatedAt = new Date('2026-07-20T10:00:00.000Z');
    const currentBrand = {
      _id: 'brand-id',
      name: 'Smok',
      isActive: true,
      updatedAt,
    };
    const updatedBrand = {
      ...currentBrand,
      name: 'SMOK NEW',
      updatedAt: new Date('2026-07-20T10:01:00.000Z'),
    };
    mockFindById(currentBrand);
    const duplicateQuery = mockFindOne(null);
    mockedBrand.findOneAndUpdate.mockResolvedValue(updatedBrand);

    await expect(updateBrandAndProductReferences('brand-id', {
      name: '  SMOK NEW  ',
      expectedUpdatedAt: updatedAt.toISOString(),
    })).resolves.toBe(updatedBrand);

    expect(duplicateQuery.collation).toHaveBeenCalledWith(BRAND_COLLATION);
    expect(duplicateQuery.sessionMethod).toHaveBeenCalledWith(session);
    expect(mockedBrand.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'brand-id', updatedAt },
      { $set: { name: 'SMOK NEW' } },
      {
        new: true,
        runValidators: true,
        session,
        collation: BRAND_COLLATION,
      }
    );
    expect(mockedProduct.updateMany).toHaveBeenCalledWith(
      { brand: 'Smok' },
      { $set: { brand: 'SMOK NEW' } },
      { session, collation: BRAND_COLLATION }
    );
  });

  it('changes status without rewriting any product documents', async () => {
    const currentBrand = {
      _id: 'brand-id',
      name: 'SMOK',
      isActive: true,
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    };
    const updatedBrand = { ...currentBrand, isActive: false };
    mockFindById(currentBrand);
    mockedBrand.findOneAndUpdate.mockResolvedValue(updatedBrand);

    await expect(updateBrandAndProductReferences('brand-id', {
      isActive: false,
    })).resolves.toBe(updatedBrand);

    expect(mockedBrand.findOne).not.toHaveBeenCalled();
    expect(mockedProduct.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a case-insensitive duplicate before changing products', async () => {
    const currentBrand = {
      _id: 'brand-id',
      name: 'SMOK',
      isActive: true,
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    };
    mockFindById(currentBrand);
    mockFindOne({ _id: 'other-brand-id', name: 'aspire' });

    await expect(updateBrandAndProductReferences('brand-id', {
      name: 'ASPIRE',
    })).rejects.toBeInstanceOf(DuplicateBrandError);

    expect(mockedBrand.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockedProduct.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a stale loaded revision before changing anything', async () => {
    mockFindById({
      _id: 'brand-id',
      name: 'SMOK',
      isActive: true,
      updatedAt: new Date('2026-07-20T10:02:00.000Z'),
    });

    await expect(updateBrandAndProductReferences('brand-id', {
      name: 'SMOK NEW',
      expectedUpdatedAt: '2026-07-20T10:00:00.000Z',
    })).rejects.toBeInstanceOf(StaleBrandUpdateError);

    expect(mockedBrand.findOne).not.toHaveBeenCalled();
    expect(mockedBrand.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockedProduct.updateMany).not.toHaveBeenCalled();
  });

  it('uses case-insensitive equality when counting active and inactive product usage', async () => {
    mockedProduct.countDocuments.mockResolvedValue(3);

    await expect(countProductsUsingBrand('SMOK')).resolves.toBe(3);

    expect(mockedProduct.countDocuments).toHaveBeenCalledWith(
      { brand: 'SMOK' },
      { collation: BRAND_COLLATION }
    );
  });

  it('does not delete a brand referenced with different casing', async () => {
    const brand = {
      _id: 'brand-id',
      name: 'SMOK',
      isActive: false,
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    };
    mockFindById(brand);
    mockedProduct.countDocuments.mockResolvedValue(2);

    await expect(deleteBrandIfUnused('brand-id')).rejects.toBeInstanceOf(BrandInUseError);

    expect(mockedProduct.countDocuments).toHaveBeenCalledWith(
      { brand: 'SMOK' },
      { collation: BRAND_COLLATION, session }
    );
    expect(mockedBrand.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes an unused brand inside the transaction', async () => {
    const brand = {
      _id: 'brand-id',
      name: 'SMOK',
      isActive: true,
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    };
    mockFindById(brand);
    mockedProduct.countDocuments.mockResolvedValue(0);

    await expect(deleteBrandIfUnused('brand-id')).resolves.toBe(brand);

    expect(mockedBrand.deleteOne).toHaveBeenCalledWith(
      { _id: 'brand-id' },
      { session }
    );
    expect(session.endSession).toHaveBeenCalled();
  });
});
