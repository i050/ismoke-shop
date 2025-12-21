import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Sku from '../models/Sku';
import connectDB from '../config/database';

// טעינת משתני סביבה
dotenv.config();

/**
 * Test Script: בדיקת Cascade Delete
 * 
 * מטרה:
 * 1. יצירת מוצר טסט עם 3 SKUs
 * 2. בדיקה שה-SKUs קיימים
 * 3. מחיקת המוצר
 * 4. אימות שה-SKUs נמחקו אוטומטית
 * 
 * הרצה:
 * ts-node src/scripts/testCascadeDelete.ts
 */

async function testCascadeDelete() {
  try {
    console.log('🔗 מתחבר למסד נתונים...');
    await connectDB();

    console.log('\n📦 שלב 1: יצירת מוצר טסט עם SKUs...');
    
    // יצירת מוצר טסט
    const testProduct = await Product.create({
      name: 'Test Product for Cascade Delete',
      description: 'This product will be deleted to test cascade',
      basePrice: 99.99,
      quantityInStock: 100,
      stockQuantity: 100,
      isActive: true,
    });

    console.log(`✅ מוצר נוצר: ${testProduct._id}`);

    // יצירת 3 SKUs למוצר
    const testSkus = await Sku.insertMany([
      {
        sku: `TEST-CASCADE-1-${Date.now()}`,
        productId: testProduct._id,
        name: 'Test SKU 1',
        price: 99.99,
        stockQuantity: 30,
        attributes: { color: 'Red' },
        isActive: true,
      },
      {
        sku: `TEST-CASCADE-2-${Date.now()}`,
        productId: testProduct._id,
        name: 'Test SKU 2',
        price: 109.99,
        stockQuantity: 35,
        attributes: { color: 'Blue' },
        isActive: true,
      },
      {
        sku: `TEST-CASCADE-3-${Date.now()}`,
        productId: testProduct._id,
        name: 'Test SKU 3',
        price: 119.99,
        stockQuantity: 35,
        attributes: { color: 'Green' },
        isActive: true,
      },
    ]);

    console.log(`✅ ${testSkus.length} SKUs נוצרו`);

    console.log('\n🔍 שלב 2: אימות שה-SKUs קיימים...');
    const skusBeforeDelete = await Sku.find({ productId: testProduct._id });
    console.log(`✅ נמצאו ${skusBeforeDelete.length} SKUs למוצר`);
    
    if (skusBeforeDelete.length !== 3) {
      console.error('❌ שגיאה: מספר SKUs לא תואם!');
      process.exit(1);
    }

    console.log('\n🗑️  שלב 3: מחיקת המוצר (cascade delete)...');
    await Product.deleteOne({ _id: testProduct._id });
    console.log('✅ מוצר נמחק');

    console.log('\n🔍 שלב 4: בדיקה שה-SKUs נמחקו אוטומטית...');
    const skusAfterDelete = await Sku.find({ productId: testProduct._id });
    console.log(`📊 נמצאו ${skusAfterDelete.length} SKUs למוצר (צריך להיות 0)`);

    if (skusAfterDelete.length === 0) {
      console.log('✅ Cascade delete עובד! כל ה-SKUs נמחקו אוטומטית');
    } else {
      console.error('❌ שגיאה: SKUs לא נמחקו!');
      console.error('SKUs שנשארו:', skusAfterDelete.map(s => s.sku));
      process.exit(1);
    }

    console.log('\n🧪 שלב 5: בדיקת deleteMany (מספר מוצרים)...');
    
    // יצירת 2 מוצרים נוספים
    const testProducts = await Product.insertMany([
      {
        name: 'Test Product A',
        description: 'Test A',
        basePrice: 50,
        quantityInStock: 50,
        stockQuantity: 50,
      },
      {
        name: 'Test Product B',
        description: 'Test B',
        basePrice: 60,
        quantityInStock: 60,
        stockQuantity: 60,
      },
    ]);

    console.log(`✅ ${testProducts.length} מוצרים נוצרו`);

    // יצירת SKUs לכל מוצר
    const bulkSkus = [];
    for (const product of testProducts) {
      bulkSkus.push({
        sku: `TEST-BULK-${product._id}-1`,
        productId: product._id,
        name: `SKU for ${product.name}`,
        price: product.basePrice,
        stockQuantity: 10,
        isActive: true,
      });
    }

    await Sku.insertMany(bulkSkus);
    console.log(`✅ ${bulkSkus.length} SKUs נוצרו`);

    // מחיקת כל המוצרים בבת אחת
    const productIds = testProducts.map(p => p._id);
    await Product.deleteMany({ _id: { $in: productIds } });
    console.log('✅ כל המוצרים נמחקו');

    // בדיקה שכל ה-SKUs נמחקו
    const remainingSkus = await Sku.find({ productId: { $in: productIds } });
    console.log(`📊 נמצאו ${remainingSkus.length} SKUs (צריך להיות 0)`);

    if (remainingSkus.length === 0) {
      console.log('✅ deleteMany cascade עובד!');
    } else {
      console.error('❌ שגיאה: SKUs לא נמחקו ב-deleteMany');
      process.exit(1);
    }

    console.log('\n🎉 כל הבדיקות עברו בהצלחה!\n');
    console.log('סיכום:');
    console.log('  ✅ Cascade delete עובד ל-deleteOne');
    console.log('  ✅ Cascade delete עובד ל-deleteMany');
    console.log('  ✅ Referential integrity נשמרת');
    console.log('  ✅ אין SKUs יתומים\n');

  } catch (error) {
    console.error('❌ שגיאה בבדיקה:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 התנתקות ממסד נתונים');
  }
}

// הרצה
testCascadeDelete();
