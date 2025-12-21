const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB connection...');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ Connected to MongoDB successfully');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    // בדיקת קטגוריות
    const db = mongoose.connection.db;
    const categories = await db.collection('categories').find({}).sort({ level: 1, sortOrder: 1 }).toArray();
    
    console.log('\n📁 קטגוריות בדאטהבייס:');
    console.log('מספר קטגוריות:', categories.length);
    
    const categoryLevels = {};
    categories.forEach(cat => {
      if (!categoryLevels[cat.level]) categoryLevels[cat.level] = [];
      categoryLevels[cat.level].push(cat);
      console.log(`רמה ${cat.level}: "${cat.name}" (${cat.slug}) ${cat.parentSlug ? `← ${cat.parentSlug}` : ''}`);
    });

    console.log('\n📊 סיכום רמות:');
    Object.keys(categoryLevels).forEach(level => {
      console.log(`רמה ${level}: ${categoryLevels[level].length} קטגוריות`);
    });

    // בדיקת מוצרים
    const products = await db.collection('products').find({}).limit(5).toArray();
    console.log('\n🛍️ דוגמה של מוצרים:');
    products.forEach(product => {
      console.log(`"${product.name}" → categoryId: ${product.categoryId}`);
    });
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
