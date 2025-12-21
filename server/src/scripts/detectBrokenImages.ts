import axios from 'axios';
import { Product } from '../models/Product';
import { Sku } from '../models/Sku';
import { IImage } from '../models/Product';

/**
 * בדיקת תמונה אחת (HEAD request מהיר)
 * לא מוריד את התמונה, רק בודק אם היא קיימת
 */
const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * סריקת כל התמונות ב-MongoDB ובדיקה אם הן קיימות ב-Cloudinary
 * מזהה תמונות "שבורות" - URL במונגו אבל התמונה לא קיימת
 */
export const detectBrokenImages = async () => {
  console.log('🔍 Starting broken images detection...');
  
  const brokenImages: Array<{
    type: 'product' | 'sku';
    id: string;
    name: string;
    publicId: string;
    url: string;
  }> = [];
  
  try {
    // בדיקת תמונות Products
    console.log('📦 Checking product images...');
  const products = await Product.find({}).select('_id name images').lean();
    
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          // דילוג על תמונות שכבר מסומנות כמחוקות
          if (image.isDeleted) {
            continue;
          }
          
          const exists = await checkImageExists(image.url);
          
          if (!exists) {
            brokenImages.push({
              type: 'product',
              id: String(product._id),
              name: product.name,
              publicId: image.public_id,
              url: image.url
            });
            
            console.log(`❌ Broken image found in product "${product.name}": ${image.public_id}`);
          }
        }
      }
    }
    
    console.log(`✅ Product images check completed. Found ${brokenImages.length} broken images.`);
    
    // בדיקת תמונות SKUs
    console.log('🏷️ Checking SKU images...');
  const skus = await Sku.find({}).select('_id sku images').lean();
    
    let skuBrokenCount = 0;
    
    for (const sku of skus) {
      if (sku.images && sku.images.length > 0) {
        for (const image of sku.images) {
          // דילוג על תמונות שכבר מסומנות כמחוקות
          if (image.isDeleted) {
            continue;
          }
          
          const exists = await checkImageExists(image.url);
          
          if (!exists) {
            brokenImages.push({
              type: 'sku',
              id: String(sku._id),
              name: sku.sku,
              publicId: image.public_id,
              url: image.url
            });
            
            skuBrokenCount++;
            console.log(`❌ Broken image found in SKU "${sku.sku}": ${image.public_id}`);
          }
        }
      }
    }
    
    console.log(`✅ SKU images check completed. Found ${skuBrokenCount} broken images.`);
    
    // סיכום
    const totalBroken = brokenImages.length;
    console.log(`\n📊 Detection Summary:`);
    console.log(`   Total broken images: ${totalBroken}`);
    console.log(`   Product images: ${totalBroken - skuBrokenCount}`);
    console.log(`   SKU images: ${skuBrokenCount}`);
    
    // שליחת דוח אם נמצאו תמונות שבורות
    if (totalBroken > 0) {
      await sendBrokenImagesReport(brokenImages);
    }
    
    return { brokenCount: brokenImages.length, brokenImages };
    
  } catch (error) {
    console.error('❌ Error in detectBrokenImages:', error);
    
    return {
      brokenCount: 0,
      brokenImages: []
    };
  }
};

/**
 * שליחת דוח תמונות שבורות
 * כרגע רק מדפיס ללוג, בעתיד ניתן להוסיף Email/Slack
 */
const sendBrokenImagesReport = async (brokenImages: any[]) => {
  console.log('\n📧 Sending broken images report...');
  
  const report = `
🔍 דוח תמונות שבורות
======================
נמצאו ${brokenImages.length} תמונות שבורות:

${brokenImages.map((img) => `
- ${img.type.toUpperCase()}: ${img.name}
  Public ID: ${img.publicId}
  URL: ${img.url}
`).join('\n')}

יש לבדוק ולתקן את התמונות הללו.
  `;
  
  console.log(report);
  
  // כאן תוסיף אינטגרציה עם Email/Slack בעתיד:
  // await sendEmail({
  //   to: 'admin@yourstore.com',
  //   subject: '🚨 דוח תמונות שבורות',
  //   text: report,
  // });
};
