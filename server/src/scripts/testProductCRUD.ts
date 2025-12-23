/**
 * 🧪 Phase 1.6: בדיקת Backend CRUD למוצרים עם SKUs
 * 
 * טסט מקיף לבדיקת כל הפונקציות החדשות:
 * 1. יצירת מוצר עם SKUs (Transaction)
 * 2. בדיקת ייחודיות SKU
 * 3. עדכון מוצר עם SKUs (Transaction)
 * 4. מחיקה רכה (Soft Delete)
 * 5. שחזור מוצר (Restore)
 * 6. בדיקת Transaction Rollback (SKU כפול)
 */

import 'dotenv/config'; // טעינת משתני סביבה
import mongoose from 'mongoose';
import connectDB from '../config/database';
import Product, { type IImage } from '../models/Product';
import Sku from '../models/Sku';
import * as productService from '../services/productService';

// צבעים לקונסול
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg: string) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  separator: () => console.log(`${colors.yellow}${'='.repeat(80)}${colors.reset}`),
};

async function runTests() {
  try {
    // חיבור למסד הנתונים
    await connectDB();
    log.success('חיבור למסד נתונים הצליח');

    // ניקוי מוצרי טסט קודמים
    await Product.deleteMany({ name: /^TEST_PRODUCT/ });
    await Sku.deleteMany({ sku: /^TEST-SKU/ });
    log.info('ניקוי מוצרי טסט קודמים הושלם');

    log.separator();

    // ============================================================================
    // Test 1: יצירת מוצר עם SKUs (Transaction)
    // ============================================================================
    log.test('Test 1: יצירת מוצר עם 3 SKUs (Transaction-based)');

    const productData = {
      name: 'TEST_PRODUCT_001',
      description: 'מוצר טסט לבדיקת CRUD',
      basePrice: 100,
      categoryId: new mongoose.Types.ObjectId(), // קטגוריה דמה
      images: [
        {
          thumbnail: 'https://example.com/image1-thumbnail.webp',
          medium: 'https://example.com/image1-medium.webp',
          large: 'https://example.com/image1-large.webp',
          key: 'test_image_001',
          format: 'webp',
          uploadedAt: new Date(),
        } satisfies IImage,
      ],
      brand: 'Test Brand',
      tags: ['test', 'crud'],
      isActive: true,
      isFeatured: false,
    };

    const skusData = [
      {
        sku: 'TEST-SKU-001',
        name: 'Test SKU Red M',
        price: 100,
        stockQuantity: 50,
        color: 'אדום',
        size: 'M',
        weight: 0.5,
      },
      {
        sku: 'TEST-SKU-002',
        name: 'Test SKU Blue L',
        price: 110,
        stockQuantity: 30,
        color: 'כחול',
        size: 'L',
        weight: 0.6,
      },
      {
        sku: 'TEST-SKU-003',
        name: 'Test SKU Green S',
        price: 90,
        stockQuantity: 40,
        color: 'ירוק',
        size: 'S',
        weight: 0.4,
      },
    ];

    const createResult = await productService.createProductWithSkus(
      productData,
      skusData
    );

    const createdProduct = createResult.product;
    log.success(`מוצר נוצר בהצלחה: ${createdProduct._id}`);
    log.info(`שם: ${createdProduct.name}`);
    log.info(`מחיר בסיס: ${createdProduct.basePrice}₪`);

    // בדיקת SKUs
    const skus = createResult.skus;
    log.info(`SKUs שנוצרו: ${skus.length}`);
    skus.forEach((sku: any) => {
      log.info(`  - ${sku.sku}: ${sku.attributes?.color || 'N/A'} ${sku.attributes?.size || 'N/A'} (${sku.stockQuantity} יח')`);
    });

    if (skus.length !== 3) {
      throw new Error(`Expected 3 SKUs, got ${skus.length}`);
    }

    log.separator();

    // ============================================================================
    // Test 2: בדיקת ייחודיות SKU
    // ============================================================================
    log.test('Test 2: בדיקת ייחודיות SKU');

    const skuExists1 = await productService.checkSkuExists('TEST-SKU-001');
    log.info(`SKU 'TEST-SKU-001' קיים: ${skuExists1 ? 'כן' : 'לא'}`);
    if (!skuExists1) {
      throw new Error('SKU אמור להיות קיים!');
    }

    const skuExists2 = await productService.checkSkuExists('TEST-SKU-999');
    log.info(`SKU 'TEST-SKU-999' קיים: ${skuExists2 ? 'כן' : 'לא'}`);
    if (skuExists2) {
      throw new Error('SKU לא אמור להיות קיים!');
    }

    log.success('בדיקת ייחודיות SKU עבדה כראוי');

    log.separator();

    // ============================================================================
    // Test 3: עדכון מוצר עם SKUs (Transaction)
    // ============================================================================
    log.test('Test 3: עדכון מוצר - שינוי שם והוספת SKU');

    const updatedProductData = {
      name: 'TEST_PRODUCT_001_UPDATED',
      basePrice: 120,
    };

    const updatedSkusData = [
      ...skusData,
      {
        sku: 'TEST-SKU-004',
        name: 'Test SKU Yellow XL',
        price: 105,
        stockQuantity: 25,
        color: 'צהוב',
        size: 'XL',
        weight: 0.7,
      },
    ];

    const updateResult = await productService.updateProductWithSkus(
      (createdProduct._id as mongoose.Types.ObjectId).toString(),
      updatedProductData,
      updatedSkusData
    );

    const updatedProduct = updateResult.product;
    log.success(`מוצר עודכן בהצלחה`);
    log.info(`שם חדש: ${updatedProduct.name}`);
    log.info(`מחיר חדש: ${updatedProduct.basePrice}₪`);

    // בדיקת SKUs מעודכנים
    const updatedSkus = updateResult.skus;
    log.info(`SKUs לאחר עדכון: ${updatedSkus.length}`);

    if (updatedSkus.length !== 4) {
      throw new Error(`Expected 4 SKUs, got ${updatedSkus.length}`);
    }

    log.separator();

    // ============================================================================
    // Test 4: מחיקה רכה (Soft Delete)
    // ============================================================================
    log.test('Test 4: מחיקה רכה (Soft Delete)');

    await productService.softDeleteProduct((updatedProduct._id as mongoose.Types.ObjectId).toString());

    const deletedProduct = await Product.findById(updatedProduct._id);
    log.info(`מוצר לאחר מחיקה רכה - isActive: ${deletedProduct?.isActive}`);

    if (deletedProduct?.isActive !== false) {
      throw new Error('המוצר אמור להיות isActive: false');
    }

    // בדיקה ש-SKUs גם הם isActive: false
  const deletedSkus = await Sku.find({ productId: updatedProduct._id }).lean();
    const inactiveSkusCount = deletedSkus.filter((s) => !s.isActive).length;
    log.info(`SKUs לא פעילים: ${inactiveSkusCount} מתוך ${deletedSkus.length}`);

    if (inactiveSkusCount !== deletedSkus.length) {
      throw new Error('כל ה-SKUs אמורים להיות isActive: false');
    }

    log.success('מחיקה רכה עבדה כראוי (Product + SKUs)');

    log.separator();

    // ============================================================================
    // Test 5: שחזור מוצר (Restore)
    // ============================================================================
    log.test('Test 5: שחזור מוצר');

    await productService.restoreProduct((updatedProduct._id as mongoose.Types.ObjectId).toString());

    const restoredProduct = await Product.findById(updatedProduct._id);
    log.info(`מוצר לאחר שחזור - isActive: ${restoredProduct?.isActive}`);

    if (restoredProduct?.isActive !== true) {
      throw new Error('המוצר אמור להיות isActive: true');
    }

    // בדיקה ש-SKUs גם הם isActive: true
  const restoredSkus = await Sku.find({ productId: updatedProduct._id }).lean();
    const activeSkusCount = restoredSkus.filter((s) => s.isActive).length;
    log.info(`SKUs פעילים: ${activeSkusCount} מתוך ${restoredSkus.length}`);

    if (activeSkusCount !== restoredSkus.length) {
      throw new Error('כל ה-SKUs אמורים להיות isActive: true');
    }

    log.success('שחזור מוצר עבד כראוי (Product + SKUs)');

    log.separator();

    // ============================================================================
    // Test 6: Transaction Rollback - SKU כפול
    // ============================================================================
    log.test('Test 6: Transaction Rollback - ניסיון ליצור מוצר עם SKU כפול');

    const duplicateProductData = {
      name: 'TEST_PRODUCT_002',
      description: 'מוצר עם SKU כפול',
      basePrice: 150,
      categoryId: new mongoose.Types.ObjectId(),
      images: [],
      brand: 'Test Brand',
    };

    const duplicateSkusData = [
      {
        sku: 'TEST-SKU-001', // SKU שכבר קיים!
        name: 'Duplicate SKU Test',
        price: 100,
        stockQuantity: 10,
      },
    ];

    try {
      await productService.createProductWithSkus(
        duplicateProductData,
        duplicateSkusData
      );
      throw new Error('אמור היה להיכשל בגלל SKU כפול!');
    } catch (error: any) {
      log.success('Transaction נכשל כצפוי (SKU כפול)');
      log.info(`הודעת שגיאה: ${error.message}`);
    }

    // וידוא שהמוצר לא נוצר (rollback)
    const duplicateProduct = await Product.findOne({ name: 'TEST_PRODUCT_002' });
    if (duplicateProduct) {
      throw new Error('המוצר לא אמור היה להיווצר (Transaction rollback)');
    }
    log.success('Transaction Rollback עבד כראוי - המוצר לא נוצר');

    log.separator();

    // ============================================================================
    // סיכום
    // ============================================================================
    log.separator();
    console.log(`${colors.green}
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                  🎉 כל הטסטים עברו בהצלחה! 🎉                           ║
║                                                                           ║
║  ✅ Test 1: יצירת מוצר עם SKUs (Transaction)                             ║
║  ✅ Test 2: בדיקת ייחודיות SKU                                           ║
║  ✅ Test 3: עדכון מוצר עם SKUs                                           ║
║  ✅ Test 4: מחיקה רכה (Soft Delete)                                      ║
║  ✅ Test 5: שחזור מוצר (Restore)                                         ║
║  ✅ Test 6: Transaction Rollback (SKU כפול)                              ║
║                                                                           ║
║  🚀 Phase 1 (Backend CRUD) הושלם בהצלחה!                                ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    // ניקוי מוצרי טסט
    log.info('מנקה מוצרי טסט...');
    await Product.deleteMany({ name: /^TEST_PRODUCT/ });
    await Sku.deleteMany({ sku: /^TEST-SKU/ });
    log.success('ניקוי הושלם');

    process.exit(0);
  } catch (error: any) {
    log.error(`שגיאה בטסט: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// הרצת הטסטים
runTests();
