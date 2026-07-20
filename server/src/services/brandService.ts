import mongoose, { ClientSession } from 'mongoose';
import Brand, { IBrand } from '../models/Brand';
import Product from '../models/Product';

/**
 * Brand names are identifiers in legacy product documents, so every equality
 * check must use the same case-insensitive rules as the Brand unique index.
 */
export const BRAND_COLLATION = {
  locale: 'en',
  strength: 2,
} as const;

export class DuplicateBrandError extends Error {
  public readonly statusCode = 400;

  constructor(name: string) {
    super(`מותג בשם "${name}" כבר קיים`);
    this.name = 'DuplicateBrandError';
  }
}

export class StaleBrandUpdateError extends Error {
  public readonly statusCode = 409;

  constructor() {
    super('המותג השתנה במקביל. יש לרענן את הרשימה ולנסות שוב');
    this.name = 'StaleBrandUpdateError';
  }
}

export class BrandInUseError extends Error {
  public readonly statusCode = 400;

  constructor(
    public readonly brandName: string,
    public readonly usageCount: number
  ) {
    super(`לא ניתן למחוק את המותג "${brandName}" - משויך ל-${usageCount} מוצרים`);
    this.name = 'BrandInUseError';
  }
}

export interface BrandUpdateInput {
  name?: string;
  isActive?: boolean;
  expectedUpdatedAt?: unknown;
}

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const parseExpectedUpdatedAt = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new StaleBrandUpdateError();
  }

  return parsed;
};

/** Count all products, including inactive ones, whose legacy brand name matches. */
export const countProductsUsingBrand = async (
  brandName: string,
  session?: ClientSession
): Promise<number> => Product.countDocuments(
  { brand: brandName },
  {
    collation: BRAND_COLLATION,
    ...(session ? { session } : {}),
  }
);

/**
 * Rename a brand and all product string references atomically.
 * A status-only update deliberately avoids touching products.
 */
export const updateBrandAndProductReferences = async (
  id: string,
  updates: BrandUpdateInput
): Promise<IBrand | null> => {
  const expectedUpdatedAt = parseExpectedUpdatedAt(updates.expectedUpdatedAt);
  const session = await mongoose.startSession();
  let result: IBrand | null = null;

  try {
    await session.withTransaction(async () => {
      result = null;

      const currentBrand = await Brand.findById(id).session(session);
      if (!currentBrand) return;

      if (
        expectedUpdatedAt &&
        new Date(currentBrand.updatedAt).getTime() !== expectedUpdatedAt.getTime()
      ) {
        throw new StaleBrandUpdateError();
      }

      const nextName = typeof updates.name === 'string'
        ? updates.name.trim()
        : currentBrand.name;
      const nameChanged = nextName !== currentBrand.name;

      if (nameChanged) {
        const duplicate = await Brand.findOne({
          _id: { $ne: currentBrand._id },
          name: nextName,
        })
          .collation(BRAND_COLLATION)
          .session(session);

        if (duplicate) {
          throw new DuplicateBrandError(nextName);
        }
      }

      const setUpdates: Pick<BrandUpdateInput, 'name' | 'isActive'> = {};
      if (nameChanged) setUpdates.name = nextName;
      if (typeof updates.isActive === 'boolean' && updates.isActive !== currentBrand.isActive) {
        setUpdates.isActive = updates.isActive;
      }

      if (Object.keys(setUpdates).length === 0) {
        result = currentBrand;
        return;
      }

      const updateFilter: Record<string, unknown> = { _id: currentBrand._id };
      if (expectedUpdatedAt) {
        updateFilter.updatedAt = expectedUpdatedAt;
      }

      const updatedBrand = await Brand.findOneAndUpdate(
        updateFilter,
        { $set: setUpdates },
        {
          new: true,
          runValidators: true,
          session,
          collation: BRAND_COLLATION,
        }
      );

      if (!updatedBrand) {
        if (expectedUpdatedAt) throw new StaleBrandUpdateError();
        return;
      }

      if (nameChanged) {
        await Product.updateMany(
          { brand: currentBrand.name },
          { $set: { brand: updatedBrand.name } },
          {
            session,
            collation: BRAND_COLLATION,
          }
        );
      }

      result = updatedBrand;
    });

    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const requestedName = typeof updates.name === 'string' ? updates.name.trim() : '';
      throw new DuplicateBrandError(requestedName);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

/** Delete a brand only if no active or inactive product still references it. */
export const deleteBrandIfUnused = async (id: string): Promise<IBrand | null> => {
  const session = await mongoose.startSession();
  let deletedBrand: IBrand | null = null;

  try {
    await session.withTransaction(async () => {
      deletedBrand = null;

      const brand = await Brand.findById(id).session(session);
      if (!brand) return;

      const usageCount = await countProductsUsingBrand(brand.name, session);
      if (usageCount > 0) {
        throw new BrandInUseError(brand.name, usageCount);
      }

      const deletion = await Brand.deleteOne({ _id: brand._id }, { session });
      if (deletion.deletedCount === 1) {
        deletedBrand = brand;
      }
    });

    return deletedBrand;
  } finally {
    await session.endSession();
  }
};
