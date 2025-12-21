import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Sku from '../models/Sku';
import connectDB from '../config/database';

// טעינת משתני סביבה
dotenv.config();

/**
 * Migration Script: יצירת Unique Index על SKU
 * 
 * מטרה:
 * 1. לוודא שיש unique index על שדה sku ב-collection
 * 2. לזהות ולהסיר duplicates אם קיימים
 * 3. למנוע race conditions עתידיים
 * 
 * הרצה:
 * ts-node src/scripts/createSkuIndex.ts
 */

async function createSkuIndex() {
  try {
    console.log('🔗 מתחבר למסד נתונים...');
    await connectDB();

    console.log('🔍 בודק duplicates קיימים...');
    
    // שלב 1: מציאת duplicates
    const duplicates = await Sku.aggregate([
      {
        $group: {
          _id: '$sku',
          count: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️  נמצאו ${duplicates.length} SKU duplicates:`);
      
      for (const dup of duplicates) {
        console.log(`   - SKU: ${dup._id} (${dup.count} עותקים)`);
        
        // שמירת העותק הראשון, מחיקת השאר
        const [keepId, ...deleteIds] = dup.ids;
        
        console.log(`     שומר: ${keepId}`);
        console.log(`     מוחק: ${deleteIds.join(', ')}`);
        
        // מחיקת duplicates
        await Sku.deleteMany({
          _id: { $in: deleteIds },
        });
      }
      
      console.log('✅ Duplicates הוסרו בהצלחה');
    } else {
      console.log('✅ לא נמצאו duplicates');
    }

    // שלב 2: הסרת indexes קיימים (למניעת קונפליקטים)
    console.log('🗑️  מסיר indexes קיימים...');
    try {
      await Sku.collection.dropIndex('sku_1');
      console.log('   Index ישן הוסר');
    } catch (error) {
      console.log('   אין index ישן (זה תקין)');
    }

    // שלב 3: יצירת unique index חדש
    console.log('🔧 יוצר unique index על sku...');
    await Sku.collection.createIndex(
      { sku: 1 },
      {
        unique: true,
        name: 'sku_unique_index',
        background: false, // foreground למסד מקומי (מהיר)
      }
    );
    console.log('✅ Unique index נוצר בהצלחה');

    // שלב 4: אימות
    console.log('🔍 מאמת indexes...');
    const indexes = await Sku.collection.indexes();
    const skuIndex = indexes.find((idx) => idx.key.sku);
    
    if (skuIndex && skuIndex.unique) {
      console.log('✅ Index מאומת - unique: true');
      console.log(`   שם: ${skuIndex.name}`);
      console.log(`   מפתח: sku (${skuIndex.key.sku === 1 ? 'ascending' : 'descending'})`);
    } else {
      console.error('❌ Index לא נוצר כראוי!');
      process.exit(1);
    }

    // שלב 5: בדיקת duplicates עתידיים
    console.log('🧪 בודק שלא ניתן ליצור duplicates...');
    try {
      // ניסיון ליצור 2 SKUs עם אותו קוד
      const testSku = `TEST-${Date.now()}`;
      
      await Sku.create({
        sku: testSku,
        productId: new mongoose.Types.ObjectId(),
        name: 'Test SKU 1',
        price: 100,
        stockQuantity: 10,
      });
      
      // זה צריך להיכשל
      try {
        await Sku.create({
          sku: testSku, // אותו SKU
          productId: new mongoose.Types.ObjectId(),
          name: 'Test SKU 2',
          price: 200,
          stockQuantity: 20,
        });
        
        console.error('❌ שגיאה: הצליח ליצור duplicate! Index לא עובד');
        process.exit(1);
      } catch (dupError: any) {
        if (dupError.code === 11000) {
          console.log('✅ Unique constraint עובד - duplicate נחסם');
        } else {
          throw dupError;
        }
      }
      
      // ניקוי
      await Sku.deleteOne({ sku: testSku });
      console.log('🧹 Test SKU נמחק');
      
    } catch (testError) {
      console.error('❌ בדיקה נכשלה:', testError);
      process.exit(1);
    }

    console.log('\n🎉 Migration הושלם בהצלחה!\n');
    console.log('סיכום:');
    console.log('  ✅ Duplicates הוסרו');
    console.log('  ✅ Unique index נוצר');
    console.log('  ✅ אימות עבר בהצלחה');
    console.log('  ✅ Race conditions נמנעים ברמת DB\n');

  } catch (error) {
    console.error('❌ שגיאה במהלך Migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 התנתקות ממסד נתונים');
  }
}

// הרצה
createSkuIndex();
