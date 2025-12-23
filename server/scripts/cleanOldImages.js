// סקריפט לניקוי תמונות ישנות (Cloudinary/string) מהמוצרים
// הסיבה: מעבר ל-DigitalOcean Spaces - תמונות ישנות לא תואמות למבנה החדש
// שימוש: node scripts/cleanOldImages.js

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanOldImages() {
  try {
    // התחברות ל-MongoDB
    console.log('🔗 מתחבר ל-MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ התחברות הצליחה!');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    const skusCollection = db.collection('skus'); // ✅ אוסף נפרד לווריאנטים
    const bannersCollection = db.collection('banners'); // ✅ אוסף נפרד לבאנרים

    // 1. ספירת מוצרים עם תמונות ישנות
    const productsWithOldImages = await productsCollection.countDocuments({
      $or: [
        { 'images.0': { $type: 'string' } }, // תמונה כ-string
        { 'images.url': { $exists: true } }, // תמונה Cloudinary ישנה
      ]
    });

    console.log(`📊 נמצאו ${productsWithOldImages} מוצרים עם תמונות ישנות`);

    // 2. ספירת SKUs/וריאנטים עם תמונות ישנות (אוסף נפרד!)
    const skusWithOldImages = await skusCollection.countDocuments({
      $or: [
        { 'images.0': { $type: 'string' } },
        { 'images.url': { $exists: true } },
      ]
    });

    console.log(`📊 נמצאו ${skusWithOldImages} SKUs/וריאנטים עם תמונות ישנות`);

    // 3. ספירת באנרים עם תמונות ישנות
    const bannersWithOldImages = await bannersCollection.countDocuments({
      $or: [
        { 'image': { $type: 'string' } },
        { 'image.url': { $exists: true } },
        { 'imageUrl': { $exists: true } },
      ]
    });

    console.log(`📊 נמצאו ${bannersWithOldImages} באנרים עם תמונות ישנות`);

    if (productsWithOldImages === 0 && skusWithOldImages === 0 && bannersWithOldImages === 0) {
      console.log('✨ אין תמונות ישנות למחיקה!');
      process.exit(0);
    }

    // 3. עדכון - מחיקת תמונות ישנות ברמת המוצר
    console.log('\n🧹 מנקה תמונות ישנות ברמת המוצר...');
    const resultProducts = await productsCollection.updateMany(
      {
        $or: [
          { 'images.0': { $type: 'string' } },
          { 'images.url': { $exists: true } },
        ]
      },
      {
        $set: { images: [] }
      }
    );

    console.log(`✅ עודכנו ${resultProducts.modifiedCount} מוצרים`);

    // 4. עדכון - מחיקת תמונות ישנות מ-SKUs/וריאנטים (אוסף נפרד!)
    console.log('\n🧹 מנקה תמונות ישנות מ-SKUs/וריאנטים...');
    
    const resultSkus = await skusCollection.updateMany(
      {
        $or: [
          { 'images.0': { $type: 'string' } },
          { 'images.url': { $exists: true } },
        ]
      },
      {
        $set: { images: [] }
      }
    );

    console.log(`✅ עודכנו ${resultSkus.modifiedCount} SKUs/וריאנטים`);

    // 5. עדכון - מחיקת תמונות ישנות מבאנרים
    console.log('\n🧹 מנקה תמונות ישנות מבאנרים...');
    
    const resultBanners = await bannersCollection.updateMany(
      {
        $or: [
          { 'image': { $type: 'string' } },
          { 'image.url': { $exists: true } },
          { 'imageUrl': { $exists: true } },
        ]
      },
      {
        $set: { 
          image: null,
          imageUrl: null,
          imagePublicId: null
        }
      }
    );

    console.log(`✅ עודכנו ${resultBanners.modifiedCount} באנרים`);

    // 6. סיכום
    console.log('\n✨ הניקוי הושלם בהצלחה!');
    console.log('📝 סיכום:');
    console.log(`   - מוצרים שעודכנו: ${resultProducts.modifiedCount}`);
    console.log(`   - SKUs/וריאנטים שעודכנו: ${resultSkus.modifiedCount}`);
    console.log(`   - באנרים שעודכנו: ${resultBanners.modifiedCount}`);
    console.log('\n💡 כעת תוכל לערוך מוצרים, וריאנטים ובאנרים ולהעלות תמונות חדשות במבנה DigitalOcean Spaces');

  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 התנתקות מ-MongoDB');
    process.exit(0);
  }
}

// הרצת הסקריפט
cleanOldImages();
