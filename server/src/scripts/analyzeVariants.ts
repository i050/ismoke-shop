// סקריפט ניתוח Variants - בדיקת המצב הקיים לפני מיגרציה
// מטרה: להבין את מבנה הנתונים, לזהות בעיות ולהכין דוח למיגרציה

import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';
import dotenv from 'dotenv';

// טעינת משתני סביבה
dotenv.config();

interface AnalysisReport {
  totalProducts: number;
  productsWithVariants: number;
  productsWithoutVariants: number;
  totalVariants: number;
  productsWithSku: number;
  productsWithoutSku: number;
  variantsWithSku: number;
  variantsWithoutSku: number;
  duplicateSkus: string[];
  invalidSkus: string[];
  skuStatistics: {
    totalUniqueSKUs: number;
    skuList: string[];
  };
}

/**
 * פונקציה לניתוח כל המוצרים והווריאנטים
 */
async function analyzeVariants(): Promise<AnalysisReport> {
  console.log('🔍 מתחיל ניתוח Variants...\n');

  // אתחול דוח
  const report: AnalysisReport = {
    totalProducts: 0,
    productsWithVariants: 0,
    productsWithoutVariants: 0,
    totalVariants: 0,
    productsWithSku: 0,
    productsWithoutSku: 0,
    variantsWithSku: 0,
    variantsWithoutSku: 0,
    duplicateSkus: [],
    invalidSkus: [],
    skuStatistics: {
      totalUniqueSKUs: 0,
      skuList: [],
    },
  };

  // מעקב אחרי SKUs לזיהוי כפילויות
  const skuMap = new Map<string, number>();

  try {
  // שליפת כל המוצרים (lean לביצועים — רק קריאה לניתוח)
  const products = await Product.find({}).lean();
    report.totalProducts = products.length;

    console.log(`✅ נמצאו ${report.totalProducts} מוצרים במערכת\n`);

    // ניתוח כל מוצר
    for (const product of products) {
      // בדיקת SKU ברמת המוצר הראשי
      if (product.sku) {
        report.productsWithSku++;
        
        // בדיקת תקינות SKU
        if (!product.sku.trim() || product.sku === 'null' || product.sku === 'undefined') {
          report.invalidSkus.push(`Product ${product._id}: "${product.sku}"`);
        } else {
          // ספירת SKU
          skuMap.set(product.sku, (skuMap.get(product.sku) || 0) + 1);
        }
      } else {
        report.productsWithoutSku++;
      }

      // ניתוח Variants
      if (product.variants && product.variants.length > 0) {
        report.productsWithVariants++;
        report.totalVariants += product.variants.length;

        // בדיקת כל variant
        for (const variant of product.variants) {
          if (variant.sku) {
            report.variantsWithSku++;

            // בדיקת תקינות SKU
            if (!variant.sku.trim() || variant.sku === 'null' || variant.sku === 'undefined') {
              report.invalidSkus.push(`Variant in Product ${product._id}: "${variant.sku}"`);
            } else {
              // ספירת SKU
              skuMap.set(variant.sku, (skuMap.get(variant.sku) || 0) + 1);
            }
          } else {
            report.variantsWithoutSku++;
          }
        }
      } else {
        report.productsWithoutVariants++;
      }
    }

    // זיהוי SKUs כפולים
    for (const [sku, count] of skuMap.entries()) {
      if (count > 1) {
        report.duplicateSkus.push(`${sku} (מופיע ${count} פעמים)`);
      }
    }

    // סטטיסטיקת SKUs
    report.skuStatistics.totalUniqueSKUs = skuMap.size;
    report.skuStatistics.skuList = Array.from(skuMap.keys());

    return report;
  } catch (error) {
    console.error('❌ שגיאה בניתוח:', error);
    throw error;
  }
}

/**
 * הדפסת דוח מפורט
 */
function printReport(report: AnalysisReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 דוח ניתוח Variants ו-SKUs');
  console.log('='.repeat(60) + '\n');

  console.log('🏷️  סטטיסטיקות מוצרים:');
  console.log(`   • סה"כ מוצרים: ${report.totalProducts}`);
  console.log(`   • מוצרים עם Variants: ${report.productsWithVariants}`);
  console.log(`   • מוצרים ללא Variants: ${report.productsWithoutVariants}`);
  console.log(`   • מוצרים עם SKU ראשי: ${report.productsWithSku}`);
  console.log(`   • מוצרים ללא SKU ראשי: ${report.productsWithoutSku}\n`);

  console.log('📦 סטטיסטיקות Variants:');
  console.log(`   • סה"כ Variants: ${report.totalVariants}`);
  console.log(`   • Variants עם SKU: ${report.variantsWithSku}`);
  console.log(`   • Variants ללא SKU: ${report.variantsWithoutSku}\n`);

  console.log('🔑 סטטיסטיקות SKUs:');
  console.log(`   • סה"כ SKUs ייחודיים: ${report.skuStatistics.totalUniqueSKUs}`);
  console.log(`   • SKUs כפולים: ${report.duplicateSkus.length}`);
  console.log(`   • SKUs לא תקינים: ${report.invalidSkus.length}\n`);

  if (report.duplicateSkus.length > 0) {
    console.log('⚠️  SKUs כפולים שנמצאו:');
    report.duplicateSkus.forEach(sku => console.log(`   • ${sku}`));
    console.log('');
  }

  if (report.invalidSkus.length > 0) {
    console.log('❌ SKUs לא תקינים שנמצאו:');
    report.invalidSkus.slice(0, 10).forEach(sku => console.log(`   • ${sku}`));
    if (report.invalidSkus.length > 10) {
      console.log(`   ... ועוד ${report.invalidSkus.length - 10} SKUs לא תקינים`);
    }
    console.log('');
  }

  // המלצות
  console.log('💡 המלצות:');
  if (report.duplicateSkus.length > 0) {
    console.log('   ⚠️  יש לתקן SKUs כפולים לפני המיגרציה');
  }
  if (report.invalidSkus.length > 0) {
    console.log('   ⚠️  יש לתקן SKUs לא תקינים לפני המיגרציה');
  }
  if (report.variantsWithoutSku > 0) {
    console.log(`   ℹ️  ${report.variantsWithoutSku} variants ללא SKU - יידרש generation`);
  }
  if (report.productsWithoutSku > 0) {
    console.log(`   ℹ️  ${report.productsWithoutSku} מוצרים ללא SKU - יידרש generation`);
  }
  
  const estimatedCollectionSize = report.totalVariants + report.productsWithoutVariants;
  console.log(`\n   📈 גודל SKU Collection משוער: ${estimatedCollectionSize} רשומות`);
  
  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * פונקציה ראשית
 */
async function main() {
  try {
    // חיבור ל-MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    console.log('🔌 מתחבר ל-MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ חיבור למסד נתונים הצליח\n');

    // ביצוע ניתוח
    const report = await analyzeVariants();

    // הדפסת דוח
    printReport(report);

    // ניתוק
    await mongoose.disconnect();
    console.log('👋 ניתוק מהמסד נתונים\n');

    // קוד יציאה
    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה קריטית:', error);
    process.exit(1);
  }
}

// הרצת הסקריפט
main();
