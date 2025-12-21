/**
 * Quick test to verify color filtering works correctly
 * Run: node test-color-filter.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function testColorFilter() {
  console.log('🧪 Testing color filtering logic...\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const skusCollection = db.collection('skus');

  // Test 1: Count SKUs by colorFamily
  console.log('📊 SKUs by colorFamily:');
  const colorFamilyStats = await skusCollection.aggregate([
    { $group: { _id: '$colorFamily', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log(colorFamilyStats);

  // Test 2: Filter by blue
  console.log('\n🔵 Filtering by colorFamily=blue:');
  const blueSkus = await skusCollection.find({ 
    colorFamily: 'blue',
    isActive: true 
  }).project({ sku: 1, name: 1, color: 1, colorFamily: 1 }).toArray();
  console.log(`Found ${blueSkus.length} SKUs:`);
  blueSkus.forEach(s => console.log(`  - ${s.sku}: ${s.name} (${s.color} → ${s.colorFamily})`));

  // Test 3: Filter by pink
  console.log('\n🩷 Filtering by colorFamily=pink:');
  const pinkSkus = await skusCollection.find({ 
    colorFamily: 'pink',
    isActive: true 
  }).project({ sku: 1, name: 1, color: 1, colorFamily: 1 }).toArray();
  console.log(`Found ${pinkSkus.length} SKUs:`);
  pinkSkus.forEach(s => console.log(`  - ${s.sku}: ${s.name} (${s.color} → ${s.colorFamily})`));

  // Test 4: Filter by black
  console.log('\n⬛ Filtering by colorFamily=black:');
  const blackSkus = await skusCollection.find({ 
    colorFamily: 'black',
    isActive: true 
  }).project({ sku: 1, name: 1, color: 1, colorFamily: 1 }).toArray();
  console.log(`Found ${blackSkus.length} SKUs:`);
  blackSkus.forEach(s => console.log(`  - ${s.sku}: ${s.name} (${s.color} → ${s.colorFamily})`));

  // Test 5: Get product IDs for blue SKUs
  console.log('\n📦 Products with blue SKUs:');
  const blueProducts = await skusCollection.aggregate([
    { $match: { colorFamily: 'blue', isActive: true } },
    { $group: { _id: '$productId' } }
  ]).toArray();
  console.log(`Found ${blueProducts.length} products with blue variants`);

  // Cleanup
  await mongoose.disconnect();
  console.log('\n✅ Test complete!');
}

testColorFilter().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
