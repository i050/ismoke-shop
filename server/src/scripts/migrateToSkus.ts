import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Sku from '../models/Sku';

/**
 * סקריפט מיגרציה: העברת Variants מוטמעים ל-SKU Collection נפרד
 * 
 * מטרה: להמיר את כל ה-variants הקיימים במוצרים ליחידות SKU עצמאיות
 * 
 * שימוש:
 * - Dry run (לא שומר למסד נתונים): npm run migrate:skus -- --dry-run
 * - ריצה אמיתית: npm run migrate:skus
 */

// טעינת משתני סביבה
dotenv.config();

// ==========================================
// קונפיגורציה
// ==========================================
const BATCH_SIZE = 100; // כמות מוצרים לעיבוד בכל באצ'
const DRY_RUN = process.argv.includes('--dry-run'); // האם זו ריצת ניסוי

// ==========================================
// סטטיסטיקות
// ==========================================
interface MigrationStats {
  totalProducts: number;
  totalVariants: number;
  skusCreated: number;
  skusFailed: number;
  duplicateSkus: number;
  missingSkus: number;
  errors: Array<{
    productId: string;
    productName: string;
    variantIndex?: number;
    error: string;
  }>;
}

const stats: MigrationStats = {
  totalProducts: 0,
  totalVariants: 0,
  skusCreated: 0,
  skusFailed: 0,
  duplicateSkus: 0,
  missingSkus: 0,
  errors: [],
};

// ==========================================
// פונקציות עזר
// ==========================================

/**
 * יצירת קוד SKU ייחודי אם חסר
 */
function generateSkuCode(
  productId: string,
  variantIndex: number,
  attributes: any
): string {
  // פורמט: PROD_[מזהה]_V[אינדקס]_[תכונות]
  const baseCode = `PROD_${productId.slice(-8).toUpperCase()}_V${variantIndex}`;

  // הוספת תכונות אם קיימות
  const attrSuffix =
    attributes?.color || attributes?.size
      ? `_${attributes.color || 'X'}_${attributes.size || 'X'}`
      : '';

  return (baseCode + attrSuffix).toUpperCase();
}

/**
 * בדיקת תקינות SKU
 */
function isValidSku(sku: any): boolean {
  return (
    sku !== null &&
    sku !== undefined &&
    typeof sku === 'string' &&
    sku.trim() !== ''
  );
}

/**
 * המרת variant בודד ל-SKU document
 */
async function variantToSku(
  product: any,
  variantIndex: number,
  variant: any
): Promise<any> {
  try {
    // קבלת או יצירת קוד SKU
    let skuCode = variant.sku;

    if (!isValidSku(skuCode)) {
      skuCode = generateSkuCode(
        product._id.toString(),
        variantIndex,
        variant.attributes
      );
      stats.missingSkus++;
      console.log(
        `  ⚠️  SKU חסר עבור ${product.name} (variant ${variantIndex}), נוצר: ${skuCode}`
      );
    }

    // בדיקת כפילות
    const existingSku = await Sku.findOne({ sku: skuCode });
    if (existingSku) {
      // הוספת suffix ייחודי
      const timestamp = Date.now().toString().slice(-6);
      skuCode = `${skuCode}_${timestamp}`;
      stats.duplicateSkus++;
      console.log(
        `  ⚠️  SKU כפול התגלה, נוצר קוד חדש: ${skuCode}`
      );
    }

    // חישוב מחיר סופי (Product משתמש ב-basePrice)
    const basePrice = product.basePrice || product.price || 0;
    const priceModifier = variant.priceModifier || 0;
    const finalPrice = basePrice + priceModifier;

    // יצירת אובייקט SKU
    const skuData = {
      sku: skuCode,
      productId: product._id,
      name: variant.name || `${product.name} - ${variant.attributes?.color || variant.attributes?.size || 'Variant'}`,
      price: finalPrice,
      stockQuantity: variant.stockQuantity || 0,
      attributes: variant.attributes || {},
      images: variant.images || [],
      isActive: variant.isActive !== undefined ? variant.isActive : true,
    };

    if (DRY_RUN) {
      // ריצת ניסוי - רק הדפסה
      console.log(`  ✓ [DRY RUN] יווצר SKU: ${skuCode}`);
      stats.skusCreated++;
      return skuData;
    } else {
      // ריצה אמיתית - שמירה למסד נתונים
      const newSku = new Sku(skuData);
      await newSku.save();
      stats.skusCreated++;
      console.log(`  ✓ נוצר SKU: ${skuCode}`);
      return newSku;
    }
  } catch (error: any) {
    stats.skusFailed++;
    stats.errors.push({
      productId: product._id.toString(),
      productName: product.name,
      variantIndex,
      error: error.message,
    });
    console.error(
      `  ❌ שגיאה ביצירת SKU עבור ${product.name} (variant ${variantIndex}):`,
      error.message
    );
    return null;
  }
}

/**
 * עיבוד מוצר בודד
 */
async function processProduct(product: any): Promise<void> {
  console.log(`\n📦 מעבד מוצר: ${product.name} (${product._id})`);

  // בדיקה אם יש variants
  if (!product.variants || product.variants.length === 0) {
    console.log('  ℹ️  אין variants למוצר זה');
    return;
  }

  console.log(`  📊 נמצאו ${product.variants.length} variants`);
  stats.totalVariants += product.variants.length;

  // המרת כל variant ל-SKU
  for (let i = 0; i < product.variants.length; i++) {
    const variant = product.variants[i];
    await variantToSku(product, i, variant);
  }
}

