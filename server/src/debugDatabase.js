const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

let output = '';
function log(message) {
  console.log(message);
  output += message + '\n';
}

async function debugDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    log('🔗 מחובר לדאטהבייס');

    const Category = require('./models/Category').default;
    const Product = require('./models/Product').default;

    // בדיקת קטגוריות
    log('\n📁 קטגוריות בדאטהבייס:');
  const categories = await Category.find({}).sort({ level: 1, sortOrder: 1 }).lean();
    
    const categoryLevels = {};
    categories.forEach(cat => {
      if (!categoryLevels[cat.level]) categoryLevels[cat.level] = [];
      categoryLevels[cat.level].push(cat);
      log(`רמה ${cat.level}: "${cat.name}" (${cat.slug}) ${cat.parentSlug ? `← ${cat.parentSlug}` : ''}`);
    });

    log('\n📊 סיכום רמות:');
    Object.keys(categoryLevels).forEach(level => {
      log(`רמה ${level}: ${categoryLevels[level].length} קטגוריות`);
    });

    // בדיקת מוצרים
    log('\n🛍️ דוגמה של מוצרים:');
  const products = await Product.find({}).populate('categoryId').limit(5).lean();
    products.forEach(product => {
      const cat = product.categoryId;
      log(`"${product.name}" → "${cat?.name}" (רמה ${cat?.level}, slug: ${cat?.slug})`);
    });

    // בדיקת התפלגות מוצרים לפי רמות
    log('\n📈 התפלגות מוצרים לפי רמות קטגוריה:');
    for (let level = 0; level <= 2; level++) {
      const categoriesAtLevel = await Category.find({ level }).select('_id');
      const productCount = await Product.countDocuments({ 
        categoryId: { $in: categoriesAtLevel.map(c => c._id) } 
      });
      log(`רמה ${level}: ${productCount} מוצרים`);
    }

    // כתיבה לקובץ
    fs.writeFileSync('./debug-output.txt', output);
    log('\n💾 נתונים נשמרו ב-debug-output.txt');

    await mongoose.disconnect();
  } catch (error) {
    log('❌ שגיאה: ' + error.message);
    fs.writeFileSync('./debug-output.txt', output);
  }
}

debugDatabase();
