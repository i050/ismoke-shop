const mongoose = require('mongoose');
require('dotenv').config();

async function checkSkuColors() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ מחובר ל-MongoDB\n');

    // שליפת ה-SKUs ישירות
    const db = mongoose.connection.db;
    const skusCollection = db.collection('skus');
    
    const skus = await skusCollection.find({}).limit(10).toArray();

    console.log(`📦 נמצאו ${skus.length} SKUs במונגו:\n`);

    skus.forEach((sku, index) => {
      console.log(`\n=== SKU #${index + 1} ===`);
      console.log(`קוד: ${sku.sku}`);
      console.log(`שם: ${sku.name}`);
      console.log(`מחיר: ${sku.price}`);
      console.log(`\n🎨 attributes:`);
      console.log(`  - טיפוס: ${typeof sku.attributes}`);
      console.log(`  - ערך: ${JSON.stringify(sku.attributes)}`);
      console.log(`  - null? ${sku.attributes === null}`);
      console.log(`  - undefined? ${sku.attributes === undefined}`);
      
      if (sku.attributes && typeof sku.attributes === 'object') {
        console.log(`\n  📌 תכונות ספציפיות:`);
        console.log(`     color: ${sku.attributes.color || '❌ לא קיים'}`);
        console.log(`     size: ${sku.attributes.size || '❌ לא קיים'}`);
      }
      
      console.log(`\n📄 מסמך מלא:`);
      console.log(JSON.stringify(sku, null, 2));
    });

    await mongoose.disconnect();
    console.log('\n\n✅ בדיקה הושלמה');

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkSkuColors();
