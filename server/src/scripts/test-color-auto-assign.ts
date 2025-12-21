/**
 * Test script to verify colorFamily auto-assignment works
 * Run: npx ts-node src/scripts/test-color-auto-assign.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Sku from '../models/Sku';
import Product from '../models/Product';

dotenv.config();

async function testColorAutoAssign() {
  console.log('🧪 Testing colorFamily auto-assignment...\n');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not defined');

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  // Find a product to use for testing
  const product = await Product.findOne({}).lean();
  if (!product) {
    console.log('❌ No products found in database');
    await mongoose.disconnect();
    return;
  }

  const testSkuCode = `TEST-COLOR-${Date.now()}`;
  
  try {
    // Test 1: Create SKU with HEX color - should auto-assign colorFamily
    console.log('📝 Test 1: Create SKU with color #FF0000 (red)');
    const newSku = new Sku({
      sku: testSkuCode,
      productId: product._id,
      name: 'Test Color Auto-Assign',
      stockQuantity: 10,
      color: '#FF0000',
      attributes: {},
      isActive: true,
    });
    
    await newSku.save();
    
    // Reload to verify
    const savedSku = await Sku.findOne({ sku: testSkuCode }).lean();
    console.log(`   Color: ${savedSku?.color}`);
    console.log(`   ColorFamily: ${savedSku?.colorFamily}`);
    console.log(`   ColorFamilySource: ${(savedSku as any)?.colorFamilySource}`);
    console.log(`   ✅ Result: ${savedSku?.colorFamily === 'red' ? 'PASS' : 'FAIL'}\n`);

    // Test 2: Update color to blue
    console.log('📝 Test 2: Update SKU color to #0000FF (blue)');
    const { updateSku } = await import('../services/skuService');
    await updateSku(testSkuCode, { color: '#0000FF' });
    
    const updatedSku = await Sku.findOne({ sku: testSkuCode }).lean();
    console.log(`   Color: ${updatedSku?.color}`);
    console.log(`   ColorFamily: ${updatedSku?.colorFamily}`);
    console.log(`   ✅ Result: ${updatedSku?.colorFamily === 'blue' ? 'PASS' : 'FAIL'}\n`);

    // Test 3: Update to a non-standard HEX (should use fuzzy matching)
    console.log('📝 Test 3: Update SKU color to #00CED1 (dark turquoise - should match blue/green)');
    await updateSku(testSkuCode, { color: '#00CED1' });
    
    const fuzzyUpdatedSku = await Sku.findOne({ sku: testSkuCode }).lean();
    console.log(`   Color: ${fuzzyUpdatedSku?.color}`);
    console.log(`   ColorFamily: ${fuzzyUpdatedSku?.colorFamily}`);
    console.log(`   ✅ Result: ${fuzzyUpdatedSku?.colorFamily ? 'PASS (matched to ' + fuzzyUpdatedSku?.colorFamily + ')' : 'FAIL'}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test SKU...');
    await Sku.deleteOne({ sku: testSkuCode });
    console.log('✅ Test SKU deleted\n');

    console.log('🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error);
    // Cleanup on error
    await Sku.deleteOne({ sku: testSkuCode });
  }

  await mongoose.disconnect();
  console.log('👋 Disconnected');
}

testColorAutoAssign().catch(console.error);
