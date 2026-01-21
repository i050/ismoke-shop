/**
 * בדיקה מהירה - מה יש במסד הנתונים
 */
import mongoose from 'mongoose';
import FilterAttribute from '../models/FilterAttribute';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

async function checkColors() {
  console.log('🔍 Checking color attributes in database...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const colorAttr = await FilterAttribute.findOne({ key: 'color' });
    
    if (!colorAttr) {
      console.log('❌ No color attribute found');
      return;
    }
    
    console.log(`\n📊 Found color attribute with ${colorAttr.colorFamilies?.length || 0} families:\n`);
    
    colorAttr.colorFamilies?.forEach((family: any) => {
      console.log(`Family: ${family.family} (${family.displayName || 'NO DISPLAY NAME'})`);
      family.variants?.forEach((v: any) => {
        console.log(`  - ${v.name} → ${v.displayName || 'NO DISPLAY NAME'} (${v.hex})`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
}

checkColors();
