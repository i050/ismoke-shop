// סקריפט בדיקה - בודק מה הצבעים שמוחזרים מ-MongoDB
const mongoose = require('mongoose');

const checkSkuColors = async () => {
  try {
    // חיבור ל-MongoDB (ללא אופציות deprecated)
    await mongoose.connect('mongodb://localhost:27017/ecommerce');

    console.log('✅ מחובר ל-MongoDB');

    // שליפת כל ה-SKUs
    const Sku = mongoose.model('Sku', new mongoose.Schema({}, { strict: false }));
    const skus = await Sku.find({}).limit(10);

    console.log(`\n📦 נמצאו ${skus.length} SKUs:\n`);

    skus.forEach((sku, index) => {
      console.log(`\n--- SKU #${index + 1} ---`);
      console.log(`קוד SKU: ${sku.sku}`);
      console.log(`שם: ${sku.name}`);
      console.log(`מחיר: ${sku.price}`);
      console.log(`attributes (type): ${typeof sku.attributes}`);
      console.log(`attributes (value):`, sku.attributes);
      console.log(`attributes === null: ${sku.attributes === null}`);
      console.log(`attributes === undefined: ${sku.attributes === undefined}`);
      
      if (sku.attributes && typeof sku.attributes === 'object') {
        console.log(`attributes.color: ${sku.attributes.color || 'לא מוגדר'}`);
        console.log(`attributes.size: ${sku.attributes.size || 'לא מוגדר'}`);
      }
      
      // בדיקה ישירה של המסמך הגולמי
      console.log(`\nמסמך גולמי (JSON):`, JSON.stringify(sku.toObject(), null, 2));
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ החיבור נסגר');
  }
};

checkSkuColors();
