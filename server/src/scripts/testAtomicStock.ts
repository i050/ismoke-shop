import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Sku from '../models/Sku';
import Product from '../models/Product';
import connectDB from '../config/database';
import { 
  decrementStockAtomic, 
  incrementStockAtomic,
  bulkDecrementStockAtomic,
  bulkIncrementStockAtomic 
} from '../services/skuService';

// טעינת משתני סביבה
dotenv.config();

/**
 * Test Script: בדיקת Atomic Stock Updates
 * 
 * מטרה:
 * 1. סימולציה של race condition - 2 הזמנות בו-זמנית
 * 2. אימות שה-atomic operations מונעות overselling
 * 3. בדיקת bulk operations עם transactions
 * 
 * הרצה:
 * ts-node src/scripts/testAtomicStock.ts
 */

async function testAtomicStock() {
  try {
    console.log('🔗 מתחבר למסד נתונים...');
    await connectDB();

    console.log('\n📦 שלב 1: יצירת מוצר טסט עם SKU...');
    
    // יצירת מוצר טסט
    const testProduct = await Product.create({
      name: 'Test Product for Atomic Stock',
      description: 'Testing concurrent stock updates',
      basePrice: 99.99,
      quantityInStock: 100,
      stockQuantity: 100,
      isActive: true,
    });

    console.log(`✅ מוצר נוצר: ${testProduct._id}`);

    // יצירת SKU עם מלאי של 5 (כדי לבדוק overselling)
    const testSku = await Sku.create({
      sku: `TEST-ATOMIC-${Date.now()}`,
      productId: testProduct._id,
      name: 'Test SKU - Limited Stock',
      price: 99.99,
      stockQuantity: 5, // רק 5 במלאי!
      attributes: { color: 'Red' },
      isActive: true,
    });

    console.log(`✅ SKU נוצר: ${testSku.sku} (מלאי: ${testSku.stockQuantity})`);

    // ============================================================================
    // בדיקה 1: Race Condition - 2 הזמנות בו-זמנית למלאי של 5
    // ============================================================================
    console.log('\n🏁 שלב 2: סימולציה של Race Condition...');
    console.log('מנסה 2 הזמנות בו-זמנית:');
    console.log('  - הזמנה A: 3 יחידות');
    console.log('  - הזמנה B: 3 יחידות');
    console.log('  - סה"כ: 6 יחידות (יותר מהמלאי!)');
    console.log('  - צפוי: אחת צריכה להיכשל');

    // הזמנות בו-זמנית
    const [resultA, resultB] = await Promise.allSettled([
      decrementStockAtomic(testSku.sku, 3), // הזמנה A
      decrementStockAtomic(testSku.sku, 3), // הזמנה B
    ]);

    console.log('\n📊 תוצאות:');
    console.log(`  הזמנה A: ${resultA.status === 'fulfilled' && resultA.value ? '✅ הצליחה' : '❌ נכשלה'}`);
    console.log(`  הזמנה B: ${resultB.status === 'fulfilled' && resultB.value ? '✅ הצליחה' : '❌ נכשלה'}`);

    // בדיקה שרק אחת הצליחה
    const successCount = [resultA, resultB].filter(
      r => r.status === 'fulfilled' && r.value
    ).length;

    if (successCount !== 1) {
      console.error(`❌ שגיאה: ${successCount} הזמנות הצליחו (צריך בדיוק 1)`);
      process.exit(1);
    }

    console.log('✅ Race condition נמנע! רק הזמנה אחת הצליחה');

    // בדיקת מלאי סופי
    const updatedSku = await Sku.findOne({ sku: testSku.sku });
    console.log(`\n📦 מלאי סופי: ${updatedSku?.stockQuantity} (צפוי: 2)`);

    if (updatedSku?.stockQuantity !== 2) {
      console.error('❌ שגיאה: מלאי לא תואם!');
      process.exit(1);
    }

    // ============================================================================
    // בדיקה 2: Increment (החזרת מלאי)
    // ============================================================================
    console.log('\n🔄 שלב 3: בדיקת increment (החזרת מלאי)...');
    
    const incrementResult = await incrementStockAtomic(testSku.sku, 3);
    
    if (!incrementResult) {
      console.error('❌ שגיאה: increment נכשל');
      process.exit(1);
    }

    console.log(`✅ מלאי הוחזר: ${incrementResult.stockQuantity} (צפוי: 5)`);

    if (incrementResult.stockQuantity !== 5) {
      console.error('❌ שגיאה: מלאי לא תואם אחרי increment');
      process.exit(1);
    }

    // ============================================================================
    // בדיקה 3: Bulk Operations עם Transaction
    // ============================================================================
    console.log('\n📦 שלב 4: יצירת 2 SKUs נוספים לבדיקת bulk...');
    
    const sku2 = await Sku.create({
      sku: `TEST-BULK-1-${Date.now()}`,
      productId: testProduct._id,
      name: 'Test SKU 2',
      price: 89.99,
      stockQuantity: 10,
      isActive: true,
    });

    const sku3 = await Sku.create({
      sku: `TEST-BULK-2-${Date.now()}`,
      productId: testProduct._id,
      name: 'Test SKU 3',
      price: 79.99,
      stockQuantity: 8,
      isActive: true,
    });

    console.log(`✅ SKU 2: ${sku2.sku} (מלאי: ${sku2.stockQuantity})`);
    console.log(`✅ SKU 3: ${sku3.sku} (מלאי: ${sku3.stockQuantity})`);

    console.log('\n🔄 שלב 5: בדיקת bulk decrement (transaction)...');
    console.log('מנסה להוריד:');
    console.log(`  - ${testSku.sku}: 2 יחידות (יש 5 - צפוי להצליח)`);
    console.log(`  - ${sku2.sku}: 5 יחידות (יש 10 - צפוי להצליח)`);
    console.log(`  - ${sku3.sku}: 10 יחידות (יש רק 8 - צפוי להיכשל)`);
    console.log('  → כל ה-transaction צריך להתבטל!');

    const bulkResult = await bulkDecrementStockAtomic([
      { sku: testSku.sku, quantity: 2 },
      { sku: sku2.sku, quantity: 5 },
      { sku: sku3.sku, quantity: 10 }, // זה יכשיל הכל
    ]);

    console.log(`\n📊 תוצאת bulk: ${bulkResult.success ? '✅ הצליח' : '❌ נכשל (כצפוי)'}`);
    
    if (bulkResult.success) {
      console.error('❌ שגיאה: bulk היה צריך להיכשל!');
      process.exit(1);
    }

    console.log(`SKUs שנכשלו: ${bulkResult.failed?.join(', ')}`);

    // אימות שהמלאי לא השתנה (rollback)
    const [check1, check2, check3] = await Promise.all([
      Sku.findOne({ sku: testSku.sku }),
      Sku.findOne({ sku: sku2.sku }),
      Sku.findOne({ sku: sku3.sku }),
    ]);

    console.log('\n📦 מלאי אחרי rollback:');
    console.log(`  - ${testSku.sku}: ${check1?.stockQuantity} (צפוי: 5 - לא השתנה)`);
    console.log(`  - ${sku2.sku}: ${check2?.stockQuantity} (צפוי: 10 - לא השתנה)`);
    console.log(`  - ${sku3.sku}: ${check3?.stockQuantity} (צפוי: 8 - לא השתנה)`);

    if (check1?.stockQuantity !== 5 || check2?.stockQuantity !== 10 || check3?.stockQuantity !== 8) {
      console.error('❌ שגיאה: rollback לא עבד! המלאי השתנה');
      process.exit(1);
    }

    console.log('✅ Transaction rollback עבד! המלאי לא השתנה');

    // ============================================================================
    // בדיקה 4: Bulk Decrement מוצלח
    // ============================================================================
    console.log('\n🔄 שלב 6: בדיקת bulk decrement מוצלח...');
    console.log('מנסה להוריד כמויות תקינות:');
    console.log(`  - ${testSku.sku}: 2 יחידות`);
    console.log(`  - ${sku2.sku}: 5 יחידות`);

    const bulkSuccess = await bulkDecrementStockAtomic([
      { sku: testSku.sku, quantity: 2 },
      { sku: sku2.sku, quantity: 5 },
    ]);

    console.log(`\n📊 תוצאה: ${bulkSuccess.success ? '✅ הצליח' : '❌ נכשל'}`);

    if (!bulkSuccess.success) {
      console.error('❌ שגיאה: bulk היה צריך להצליח!');
      process.exit(1);
    }

    // אימות מלאי
    const [final1, final2] = await Promise.all([
      Sku.findOne({ sku: testSku.sku }),
      Sku.findOne({ sku: sku2.sku }),
    ]);

    console.log('\n📦 מלאי סופי:');
    console.log(`  - ${testSku.sku}: ${final1?.stockQuantity} (צפוי: 3)`);
    console.log(`  - ${sku2.sku}: ${final2?.stockQuantity} (צפוי: 5)`);

    if (final1?.stockQuantity !== 3 || final2?.stockQuantity !== 5) {
      console.error('❌ שגיאה: מלאי לא תואם!');
      process.exit(1);
    }

    console.log('✅ Bulk decrement הצליח!');

    // ============================================================================
    // בדיקה 5: Bulk Increment
    // ============================================================================
    console.log('\n🔄 שלב 7: בדיקת bulk increment...');
    
    const bulkIncrement = await bulkIncrementStockAtomic([
      { sku: testSku.sku, quantity: 2 },
      { sku: sku2.sku, quantity: 5 },
    ]);

    console.log(`\n📊 תוצאה: ${bulkIncrement ? '✅ הצליח' : '❌ נכשל'}`);

    if (!bulkIncrement) {
      console.error('❌ שגיאה: bulk increment נכשל');
      process.exit(1);
    }

    // אימות החזרת מלאי
    const [restored1, restored2] = await Promise.all([
      Sku.findOne({ sku: testSku.sku }),
      Sku.findOne({ sku: sku2.sku }),
    ]);

    console.log('\n📦 מלאי אחרי increment:');
    console.log(`  - ${testSku.sku}: ${restored1?.stockQuantity} (צפוי: 5)`);
    console.log(`  - ${sku2.sku}: ${restored2?.stockQuantity} (צפוי: 10)`);

    if (restored1?.stockQuantity !== 5 || restored2?.stockQuantity !== 10) {
      console.error('❌ שגיאה: מלאי לא תואם אחרי bulk increment');
      process.exit(1);
    }

    console.log('✅ Bulk increment הצליח!');

    // ניקוי
    console.log('\n🧹 ניקוי נתוני טסט...');
    await Product.deleteOne({ _id: testProduct._id });
    console.log('✅ נתוני טסט נמחקו (cascade delete ימחק את ה-SKUs)');

    console.log('\n🎉 כל הבדיקות עברו בהצלחה!\n');
    console.log('סיכום:');
    console.log('  ✅ Race condition נמנע - רק הזמנה אחת הצליחה');
    console.log('  ✅ Atomic decrement עובד');
    console.log('  ✅ Atomic increment עובד');
    console.log('  ✅ Bulk operations עם transaction עובדות');
    console.log('  ✅ Transaction rollback עובד');
    console.log('  ✅ אין overselling!\n');

  } catch (error) {
    console.error('❌ שגיאה בבדיקה:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 התנתקות ממסד נתונים');
  }
}

// הרצה
testAtomicStock();
