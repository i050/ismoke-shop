import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Sku from '../models/Sku';

/**
 * סקריפט ניקוי: מחיקת כל ה-SKUs מהמסד נתונים
 * 
 * שימוש: npm run clean:skus
 * 
 * ⚠️ זהירות: פעולה זו תמחק את כל ה-SKUs!
 */

dotenv.config();

async function cleanSkus() {
  console.log('🧹 מתחיל ניקוי SKUs מהמסד נתונים...');
  console.log('⚠️  זהירות: פעולה זו תמחק את כל ה-SKUs!\n');

  try {
    // חיבור למסד נתונים
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ecommerce';

    console.log('📡 מתחבר למסד נתונים...');
    await mongoose.connect(mongoUri);
    console.log('✅ חיבור הצליח\n');

    // ספירת SKUs לפני מחיקה
    const countBefore = await Sku.countDocuments();
    console.log(`📊 נמצאו ${countBefore} SKUs במסד נתונים\n`);

    if (countBefore === 0) {
      console.log('ℹ️  אין SKUs למחיקה\n');
      return;
    }

    // הצגת דוגמה של SKUs שיימחקו
    const sampleSkus = await Sku.find().limit(5).select('sku name productId');
    console.log('📋 דוגמה של SKUs שיימחקו:');
    sampleSkus.forEach((sku, index) => {
      console.log(`  ${index + 1}. ${sku.sku} - ${sku.name}`);
    });
    console.log();

    // מחיקה
    console.log('🗑️  מוחק את כל ה-SKUs...');
    const result = await Sku.deleteMany({});
    console.log(`✅ נמחקו ${result.deletedCount} SKUs בהצלחה\n`);

    // אימות
    const countAfter = await Sku.countDocuments();
    console.log(`✓ SKUs שנותרו במסד נתונים: ${countAfter}\n`);

    console.log('✅ ניקוי הושלם בהצלחה!');
  } catch (error: any) {
    console.error('❌ שגיאה בניקוי SKUs:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 ניתוק ממסד הנתונים');
  }
}

// הפעלת הסקריפט
cleanSkus();
