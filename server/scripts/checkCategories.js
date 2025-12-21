require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const db = mongoose.connection.db;
  
  const products = await db.collection('products').find({}).project({ name: 1, categoryId: 1 }).toArray();
  const categories = await db.collection('categories').find({}).toArray();
  
  console.log('=== מוצרים וקטגוריות ===');
  
  for (const p of products.slice(0, 10)) {
    const cat = categories.find(c => c._id.toString() === p.categoryId?.toString());
    const isChild = cat?.parentId ? '(תת-קטגוריה)' : '(ראשית)';
    console.log(p.name, '->', cat?.name || 'ללא קטגוריה', isChild);
  }
  
  const accessories = categories.find(c => c.name === 'אביזרים');
  console.log('\n=== קטגוריית אביזרים ID ===');
  console.log(accessories?._id?.toString());
  
  // תתי קטגוריות של אביזרים
  const subCats = categories.filter(c => c.parentId?.toString() === accessories?._id?.toString());
  console.log('\n=== תתי-קטגוריות של אביזרים ===');
  subCats.forEach(c => console.log(c.name, '-', c._id.toString()));
  
  console.log('\n=== מוצרים לפי קטגוריה ===');
  const catCounts = {};
  for (const p of products) {
    const catId = p.categoryId?.toString() || 'none';
    catCounts[catId] = (catCounts[catId] || 0) + 1;
  }
  for (const [catId, count] of Object.entries(catCounts)) {
    const cat = categories.find(c => c._id.toString() === catId);
    console.log(cat?.name || 'ללא קטגוריה', ':', count, 'מוצרים');
  }
  
  process.exit(0);
}
check();
