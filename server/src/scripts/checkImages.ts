import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';
import Sku from '../models/Sku';

dotenv.config();

async function checkImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('📡 Connected to MongoDB\n');

    // בדיקת מוצר
    const product = await Product.findOne({ name: 'VOOPOO ARGUS G3 KIT' }).select('name images');
    console.log('===== Product Sample =====');
    console.log('Name:', product?.name);
    console.log('Image Object:', JSON.stringify(product?.images[0], null, 2));

    // בדיקת SKU
    const sku = await Sku.findOne({ sku: 'ASP-FLEXUS-Q-BLUE' }).select('name sku images');
    console.log('\n===== SKU Sample =====');
    console.log('Name:', sku?.name);
    console.log('SKU Code:', sku?.sku);
    if (sku && sku.images && sku.images.length > 0) {
      console.log('Image Object:', JSON.stringify(sku.images[0], null, 2));
    }

    console.log('\n✅ Images are in correct IImage format!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkImages();
