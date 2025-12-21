const mongoose = require('mongoose');
require('dotenv').config();

const SkuSchema = new mongoose.Schema({
  sku: String,
  productId: mongoose.Schema.Types.ObjectId,
  color: String,
  colorFamily: String,
  attributes: mongoose.Schema.Types.Mixed,
  isActive: Boolean
});
const Sku = mongoose.model('Sku', SkuSchema);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  // ספירת SKUs לפי colorFamily
  const byFamily = await Sku.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$colorFamily', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\n📊 SKUs by colorFamily:');
  console.log(byFamily);
  
  // ספירת SKUs לפי color (hex)
  const byColor = await Sku.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$color', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  console.log('\n🎨 SKUs by color (hex):');
  console.log(byColor);
  
  // דוגמאות ל-SKUs בלי colorFamily אבל עם color
  const withoutFamily = await Sku.find({ 
    isActive: true, 
    color: { $exists: true, $ne: null, $ne: '' },
    $or: [{ colorFamily: null }, { colorFamily: { $exists: false } }, { colorFamily: '' }]
  }).limit(5).lean();
  console.log('\n⚠️ SKUs with color but no colorFamily:');
  console.log(withoutFamily.length, 'found');
  if (withoutFamily.length > 0) {
    console.log('Examples:', withoutFamily.slice(0,3).map(s => ({ sku: s.sku, color: s.color, colorFamily: s.colorFamily })));
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
