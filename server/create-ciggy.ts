/**
 * סקריפט ליצירת מותג "Ciggy"
 */

import mongoose from 'mongoose';
import Brand from './src/models/Brand';
import dotenv from 'dotenv';

dotenv.config();

const createCiggyBrand = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGO_URI);
    console.log('✅ מחובר ל-MongoDB');
    
    // בדיקה אם המותג כבר קיים
    const existing = await Brand.findOne({
      name: { $regex: /^ciggy$/i }
    });
    
    if (existing) {
      console.log('⚠️  המותג "Ciggy" כבר קיים:');
      console.log(`   ID: ${existing._id}`);
      console.log(`   שם: "${existing.name}"`);
      console.log(`   פעיל: ${existing.isActive ? 'כן ✅' : 'לא ❌'}`);
      
      if (!existing.isActive) {
        console.log('\n🔄 מעדכן את המותג לפעיל...');
        existing.isActive = true;
        await existing.save();
        console.log('✅ המותג עודכן לפעיל!');
      }
    } else {
      console.log('📝 יוצר מותג חדש "Ciggy"...');
      const brand = await Brand.create({
        name: 'Ciggy',
        isActive: true,
      });
      console.log('✅ המותג נוצר בהצלחה!');
      console.log(`   ID: ${brand._id}`);
      console.log(`   שם: "${brand.name}"`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ סיים');
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

createCiggyBrand();
