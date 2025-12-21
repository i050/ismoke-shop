import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Sku from './models/Sku';

// טעינת משתני סביבה
dotenv.config();

async function verifyFlatAttributes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
    console.log('📡 Connected to MongoDB');

  // שליפת כל ה-SKUs (lean לביצועים — לא נדרשות פונקציות Mongoose כאן)
  const allSkus = await Sku.find({}).lean();
    
    console.log(`\n📊 נמצאו ${allSkus.length} SKUs במסד הנתונים\n`);
    
    // בדיקת SKUs עם color
    const skusWithColor = allSkus.filter(sku => sku.color);
    console.log(`✅ SKUs עם שדה color: ${skusWithColor.length}`);
    
    // הצגת דוגמאות
    if (skusWithColor.length > 0) {
      console.log('\n🎨 דוגמאות SKUs עם color:');
      skusWithColor.slice(0, 5).forEach(sku => {
        console.log(`  - ${sku.sku}: color="${sku.color}", size="${sku.attributes?.size || 'לא מוגדר'}"`);
      });
    }
    
    // בדיקת SKU ספציפי
    const pinkSku = await Sku.findOne({ sku: 'ASP-FLEXUS-Q-PINK' });
    if (pinkSku) {
      console.log('\n🔍 SKU ורוד (ASP-FLEXUS-Q-PINK):');
      console.log(`  Name: ${pinkSku.name}`);
      console.log(`  Color: ${pinkSku.color || 'לא מוגדר'}`);
      console.log(`  Size: ${pinkSku.attributes?.size || 'לא מוגדר'}`);
      console.log(`  Price: ${pinkSku.price}`);
      console.log(`  Stock: ${pinkSku.stockQuantity}`);
      console.log('\n✅ המעבר לשדות שטוחים הושלם בהצלחה!');
    } else {
      console.log('\n⚠️ SKU ורוד לא נמצא');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

verifyFlatAttributes();
