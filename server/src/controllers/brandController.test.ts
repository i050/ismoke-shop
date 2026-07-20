jest.mock('../services/brandService', () => {
  class DuplicateBrandError extends Error {
    statusCode = 400;
  }
  class StaleBrandUpdateError extends Error {
    statusCode = 409;
  }
  class BrandInUseError extends Error {
    statusCode = 400;
    usageCount = 1;
  }

  return {
    BRAND_COLLATION: { locale: 'en', strength: 2 },
    DuplicateBrandError,
    StaleBrandUpdateError,
    BrandInUseError,
    updateBrandAndProductReferences: jest.fn(),
    deleteBrandIfUnused: jest.fn(),
    countProductsUsingBrand: jest.fn(),
  };
});

import * as brandService from '../services/brandService';
import { updateBrand } from './brandController';

const mockedUpdateBrand = brandService.updateBrandAndProductReferences as jest.Mock;

describe('brandController.updateBrand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a status-only update and forwards its optimistic revision', async () => {
    const expectedUpdatedAt = '2026-07-20T10:00:00.000Z';
    const updatedBrand = { _id: 'brand-id', name: 'SMOK', isActive: false };
    mockedUpdateBrand.mockResolvedValue(updatedBrand);

    const req = {
      params: { id: 'brand-id' },
      body: { isActive: false, expectedUpdatedAt },
    } as any;
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as any;
    res.status.mockReturnValue(res);
    const next = jest.fn();

    await updateBrand(req, res, next);

    expect(mockedUpdateBrand).toHaveBeenCalledWith('brand-id', {
      name: undefined,
      isActive: false,
      expectedUpdatedAt,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: updatedBrand,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    [{ isActive: 'false' }, 'סטטוס המותג חייב להיות ערך בוליאני'],
    [{ expectedUpdatedAt: 'not-a-date' }, 'גרסת המותג שנשלחה אינה תקינה'],
  ])('rejects an invalid update contract', async (body, message) => {
    const req = {
      params: { id: 'brand-id' },
      body,
    } as any;
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as any;
    res.status.mockReturnValue(res);
    const next = jest.fn();

    await updateBrand(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message });
    expect(mockedUpdateBrand).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
