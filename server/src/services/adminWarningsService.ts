import mongoose from 'mongoose';
import Product from '../models/Product';
import Sku from '../models/Sku';
import AdminSkuWarningIgnore from '../models/AdminSkuWarningIgnore';

/**
 * ממשק לתיאור בעיה שזוהתה במוצר
 */
export interface IInconsistencyWarning {
  productId: string;
  productName: string;
  productImage?: string;
  issues: {
    attributeKey: string; // שם התכונה (למשל: "size", "material")
    missingInCount: number; // כמה SKUs חסרה בהם תכונה זו
    totalSkus: number; // סך הכל SKUs למוצר
  }[];
}

/**
 * Service לזיהוי וניהול התראות אי-עקביות במוצרים
 */
class AdminWarningsService {
  /**
   * זיהוי מוצרים עם אי-עקביות ב-SKU attributes
   * 
   * לוגיקה:
   * 1. מחפש מוצרים עם hasVariants=true (מוצרים מורכבים)
   * 2. עבור כל מוצר - בודק אם יש תכונות שקיימות בחלק מה-SKUs אבל לא בכולם
   * 3. מסנן לפי רשימת ההתעלמויות (ignore list)
   */
  async getInconsistentProducts(): Promise<IInconsistencyWarning[]> {
    try {
      // 📦 שלב 1: מצא את כל המוצרים שיש להם יותר מ-SKU אחד
      // לא מסתמכים על hasVariants כי יכול להיות לא מעודכן
      const skusGrouped = await Sku.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$productId',
            count: { $sum: 1 },
          },
        },
        {
          $match: { count: { $gt: 1 } }, // רק מוצרים עם יותר מ-SKU אחד
        },
      ]);

      console.log(`🔍 [AdminWarnings] Found ${skusGrouped.length} products with multiple SKUs`);

      if (skusGrouped.length === 0) {
        return [];
      }

      const productIds = skusGrouped.map((item) => item._id);

      // טעינת פרטי המוצרים
      const products = await Product.find({ _id: { $in: productIds } })
        .select('_id name images')
        .lean();

      console.log(`🔍 [AdminWarnings] Loaded ${products.length} product details`);

      // טעינת כל ה-SKUs של המוצרים האלה
      const skus = await Sku.find({
        productId: { $in: productIds },
        isActive: true,
      })
        .select('productId attributes color')
        .lean();

      console.log(`🔍 [AdminWarnings] Found ${skus.length} active SKUs for these products`);

      // 📋 שלב 2: קיבוץ SKUs לפי מוצר
      const skusByProduct: Record<string, any[]> = {};
      for (const sku of skus) {
        const productId = sku.productId.toString();
        if (!skusByProduct[productId]) {
          skusByProduct[productId] = [];
        }
        skusByProduct[productId].push(sku);
      }

      // 🔍 שלב 3: זיהוי אי-עקביות עבור כל מוצר
      const warnings: IInconsistencyWarning[] = [];

      for (const product of products) {
        const productId = product._id.toString();
        const productSkus = skusByProduct[productId] || [];

        // אם אין SKUs או יש רק אחד - אין אי-עקביות אפשרית
        if (productSkus.length <= 1) {
          console.log(`⏭️  [AdminWarnings] Skipping product "${product.name}" - only ${productSkus.length} SKU(s)`);
          continue;
        }

        console.log(`🔎 [AdminWarnings] Checking product "${product.name}" with ${productSkus.length} SKUs`);
        console.log(`   Sample SKU:`, JSON.stringify(productSkus[0], null, 2));

        // איסוף כל ה-attributes שקיימים במוצר (מכל ה-SKUs)
        const allAttributeKeys = new Set<string>();
        
        // הוספת 'color' כתכונה אם קיימת (שדה מיוחד)
        const hasColor = productSkus.some((sku) => sku.color);
        if (hasColor) {
          allAttributeKeys.add('color');
        }

        // הוספת attributes מהאובייקט attributes
        for (const sku of productSkus) {
          if (sku.attributes && typeof sku.attributes === 'object') {
            Object.keys(sku.attributes).forEach((key) => {
              // התעלמות מערכי null/undefined/ריקים
              if (sku.attributes[key] != null && sku.attributes[key] !== '') {
                allAttributeKeys.add(key);
              }
            });
          }
        }

        // בדיקה עבור כל attribute - האם הוא קיים בכל ה-SKUs
        const issues: IInconsistencyWarning['issues'] = [];

        console.log(`   All attribute keys found:`, Array.from(allAttributeKeys));

        for (const attributeKey of allAttributeKeys) {
          let missingCount = 0;

          for (const sku of productSkus) {
            let hasValue = false;

            if (attributeKey === 'color') {
              // בדיקה מיוחדת לשדה color
              hasValue = !!sku.color;
            } else {
              // בדיקה רגילה ב-attributes
              hasValue =
                sku.attributes &&
                sku.attributes[attributeKey] != null &&
                sku.attributes[attributeKey] !== '';
            }

            if (!hasValue) {
              missingCount++;
            }
          }

          // אם יש SKUs שחסר להם הערך - זו בעיה
          if (missingCount > 0 && missingCount < productSkus.length) {
            console.log(`   ⚠️  Found inconsistency: "${attributeKey}" missing in ${missingCount}/${productSkus.length} SKUs`);
            issues.push({
              attributeKey,
              missingInCount: missingCount,
              totalSkus: productSkus.length,
            });
          }
        }

        // אם יש בעיות - הוסף לרשימת ההתראות
        if (issues.length > 0) {
          console.log(`   ✅ Product "${product.name}" has ${issues.length} inconsistency issue(s)`);
        } else {
          console.log(`   ✅ Product "${product.name}" is consistent`);
        }
        
        if (issues.length > 0) {
          warnings.push({
            productId,
            productName: product.name,
            productImage: product.images?.[0]?.url,
            issues,
          });
        }
      }

      // 🚫 שלב 4: סינון לפי ignore list
      const filteredWarnings = await this.filterIgnoredWarnings(warnings);

      return filteredWarnings;
    } catch (error) {
      console.error('❌ שגיאה בזיהוי אי-עקביות במוצרים:', error);
      throw error;
    }
  }

  /**
   * סינון התראות לפי רשימת ההתעלמויות
   * מסיר מוצרים שמסומנים ב-"התעלם" או שתאריך ה-snooze עדיין תקף
   */
  private async filterIgnoredWarnings(
    warnings: IInconsistencyWarning[]
  ): Promise<IInconsistencyWarning[]> {
    if (warnings.length === 0) {
      return [];
    }

    const productIds = warnings.map((w) => new mongoose.Types.ObjectId(w.productId));
    const now = new Date();

    // מציאת כל ההתעלמויות הרלוונטיות
    const ignores = await AdminSkuWarningIgnore.find({
      productId: { $in: productIds },
      warningType: 'missing_attribute',
      $or: [
        { ignoredUntil: null }, // התעלם לצמיתות
        { ignoredUntil: { $gt: now } }, // snooze עדיין תקף
      ],
    })
      .select('productId')
      .lean();

    // המרה ל-Set למהירות
    const ignoredProductIds = new Set(
      ignores.map((ignore) => ignore.productId.toString())
    );

    // סינון ההתראות
    return warnings.filter((warning) => !ignoredProductIds.has(warning.productId));
  }

  /**
   * הוספת/עדכון התעלמות עבור מוצר
   * 
   * @param productId - מזהה המוצר
   * @param ignoreType - סוג ההתעלמות: 'forever' או 'snooze'
   */
  async setIgnore(
    productId: string,
    ignoreType: 'forever' | 'snooze'
  ): Promise<void> {
    try {
      const ignoredUntil = ignoreType === 'snooze' 
        ? new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) // 4 ימים
        : null;

      // upsert: עדכון אם קיים, יצירה אם לא
      await AdminSkuWarningIgnore.findOneAndUpdate(
        {
          productId: new mongoose.Types.ObjectId(productId),
          warningType: 'missing_attribute',
        },
        {
          $set: {
            ignoredUntil,
            updatedAt: new Date(),
          },
        },
        {
          upsert: true, // יצירה אוטומטית אם לא קיים
          new: true,
        }
      );

      console.log(`✅ התעלמות נשמרה למוצר ${productId} (${ignoreType})`);
    } catch (error) {
      console.error('❌ שגיאה בשמירת התעלמות:', error);
      throw error;
    }
  }

  /**
   * הסרת התעלמות (ביטול ignore/snooze)
   * 
   * @param productId - מזהה המוצר
   */
  async removeIgnore(productId: string): Promise<void> {
    try {
      await AdminSkuWarningIgnore.deleteOne({
        productId: new mongoose.Types.ObjectId(productId),
        warningType: 'missing_attribute',
      });

      console.log(`✅ התעלמות הוסרה למוצר ${productId}`);
    } catch (error) {
      console.error('❌ שגיאה בהסרת התעלמות:', error);
      throw error;
    }
  }
}

export default new AdminWarningsService();