/**
 * עיבוד באצ' של מוצרים
 */
async function processBatch(skip: number): Promise<number> {
  const products = await Product.find({})
    .skip(skip)
    .limit(BATCH_SIZE)
    .lean()
    .exec();

  if (products.length === 0) {
    return 0;
  }

  for (const product of products) {
    await processProduct(product);
  }

  return products.length;
}

/**
 * הדפסת דוח מפורט
 */
function printReport(): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 דוח מיגרציה - סיכום');
  console.log('='.repeat(60));
  console.log();

  if (DRY_RUN) {
    console.log('⚠️  זוהי ריצת ניסוי (DRY RUN) - לא נשמרו נתונים למסד הנתונים');
    console.log();
  }

  console.log(`✅ מוצרים שעובדו: ${stats.totalProducts}`);
  console.log(`📋 Variants שנמצאו: ${stats.totalVariants}`);
  console.log(`✨ SKUs שנוצרו בהצלחה: ${stats.skusCreated}`);
  console.log(`❌ SKUs שנכשלו: ${stats.skusFailed}`);
  console.log(`⚠️  SKUs כפולים שטופלו: ${stats.duplicateSkus}`);
  console.log(`⚠️  SKUs חסרים שנוצרו: ${stats.missingSkus}`);
  console.log();

  if (stats.errors.length > 0) {
    console.log('❌ שגיאות שהתגלו:');
    stats.errors.forEach((err, index) => {
      console.log(
        `  ${index + 1}. ${err.productName} (variant ${err.variantIndex}): ${err.error}`
      );
    });
    console.log();
  }

  // המלצות
  console.log('💡 המלצות:');
  if (stats.duplicateSkus > 0) {
    console.log(
      `  - ${stats.duplicateSkus} SKUs כפולים זוהו ותוקנו אוטומטית`
    );
  }
  if (stats.missingSkus > 0) {
    console.log(
      `  - ${stats.missingSkus} SKUs חסרים נוצרו אוטומטית`
    );
  }
  if (stats.skusFailed > 0) {
    console.log(
      `  - ${stats.skusFailed} SKUs נכשלו - בדוק את השגיאות למעלה`
    );
  }
  if (DRY_RUN) {
    console.log(
      '  - הרץ את הסקריפט ללא --dry-run כדי לבצע את המיגרציה בפועל'
    );
  }

  console.log();
  console.log('='.repeat(60));
}

/**
 * אימות לאחר מיגרציה
 */
async function verifyMigration(): Promise<void> {
  if (DRY_RUN) {
    return; // דלג על אימות בריצת ניסוי
  }

  console.log('\n🔍 מאמת תוצאות מיגרציה...');

  const totalSkus = await Sku.countDocuments();
  const activeSkus = await Sku.countDocuments({ isActive: true });

  console.log(`✓ סה"כ SKUs במסד נתונים: ${totalSkus}`);
  console.log(`✓ SKUs פעילים: ${activeSkus}`);

  // בדיקת sample - 5 מוצרים אקראיים
  console.log('\n📋 בדיקת דגימה (5 מוצרים ראשונים):');
  const sampleProducts = await Product.find({})
    .limit(5)
    .lean()
    .exec();

  for (const product of sampleProducts) {
    const productSkus = await Sku.find({ productId: product._id });
    const variantsCount = product.variants?.length || 0;
    const skusCount = productSkus.length;

    const status = variantsCount === skusCount ? '✅' : '⚠️';
    console.log(
      `  ${status} ${product.name}: ${variantsCount} variants → ${skusCount} SKUs`
    );
  }

  console.log('\n✅ אימות הושלם');
}

/**
 * פונקציה ראשית
 */
async function main(): Promise<void> {
  console.log('🚀 מתחיל סקריפט מיגרציה: Variants → SKUs');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('⚠️  מצב: DRY RUN (ריצת ניסוי - ללא שמירה למסד נתונים)');
  } else {
    console.log('✅ מצב: PRODUCTION (שמירה למסד נתונים)');
  }
  console.log('='.repeat(60));

  try {
    // חיבור למסד נתונים
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ecommerce';

    console.log('\n📡 מתחבר למסד נתונים...');
    await mongoose.connect(mongoUri);
    console.log('✅ חיבור למסד נתונים הצליח\n');

    // ספירת מוצרים
    const totalProducts = await Product.countDocuments();
    stats.totalProducts = totalProducts;

    console.log(`📊 נמצאו ${totalProducts} מוצרים למיגרציה\n`);

    if (totalProducts === 0) {
      console.log('⚠️  לא נמצאו מוצרים למיגרציה');
      return;
    }

    // עיבוד בבאצ'ים
    let processedCount = 0;
    let skip = 0;

    while (processedCount < totalProducts) {
      console.log(
        `\n📦 מעבד באצ' ${Math.floor(skip / BATCH_SIZE) + 1}/${Math.ceil(totalProducts / BATCH_SIZE)}`
      );
      const batchSize = await processBatch(skip);

      if (batchSize === 0) {
        break;
      }

      processedCount += batchSize;
      skip += BATCH_SIZE;

      // פאוזה קצרה בין באצ'ים
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // הדפסת דוח
    printReport();

    // אימות
    await verifyMigration();

    console.log('\n✅ סקריפט המיגרציה הושלם בהצלחה!');
  } catch (error: any) {
    console.error('\n❌ שגיאה קריטית בסקריפט המיגרציה:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // ניתוק ממסד נתונים
    await mongoose.disconnect();
    console.log('\n👋 ניתוק ממסד הנתונים');
  }
}

// הפעלת הסקריפט
main();
