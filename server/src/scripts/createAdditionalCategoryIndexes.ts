import dotenv from 'dotenv';
import connectDB from '../config/database';
import Product from '../models/Product';

/**
 * יוצר רק את האינדקסים הדרושים לקטגוריות נוספות.
 * בניגוד לסקריפט הישן createProductIndexes, הוא אינו מוחק אינדקסים קיימים.
 * הרצה: npx ts-node src/scripts/createAdditionalCategoryIndexes.ts
 */
async function createAdditionalCategoryIndexes(): Promise<void> {
  dotenv.config();
  await connectDB();

  await Product.collection.createIndex(
    { additionalCategoryIds: 1 },
    { name: 'additionalCategoryIds_1' }
  );
  await Product.collection.createIndex(
    { additionalCategoryIds: 1, isActive: 1, createdAt: -1 },
    { name: 'additionalCategoryIds_1_isActive_1_createdAt_-1' }
  );

  console.log('Additional category indexes created successfully.');
}

createAdditionalCategoryIndexes().catch((error) => {
  console.error('Failed to create additional category indexes:', error);
  process.exitCode = 1;
});
