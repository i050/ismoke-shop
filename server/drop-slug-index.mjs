// FIX: מחיקת slug index
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ MONGO_URI לא נמצא ב-.env');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ מחובר ל-MongoDB');
  
  const db = client.db('ecommerceDB');
  const collection = db.collection('brands');
  
  // רשימת indexes לפני
  const indexesBefore = await collection.indexes();
  console.log('\n📋 Indexes לפני:');
  indexesBefore.forEach(idx => console.log(`  - ${idx.name}`));
  
  // מחיקת slug_1
  try {
    await collection.dropIndex('slug_1');
    console.log('\n✅ Index slug_1 נמחק!');
  } catch (error) {
    console.log('\n⚠️  Index slug_1 לא נמצא:', error.message);
  }
  
  // רשימת indexes אחרי
  const indexesAfter = await collection.indexes();
  console.log('\n📋 Indexes אחרי:');
  indexesAfter.forEach(idx => console.log(`  - ${idx.name}`));
  
  await client.close();
  console.log('\n✅ סיום!');
  process.exit(0);
} catch (error) {
  console.error('❌ שגיאה:', error.message);
  await client.close();
  process.exit(1);
}

