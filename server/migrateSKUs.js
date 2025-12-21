const mongoose = require('mongoose');
require('dotenv').config();

async function migrateSKUsAttributes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ מחובר ל-MongoDB\n');

    const db = mongoose.connection.db;
    const skusCollection = db.collection('skus');
    
    // מציאת כל ה-SKUs שאין להם attributes או שה-attributes שלהם null
    const skusWithoutAttributes = await skusCollection.find({
      $or: [
        { attributes: { $exists: false } },
        { attributes: null }
      ]
    }).toArray();

    console.log(`📦 נמצאו ${skusWithoutAttributes.length} SKUs שצריכים תיקון\n`);

    if (skusWithoutAttributes.length === 0) {
      console.log('✨ כל ה-SKUs כבר מתוקנים!');
      await mongoose.disconnect();
      return;
    }

    // עדכון כל ה-SKUs
    const result = await skusCollection.updateMany(
      {
        $or: [
          { attributes: { $exists: false } },
          { attributes: null }
        ]
      },
      {
        $set: { attributes: {} }
      }
    );

    console.log(`✅ עודכנו ${result.modifiedCount} SKUs`);
    console.log(`📊 תוצאות:`);
    console.log(`   - נמצאו: ${result.matchedCount} מסמכים`);
    console.log(`   - עודכנו: ${result.modifiedCount} מסמכים`);

    // בדיקה אחרי העדכון
    console.log('\n🔍 בדיקת מדגם אחרי העדכון:');
    const samplesAfter = await skusCollection.find({}).limit(3).toArray();
    samplesAfter.forEach((sku, index) => {
      console.log(`\n  SKU ${index + 1}: ${sku.sku}`);
      console.log(`    attributes: ${JSON.stringify(sku.attributes)}`);
      console.log(`    type: ${typeof sku.attributes}`);
    });

    await mongoose.disconnect();
    console.log('\n\n✅ מיגרציה הושלמה בהצלחה!');

  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateSKUsAttributes();
