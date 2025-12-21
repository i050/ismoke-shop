const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Category = mongoose.model('Category', new mongoose.Schema({
    name: String,
    parentId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean
  }));
  
  // עדכן את כל הקטגוריות שאין להן isActive להיות true
  const result = await Category.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  
  console.log('עודכנו', result.modifiedCount, 'קטגוריות');
  
  // בדיקה
  const cats = await Category.find({}).select('name isActive');
  console.log('\nכל הקטגוריות אחרי העדכון:');
  cats.forEach(c => console.log(c.name, '- isActive:', c.isActive));
  
  await mongoose.disconnect();
}

fix().catch(console.error);
