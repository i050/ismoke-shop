/**
 * מחיקת index מיותר של slug מ-brands collection
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanupIndexes = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGO_URI);
    console.log('✅ מחובר ל-MongoDB\n');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('לא הצלחנו להתחבר למסד הנתונים');
    }
    
    const collection = db.collection('brands');
    
    // הצגת indexes קיימים
    console.log('📋 Indexes קיימים:');
    const existingIndexes = await collection.indexes();
    existingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // מחיקת slug_1 index
    try {
      console.log('\n🗑️  מוחק index מיותר של slug...');
      await collection.dropIndex('slug_1');
      console.log('✅ Index slug_1 נמחק בהצלחה!');
    } catch (error: any) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index slug_1 לא נמצא (כבר נמחק)');
      } else {
        throw error;
      }
    }
    
    // הצגת indexes אחרי הניקוי
    console.log('\n📋 Indexes אחרי הניקוי:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ סיים!');
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

cleanupIndexes();
