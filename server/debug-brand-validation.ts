/**
 * סקריפט לבדיקת הולידציה של מותגים
 */

import mongoose from 'mongoose';
import Brand from './src/models/Brand';
import dotenv from 'dotenv';

dotenv.config();

const debugValidation = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGO_URI);
    console.log('✅ מחובר ל-MongoDB\n');
    
    // 1. בדיקת כל המותגים
    console.log('═══════════════════════════════════════');
    console.log('📋 כל המותגים במערכת:');
    console.log('═══════════════════════════════════════');
    const allBrands = await Brand.find({}).lean();
    allBrands.forEach((b, i) => {
      console.log(`${i + 1}. "${b.name}"`);
      console.log(`   ID: ${b._id}`);
      console.log(`   isActive: ${b.isActive}`);
      console.log(`   ASCII: ${[...b.name].map(c => c.charCodeAt(0)).join(',')}`);
      console.log('');
    });
    
    // 2. בדיקת indexes
    console.log('═══════════════════════════════════════');
    console.log('🔍 Indexes על brands collection:');
    console.log('═══════════════════════════════════════');
    const db = mongoose.connection.db;
    if (db) {
      const collection = db.collection('brands');
      const indexes = await collection.indexes();
      indexes.forEach(idx => {
        console.log(`\nIndex: ${idx.name}`);
        console.log(`  Key: ${JSON.stringify(idx.key)}`);
        if (idx.unique) console.log(`  Unique: true`);
        if (idx.collation) {
          console.log(`  Collation:`);
          console.log(`    locale: ${idx.collation.locale}`);
          console.log(`    strength: ${idx.collation.strength}`);
        }
      });
    }
    
    // 3. סימולציה של הבדיקה
    const testName = 'Ciggy';
    console.log('\n═══════════════════════════════════════');
    console.log(`🧪 בדיקת הולידציה עבור: "${testName}"`);
    console.log('═══════════════════════════════════════');
    
    // בדיקה ללא collation
    console.log('\n1️⃣ חיפוש רגיל (ללא collation):');
    const withoutCollation = await Brand.findOne({ name: testName.trim() }).lean();
    console.log(`   תוצאה: ${withoutCollation ? `נמצא - "${withoutCollation.name}"` : 'לא נמצא ✅'}`);
    
    // בדיקה עם collation
    console.log('\n2️⃣ חיפוש עם collation (case-insensitive):');
    const withCollation = await Brand.findOne({ name: testName.trim() })
      .collation({ locale: 'en', strength: 2 })
      .lean();
    console.log(`   תוצאה: ${withCollation ? `נמצא - "${withCollation.name}" ❌` : 'לא נמצא ✅'}`);
    
    // בדיקות נוספות עם וריאציות
    const variations = ['ciggy', 'CIGGY', 'CiGgY', 'ciggy ', ' ciggy'];
    console.log('\n3️⃣ בדיקת וריאציות:');
    for (const variant of variations) {
      const found = await Brand.findOne({ name: variant.trim() })
        .collation({ locale: 'en', strength: 2 })
        .lean();
      console.log(`   "${variant}" → ${found ? `נמצא "${found.name}" ❌` : 'לא נמצא ✅'}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ סיים');
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

debugValidation();
