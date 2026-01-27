/**
 * Migration: עדכון Brand index ל-case-insensitive
 * 
 * המטרה: להחליף את ה-unique index הרגיל ב-unique index עם collation
 * זה ימנע כפילויות של מותגים עם אותיות גדולות/קטנות שונות
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrateBrandIndex = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGO_URI);
    console.log('✅ מחובר ל-MongoDB');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('לא הצלחנו להתחבר למסד הנתונים');
    }
    
    const collection = db.collection('brands');
    
    // שלב 1: בדיקת indexes קיימים
    console.log('\n📋 Indexes קיימים:');
    const existingIndexes = await collection.indexes();
    existingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // שלב 2: מחיקת ה-index הישן של name (אם קיים)
    try {
      console.log('\n🗑️  מוחק index ישן של name...');
      await collection.dropIndex('name_1');
      console.log('✅ Index ישן נמחק');
    } catch (error: any) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index name_1 לא נמצא (זה בסדר)');
      } else {
        throw error;
      }
    }
    
    // שלב 3: יצירת index חדש עם collation case-insensitive
    console.log('\n📝 יוצר index חדש עם collation...');
    await collection.createIndex(
      { name: 1 },
      {
        unique: true,
        collation: { locale: 'en', strength: 2 }, // strength: 2 = case-insensitive
        name: 'name_1_case_insensitive'
      }
    );
    console.log('✅ Index חדש נוצר בהצלחה!');
    
    // שלב 4: בדיקת indexes לאחר השינוי
    console.log('\n📋 Indexes אחרי העדכון:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.collation) {
        console.log(`    Collation: locale=${idx.collation.locale}, strength=${idx.collation.strength}`);
      }
    });
    
    // שלב 5: בדיקת כפילויות אפשריות
    console.log('\n🔍 בודק כפילויות אפשריות...');
    const brands = await collection.find({}).toArray();
    const nameMap = new Map<string, any[]>();
    
    brands.forEach(brand => {
      const lowerName = brand.name.toLowerCase();
      if (!nameMap.has(lowerName)) {
        nameMap.set(lowerName, []);
      }
      nameMap.get(lowerName)!.push(brand);
    });
    
    let duplicatesFound = false;
    nameMap.forEach((duplicates, lowerName) => {
      if (duplicates.length > 1) {
        duplicatesFound = true;
        console.log(`\n⚠️  כפילות נמצאה: "${lowerName}"`);
        duplicates.forEach(b => {
          console.log(`   - "${b.name}" (ID: ${b._id})`);
        });
      }
    });
    
    if (!duplicatesFound) {
      console.log('✅ לא נמצאו כפילויות!');
    } else {
      console.log('\n⚠️  נמצאו כפילויות! תצטרך למזג/למחוק אותן ידנית.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Migration הושלם!');
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

migrateBrandIndex();
