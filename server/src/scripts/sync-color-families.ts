/**
 * Script to sync colorFamilies from JSON file to MongoDB FilterAttribute
 * Run: npx ts-node src/scripts/sync-color-families.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import FilterAttribute from '../models/FilterAttribute';

// Load env
dotenv.config();

async function syncColorFamilies() {
  console.log('🔄 Starting colorFamilies sync...');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Load updated colorFamilies from JSON
  const colorFamiliesPath = path.resolve(__dirname, '../data/colorFamilies.json');
  const colorFamiliesData = JSON.parse(fs.readFileSync(colorFamiliesPath, 'utf-8'));
  console.log(`📁 Loaded ${colorFamiliesData.length} color families from JSON`);

  // Update the color FilterAttribute
  const result = await FilterAttribute.findOneAndUpdate(
    { key: 'color' },
    { $set: { colorFamilies: colorFamiliesData } },
    { new: true }
  );

  if (result) {
    console.log('✅ Updated colorFamilies in FilterAttribute');
    console.log(`   Total families: ${result.colorFamilies?.length || 0}`);
    result.colorFamilies?.forEach(family => {
      console.log(`   - ${family.family} (${family.displayName}): ${family.variants?.length || 0} variants`);
    });
  } else {
    console.log('⚠️ Color FilterAttribute not found. Creating...');
    await FilterAttribute.create({
      name: 'צבע',
      key: 'color',
      valueType: 'color',
      icon: '🎨',
      showInFilter: true,
      isRequired: false,
      sortOrder: 1,
      colorFamilies: colorFamiliesData,
    });
    console.log('✅ Created color FilterAttribute with colorFamilies');
  }

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

syncColorFamilies().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
