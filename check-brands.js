/**
 * סקריפט לבדיקת מותגים קיימים
 * הרץ עם: node check-brands.js
 */

const mongoose = require('mongoose');

// התחברות למסד נתונים
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ מחובר ל-MongoDB');
    
    const Brand = mongoose.model('Brand', new mongoose.Schema({
      name: String,
      isActive: Boolean,
    }));
    
    // חיפוש כל המותגים עם "ciggy" (case-insensitive)
    const brands = await Brand.find({
      name: { $regex: /ciggy/i }
    }).lean();
    
    console.log('\n📋 מותגים שנמצאו עם "ciggy":');
    console.log(JSON.stringify(brands, null, 2));
    
    // חיפוש כל המותגים
    const allBrands = await Brand.find({}).sort({ name: 1 }).lean();
    console.log('\n📋 כל המותגים במערכת:', allBrands.length);
    allBrands.forEach(b => {
      console.log(`  - ${b.name} (${b.isActive ? 'פעיל' : 'לא פעיל'})`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ סיים');
  })
  .catch(err => {
    console.error('❌ שגיאה:', err);
    process.exit(1);
  });
