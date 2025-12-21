import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Product from './models/Product';
import Sku from './models/Sku';

dotenv.config();

async function checkPrices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    const product = await Product.findOne({ name: /FLEXUS Q/ });
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log(`📦 Product: ${product.name}`);
    console.log(`💰 Base Price: ₪${product.basePrice}\n`);

    const skus = await Sku.find({ productId: product._id });
    console.log('🎨 SKUs:');
    skus.forEach(sku => {
      const priceDisplay = sku.price !== null && sku.price !== undefined 
        ? `₪${sku.price} (override)` 
        : `null (uses basePrice: ₪${product.basePrice})`;
      console.log(`  - ${sku.name}: ${priceDisplay}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPrices();
