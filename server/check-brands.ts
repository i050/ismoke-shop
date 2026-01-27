/**
 * סקריפט לבדיקת מותגים קיימים
 */

import mongoose from 'mongoose';
import Brand from './src/models/Brand';
import dotenv from 'dotenv';

// טען משתני סביבה
dotenv.config();

const checkBrands = async () => {
  try {
    // התחברות למסד נתונים
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGO_URI);
    console.log('✅ מחובר ל-MongoDB');
    
    // חיפוש כל המותגים עם "ciggy" (case-insensitive)
    const ciggyBrands = await Brand.find({
      name: { $regex: /ciggy/i }
    }).lean();
    
    console.log('\n📋 מותגים שנמצאו עם "ciggy":');
    if (ciggyBrands.length === 0) {
      console.log('  ⚠️  לא נמצאו מותגים עם "ciggy"');
    } else {
      ciggyBrands.forEach(b => {
        console.log(`  - "${b.name}" (${b.isActive ? 'פעיל ✅' : 'לא פעיל ❌'})`);
        console.log(`    ID: ${b._id}`);
      });
    }
    
    // חיפוש כל המותגים
    const allBrands = await Brand.find({}).sort({ name: 1 }).lean();
    console.log(`\n📋 סה"כ ${allBrands.length} מותגים במערכת:`);
    allBrands.forEach(b => {
      console.log(`  - "${b.name}" (${b.isActive ? 'פעיל ✅' : 'לא פעיל ❌'})`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ סיים');
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

checkBrands();
