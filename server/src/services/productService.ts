import Product, { IProduct } from '../models/Product';
import Category from '../models/Category';
import Sku, { ISku } from '../models/Sku';
import FilterAttribute from '../models/FilterAttribute';
import StoreSettings from '../models/StoreSettings';
import mongoose from 'mongoose';
import { triggerStockAlerts } from './stockAlertService';

// ============================================================================
// 🚀 Performance Optimization: In-Memory Caches
// ============================================================================

/**
 * Cache לקטגוריות מושבתות - נטען פעם אחת ומתרענן כל 60 שניות.
 * חוסך שאילתת DB בכל קריאה ל-fetchProductsFiltered.
 */
interface InactiveCategoriesCache {
  ids: string[];           // רשימת IDs של קטגוריות מושבתות
  expiresAt: number;       // timestamp לפקיעת תוקף
}
let inactiveCategoriesCache: InactiveCategoriesCache | null = null;
const INACTIVE_CATEGORIES_CACHE_TTL_MS = 60_000; // 60 שניות

/**
 * מחזיר את רשימת הקטגוריות המושבתות מה-cache או מהDB אם פג תוקף.
 */
async function getInactiveCategoryIds(): Promise<string[]> {
  const now = Date.now();
  
  // בדיקה אם יש cache תקף
  if (inactiveCategoriesCache && inactiveCategoriesCache.expiresAt > now) {
    return inactiveCategoriesCache.ids;
  }
  
  // טעינה מחדש מה-DB
  const inactiveCategories = await Category.find({ isActive: false })
    .select('_id')
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
  
  const ids = inactiveCategories.map(c => c._id.toString());
  
  // עדכון ה-cache
  inactiveCategoriesCache = {
    ids,
    expiresAt: now + INACTIVE_CATEGORIES_CACHE_TTL_MS
  };
  
  return ids;
}

/**
 * ניקוי cache של קטגוריות מושבתות - לקרוא כשמעדכנים קטגוריה.
 * ייקרא מ-categoryService כשמשתנה isActive.
 */
export function invalidateInactiveCategoriesCache(): void {
  inactiveCategoriesCache = null;
}

/**
 * Cache לספירת כל המוצרים - מתרענן כל 5 דקות.
 * חוסך שאילתת countDocuments({}) בכל בקשה.
 */
interface TotalProductsCache {
  count: number;           // סה"כ מוצרים
  expiresAt: number;       // timestamp לפקיעת תוקף
}
let totalProductsCache: TotalProductsCache | null = null;
const TOTAL_PRODUCTS_CACHE_TTL_MS = 300_000; // 5 דקות

/**
 * מחזיר את ספירת כל המוצרים מה-cache או מהDB אם פג תוקף.
 */
async function getTotalProductsCount(): Promise<number> {
  const now = Date.now();
  
  // בדיקה אם יש cache תקף
  if (totalProductsCache && totalProductsCache.expiresAt > now) {
    return totalProductsCache.count;
  }
  
  // טעינה מחדש מה-DB
  const count = await Product.countDocuments({});
  
  // עדכון ה-cache
  totalProductsCache = {
    count,
    expiresAt: now + TOTAL_PRODUCTS_CACHE_TTL_MS
  };
  
  return count;
}

/**
 * ניקוי cache של ספירת מוצרים - לקרוא כשמוסיפים/מוחקים מוצר.
 */
export function invalidateTotalProductsCache(): void {
  totalProductsCache = null;
}
// In a real scenario, we would install axios: npm install axios
// import axios from 'axios';

/**
 * פונקציית עזר למציאת כל הצאצאים של קטגוריה (רקורסיבית).
 * מקבלת slug של קטגוריה ומחזירה מערך של כל ה-IDs שלה ושל כל הצאצאים שלה.
 */
/**
 * פונקציה שמקבלת ObjectId של קטגוריה ומחזירה מערך של IDs (קטגוריה + כל הצאצאים)
 * משמשת למערכת ה-Admin שעובדת עם IDs במקום slugs
 * מחזירה רק קטגוריות פעילות (isActive=true)
 */
async function collectCategoryAndDescendantIds(
  rootId: mongoose.Types.ObjectId,
  includeInactive: boolean = false
): Promise<mongoose.Types.ObjectId[]> {
  const visited = new Set<string>();
  const queue: mongoose.Types.ObjectId[] = [rootId];
  const result: mongoose.Types.ObjectId[] = [];

  // קודם נבדוק אם הקטגוריה הראשית פעילה
  const rootCategory = await Category.findById(rootId).select('isActive').lean();
  if (!rootCategory) {
    console.log(`📦 [collectCategoryAndDescendantIds] Root category not found: ${rootId.toString()}`);
    return [];
  }
  
  // אם הקטגוריה הראשית מושבתת ולא מבקשים inactive - מחזירים ריק
  if (!includeInactive && rootCategory.isActive === false) {
    console.log(`📦 [collectCategoryAndDescendantIds] Root category is inactive: ${rootId.toString()}`);
    return [];
  }

  while (queue.length > 0) {
    const current = queue.shift() as mongoose.Types.ObjectId;
    const key = current.toString();
    
    // מניעת לולאות אינסופיות
    if (visited.has(key)) continue;
    
    visited.add(key);
    result.push(current);

    // מציאת כל הילדים הפעילים של הקטגוריה הנוכחית
    const childFilter: Record<string, any> = { parentId: current };
    if (!includeInactive) {
      childFilter.isActive = true;
    }
    
    const children = await Category.find(childFilter)
      .select('_id')
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();

    for (const child of children) {
      queue.push(child._id);
    }
  }

  console.log(`📦 [collectCategoryAndDescendantIds] Root: ${rootId.toString()}, Found ${result.length} active categories`);
  return result;
}

/**
 * פונקציה שמקבלת slug של קטגוריה ומחזירה מערך של IDs (קטגוריה + כל הצאצאים)
 * משמשת לעמוד הקטלוג הציבורי שעובד עם slugs
 */
async function getCategoryWithDescendants(categorySlug: string): Promise<string[]> {
  const mainCategory = await Category.findOne({ slug: categorySlug })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId }>();
  
  if (!mainCategory) {
    return [];
  }

  const categoryIds = await collectCategoryAndDescendantIds(mainCategory._id);
  return categoryIds.map(id => id.toString());
}

/**
 * אפשרויות לשאילתת מוצרים עם פילטור, מיון ופגינציה.
 * הערה: שדות מעבר למה שקיים כרגע (כמו colors / categories מרובים) יתווספו בהמשך.
 */
export interface ProductQueryOptions {
  priceMin?: number;
  priceMax?: number;
  sort?: string; // למשל: price_asc | price_desc | date_desc | date_asc | views_desc | sales_desc
  page?: number; // עמוד (1 מבוסס)
  pageSize?: number; // כמות פריטים לעמוד
  categoryIds?: string[]; // סינון לפי קטגוריות מרובות (שמור לתאימות לאחור)
  categorySlugs?: string[]; // סינון לפי slugs של קטגוריות (החדש)
  attributeFilters?: Record<string, string[]>; // סינון לפי מאפיינים דינמיים (למשל: { colorFamily: ['red'], size: ['M', 'L'] })
  search?: string; // חיפוש טקסט חופשי בשם ותיאור מוצר
}

/** טיפוס מבנה ה-meta שמוחזר ללקוח */
export interface ProductsMeta {
  total: number;      // סך כל המוצרים במערכת (ללא פילטרים)
  filtered: number;   // כמה נמצאו לאחר הפילטרים
  page: number;       // העמוד הנוכחי
  pageSize: number;   // גודל עמוד
  totalPages: number; // כמה עמודים בסה"כ עבור הפילטרים
  hasNext: boolean;   // האם יש עמוד נוסף
  hasPrev: boolean;   // האם יש עמוד קודם
}
export interface ProductsResult {
  data: Array<Record<string, any>>;
  meta: ProductsMeta;
}

/**
 * מיפוי ערך sort ממחרוזת לפרמטרי מיון של Mongoose.
 * ניתן להרחיב בקלות בהמשך.
 */
function mapSort(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'price_asc':
      return { basePrice: 1, createdAt: -1 }; // מחיר עולה
    case 'price_desc':
      return { basePrice: -1, createdAt: -1 }; // מחיר יורד
    case 'date_asc':
      return { createdAt: 1 }; // תאריך עולה
    case 'views_desc':
      return { viewCount: -1, createdAt: -1 }; // צפיות יורדות
    case 'sales_desc':
      return { salesCount: -1, createdAt: -1 }; // מכירות יורדות
    case 'date_desc':
    default:
      return { createdAt: -1 }; // ברירת מחדל: הכי חדש קודם
  }
}

/**
 * פונקציית עזר לניקוי ערכים לא תקינים (NaN, שליליים וכו').
 */
function safeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  return value;
}

/**
 * שאילתת מוצרים מפולטרת עם פגינציה ומיון + החזרת meta.
 * מחזירה גם total (ללא פילטרים) וגם filtered (עם פילטרים) כדי לאפשר UI של "מוצגים X מתוך Y".
 */
export async function fetchProductsFiltered(options: ProductQueryOptions): Promise<ProductsResult> {
  // 🚀 Performance: לוגים רק ב-development למניעת האטה בפרודקשן
  const isDev = process.env.NODE_ENV !== 'production';
  
  const {
    priceMin, // מחיר מינימלי
    priceMax, // מחיר מקסימלי
    sort, // מיון
    page = 1, // עמוד
    pageSize = 20, // גודל עמוד
    categoryIds, // קטגוריות (לתאימות לאחור)
    categorySlugs, // קטגוריות חדש עם היררכיה
    attributeFilters, // מאפיינים דינמיים (colorFamily, size, וכו')
    search, // חיפוש טקסט חופשי
  } = options; 

  // בניית אובייקט פילטור
  // 🛡️ מוצרים באשפה (isActive: false) לא יוצגו ללקוחות
  const filter: Record<string, any> = {
    isActive: true,
  };
  
  // פילטר חיפוש טקסט חופשי בשם ותיאור
  if (search && search.trim() !== '') {
    const trimmedSearch = search.trim();
    filter.$or = [
      { name: { $regex: trimmedSearch, $options: 'i' } },
      { description: { $regex: trimmedSearch, $options: 'i' } }
    ];
    if (isDev) console.log('🔍 [fetchProductsFiltered] Text search:', trimmedSearch);
  }
  
  if (safeNumber(priceMin) !== undefined || safeNumber(priceMax) !== undefined) {
    filter.basePrice = {};
    if (safeNumber(priceMin) !== undefined) filter.basePrice.$gte = priceMin; // מחיר מינימלי
    if (safeNumber(priceMax) !== undefined) filter.basePrice.$lte = priceMax; // מחיר מקסימלי 
  }

  // סינון לפי מאפיינים דינמיים (colorFamily, size, material, וכו')
  // הלוגיקה: למוצר צריכים להיות SKUs שמכילים את **כל** המאפיינים שנבחרו
  // לדוגמה: אם נבחר colorFamily=red + size=M, צריך שיהיה לפחות SKU אחד עם red
  // ולפחות SKU אחד עם M (יכול להיות אותו SKU או SKUs שונים)
  let productIdsWithAttributes: string[] | null = null;
  if (attributeFilters && Object.keys(attributeFilters).length > 0) {
    if (isDev) console.log('🎨 [fetchProductsFiltered] Filtering by attributes:', attributeFilters);
    // אם יש סינון של צבע, נרצה ללמוד אילו hex שייכים לכל משפחה
    // כדי לתמוך גם ב-SKUs שלא עברו migration של colorFamily
    let colorFamilyToHexes: Record<string, string[]> | null = null;
    if (attributeFilters.color) {
      try {
        const colorAttr = await FilterAttribute.findOne({ key: 'color' }).lean();
        if (colorAttr && Array.isArray(colorAttr.colorFamilies)) {
          colorFamilyToHexes = {};
          for (const family of colorAttr.colorFamilies) {
            const key = String(family.family).toLowerCase();
            colorFamilyToHexes[key] = (family.variants || []).map(v => String(v.hex).toLowerCase());
          }
        }
      } catch (e) {
        // אם השאילתה תיכשל - נמשיך ללא מפה
        console.warn('⚠️ [fetchProductsFiltered] Failed to load color families for matching:', e);
        colorFamilyToHexes = null;
      }
    }
    
    // נשתמש ב-aggregation על SKUs כדי למצוא את ה-Product IDs המתאימים
    const attributeMatchConditions: any[] = [];
    
    Object.entries(attributeFilters).forEach(([attrKey, values]) => {
      if (values && values.length > 0) {
        // טיפול מיוחד ב-colorFamily - זה שדה שטוח ב-SKU, לא בתוך attributes
        if (attrKey === 'colorFamily') {
          attributeMatchConditions.push({
            colorFamily: { $in: values }
          });
        } else if (attrKey === 'color') {
          // color filter in the UI is actually selecting a color family (e.g., 'black')
          // Support matching by colorFamily OR by the raw color hex (if colorFamily wasn't set on the SKU)
          const familyValues = values.map(v => String(v).toLowerCase());
          const hexCandidates: string[] = [];
          if (colorFamilyToHexes) {
            for (const v of familyValues) {
              const arr = colorFamilyToHexes[v];
              if (arr && arr.length > 0) hexCandidates.push(...arr);
            }
          }

          const orClauses: any[] = [ { colorFamily: { $in: values } } ];
          if (hexCandidates.length > 0) {
            // Use case-insensitive hex matching using $expr + $toLower
            orClauses.push({ $expr: { $in: [ { $toLower: '$color' }, hexCandidates ] } });
          }
          attributeMatchConditions.push({ $or: orClauses });
        } else {
          // שאר המאפיינים נמצאים בתוך attributes
          attributeMatchConditions.push({
            [`attributes.${attrKey}`]: { $in: values }
          });
        }
      }
    });

    if (attributeMatchConditions.length > 0) {
      if (isDev) console.log('🔍 [fetchProductsFiltered] Match conditions:', JSON.stringify(attributeMatchConditions, null, 2));
      
      // מצא את כל ה-productIds שיש להם SKUs עם המאפיינים
      // אבל צריך שכל מאפיין יופיע בלפחות SKU אחד
      const productIds = await Sku.aggregate([
        {
          $match: {
            $or: attributeMatchConditions
          }
        },
        {
          $group: {
            _id: '$productId',
            // נשמור גם את attributes וגם את השדות השטוחים (colorFamily, color)
            matchedAttributes: { 
              $addToSet: {
                attributes: '$attributes',
                colorFamily: '$colorFamily',
                color: '$color'
              }
            }
          }
        }
      ]);

      if (isDev) {
        console.log('📦 [fetchProductsFiltered] Found products with matching SKUs:', productIds.length);
        console.log('📦 [fetchProductsFiltered] Product IDs:', productIds.map(p => p._id));
      }

      // עכשיו צריך לסנן רק מוצרים שיש להם את **כל** המאפיינים
      // לא מספיק שיש להם חלק מהם
      const validProductIds: string[] = [];
      
      for (const item of productIds) {
        const productId = item._id.toString();
  const matchedAttrs = item.matchedAttributes; // זה מערך של { attributes, colorFamily, color }
        
        // בדוק שלכל attrKey יש לפחות ערך אחד תואם
        const hasAllAttributes = Object.entries(attributeFilters).every(([attrKey, requiredValues]) => {
          return matchedAttrs.some((skuData: any) => {
            // טיפול מיוחד ב-colorFamily - זה שדה שטוח
            if (attrKey === 'colorFamily') {
              return skuData.colorFamily && requiredValues.includes(skuData.colorFamily);
            }
            // צבע רגיל נשמר גם הוא בשדה שטוח
            if (attrKey === 'color') {
              // אם קיימת משפחת הצבע בשדה ה-SKU - בדוק התאמה במשפחות
              if (skuData.colorFamily && requiredValues.includes(skuData.colorFamily)) {
                return true;
              }
              // בחר גם על בסיס hex אם יש מפה של colorFamily -> hex ול- SKU יש צבע
              const colorHex = skuData.color ? String(skuData.color).toLowerCase() : null;
              if (colorHex && colorFamilyToHexes) {
                const requiredHexes: string[] = [];
                for (const v of requiredValues) {
                  const arr = colorFamilyToHexes[String(v).toLowerCase()] || [];
                  if (arr.length > 0) requiredHexes.push(...arr);
                }
                if (requiredHexes.length > 0 && requiredHexes.includes(colorHex)) return true;
              }
              // לבסוף - בדיקה בתוך attributes (אחורה תאימות)
              const skuValueAlt = skuData.attributes?.[attrKey];
              return skuValueAlt && requiredValues.includes(skuValueAlt);
            }
            // שאר המאפיינים בתוך attributes
            const skuValue = skuData.attributes?.[attrKey];
            return skuValue && requiredValues.includes(skuValue);
          });
        });
        
        if (hasAllAttributes) {
          validProductIds.push(productId);
        }
      }

      if (isDev) console.log('✅ [fetchProductsFiltered] Valid product IDs after filtering:', validProductIds);

      productIdsWithAttributes = validProductIds;
      
      // אם לא נמצאו מוצרים - נחזיר תוצאה ריקה
      if (validProductIds.length === 0) {
        return {
          data: [],
          meta: {
            total: await getTotalProductsCount(), // 🚀 Performance: שימוש ב-cache
            filtered: 0,
            page: 1,
            pageSize,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }
    }
  }

  // טיפול בקטגוריות עם היררכיה
  let finalCategoryIds: string[] = [];
  
  // אם יש categorySlugs (הגישה החדשה) - נמצא את כל הצאצאים
  if (categorySlugs && categorySlugs.length > 0) {
    const allDescendantIds = new Set<string>();
    
    for (const slug of categorySlugs) {
      const descendantIds = await getCategoryWithDescendants(slug);
      descendantIds.forEach(id => allDescendantIds.add(id));
    }
    
    finalCategoryIds = Array.from(allDescendantIds);
  }
  // אם אין categorySlugs אבל יש categoryIds (תאימות לאחור)
  else if (categoryIds && categoryIds.length > 0) {
    try {
      // ננסה לאמת שכל ה-IDs הם ObjectIds חוקיים
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mongoose = require('mongoose');
      finalCategoryIds = categoryIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    } catch (err) {
      // במידה ו-import dynamic נכשל או ערך לא תקין – מתעלמים בשקט
      finalCategoryIds = [];
    }
  }

  // הוספת הפילטר לקטגוריות אם יש
  if (finalCategoryIds.length > 0) {
    filter.categoryId = { $in: finalCategoryIds };
  }

  // הוספת הפילטר למוצרים עם מאפיינים מתאימים
  if (productIdsWithAttributes !== null) {
    filter._id = { $in: productIdsWithAttributes.map(id => new mongoose.Types.ObjectId(id)) };
  }

  // אפשר כאן בהמשך להוסיף: קטגוריה, צבעים, חיפוש טקסטואלי וכו'.

  const sortObj = mapSort(sort);

  // 🚀 Performance: שימוש ב-cache לקטגוריות מושבתות במקום שאילתה בכל בקשה
  // מוצרים שהקטגוריה שלהם isActive=false לא יוצגו בחנות
  const inactiveIds = await getInactiveCategoryIds();
  
  if (inactiveIds.length > 0) {
    // אם כבר יש filter.categoryId - צריך לוודא שלא כולל קטגוריות מושבתות
    if (filter.categoryId?.$in) {
      // מסננים את הקטגוריות המושבתות מהרשימה
      filter.categoryId.$in = filter.categoryId.$in.filter(
        (id: string) => !inactiveIds.includes(id.toString())
      );
    } else {
      // אין סינון קטגוריה ספציפי - מוציאים את כל המושבתות
      filter.categoryId = { $nin: inactiveIds.map(id => new mongoose.Types.ObjectId(id)) };
    }
  }

  // חישובי פגינציה (הזזה: page 1 -> skip 0)
  const currentPage = page < 1 ? 1 : page;
  const size = pageSize > 0 && pageSize <= 100 ? pageSize : 20; // הגבלת מקסימום 100 למניעת עומס
  const skip = (currentPage - 1) * size;

  // 🚀 Performance: שימוש ב-cache לספירת כל המוצרים + שאילתות במקביל
  const [total, filtered, data] = await Promise.all([
    getTotalProductsCount(), // cache עם TTL של 5 דקות
    Product.countDocuments(filter),
    Product.find(filter).sort(sortObj).skip(skip).limit(size).lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered / size)); // מספר העמודים הכולל

  // בניית אובייקט meta להחזרת מידע על הפגינציה
  const meta: ProductsMeta = {
    total, // סה"כ מוצרים
    filtered, // סה"כ מוצרים לאחר פילטרים
    page: currentPage, // העמוד הנוכחי
    pageSize: size, // גודל עמוד
    totalPages, // מספר העמודים הכולל
    hasNext: currentPage < totalPages, // האם יש עמוד הבא
    hasPrev: currentPage > 1, // האם יש עמוד קודם
  };

  return { data, meta };
}

/**
 * מחזיר את כל המוצרים ממוינים לפי תאריך יצירה מהחדש לישן (createdAt יורד).
 * 🛡️ מוצרים באשפה (isActive: false) לא יוצגו ללקוחות
 * @returns {Promise<IProduct[]>}
 */
export const fetchAllProductsSortedByDate = async (): Promise<any[]> => {
  return Product.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

/**
 * מחזיר את המוצרים החדשים ביותר (ממוינים לפי createdAt מהחדש לישן).
 * 🛡️ מוצרים באשפה (isActive: false) לא יוצגו
 * @param {number} limit - כמה מוצרים להחזיר (ברירת מחדל 8)
 * @returns {Promise<IProduct[]>}
 */
export const fetchRecentProducts = async (limit: number = 8): Promise<any[]> => {
  return Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(limit).lean();
};
/**
 * מחזיר את המוצרים הפופולריים ביותר, ממוינים לפי viewCount ו-salesCount.
 * 🛡️ מוצרים באשפה (isActive: false) לא יוצגו
 * @param {number} limit - כמה מוצרים להחזיר
 * @returns {Promise<IProduct[]>}
 */
export const fetchPopularProducts = async (limit: number = 8): Promise<any[]> => {
  // 🛡️ רק מוצרים פעילים - מוצרים באשפה לא יוצגו ללקוחות
  return Product.find({ isActive: true })
    .sort({ 
      viewCount: -1,    // קודם לפי כמות צפיות (מהגבוה לנמוך)
      salesCount: -1,   // לאחר מכן לפי כמות מכירות (מהגבוה לנמוך)
      createdAt: -1     // לבסוף לפי תאריך יצירה (הכי חדש קודם) במקרה של שוויון
    })
    .limit(limit)
    .lean();
};

/**
 * מביא מוצרים מ-API חיצוני ומנרמל אותם לפורמט IProduct שלנו.
 * זוהי פונקציית placeholder.
 * @returns {Promise<IProduct[]>} הבט שמחזיר מערך של מוצרים.
 */
async function getProductsFromExternalAPI(): Promise<any[]> {
  try {
    console.log('Fetching from external API... (placeholder)');
    // דוגמה כיצד זה עשוי להיראות עם קריאה אמיתית ל-API חיצוני:
    // const response = await axios.get('https://api.some-supplier.com/products');
    // const normalizedProducts = response.data.map((item: any) => ({ ... }));
    // return normalizedProducts;
    return []; // כרגע מחזיר מערך ריק
  } catch (error) {
    console.error("Error fetching from external API", error);
    return []; // מחזיר מערך ריק במקרה של שגיאה כדי לא לשבור את הפונקציה הראשית
  }
}

/**
 * מביא מוצרים ממסד הנתונים המקומי (MongoDB).
 * @returns {Promise<IProduct[]>} הבט שמחזיר מערך של מוצרים.
 */
async function getProductsFromDB(): Promise<any[]> {
  return Product.find().lean();
}

/**
 * מביא את כל המוצרים מכל המקורות (מסד נתונים, APIs חיצוניים וכו')
 * ומחזיר אותם כמערך מאוחד.
 * @returns {Promise<IProduct[]>} מערך מאוחד של כל המוצרים.
 */
export const fetchAllProducts = async (): Promise<any[]> => {
  const [dbProducts, externalProducts] = await Promise.all([
    getProductsFromDB(),
    getProductsFromExternalAPI(),
  ]);

  return [...dbProducts, ...externalProducts];
};

/**
 * מחפש מוצר בודד לפי מזהה (ID).
 * כרגע מחפש רק במסד הנתונים המקומי.
 * 🛡️ מוצרים באשפה (isActive: false) לא יוצגו ללקוחות
 * @param {string} id מזהה המוצר לחיפוש.
 * @returns {Promise<IProduct | null>} מסמך המוצר או null אם לא נמצא.
 */
export const fetchProductById = async (id: string): Promise<IProduct | null> => {
  // רק מוצרים פעילים - מוצרים באשפה לא יוצגו
  return Product.findOne({ _id: id, isActive: true });
};

/**
 * מחזיר מוצרים קשורים למוצר נתון
 * הלוגיקה:
 * 1. ראשית - מוצרים מאותה קטגוריה (ללא המוצר הנוכחי)
 * 2. אם אין מספיק - ממלאים עם מוצרים פופולריים מקטגוריות אחרות
 * 3. ממוינים לפי פופולריות (viewCount + salesCount)
 * @param {string} productId - מזהה המוצר הנוכחי
 * @param {number} limit - כמה מוצרים להחזיר (ברירת מחדל: 4)
 * @returns {Promise<IProduct[]>} מערך של מוצרים קשורים
 */
export const fetchRelatedProducts = async (
  productId: string,
  limit: number = 4
): Promise<any[]> => {
  // שלב 1: מציאת המוצר הנוכחי כדי לקבל את הקטגוריה שלו
  const currentProduct = await Product.findById(productId).select('categoryId').lean();
  
  if (!currentProduct) {
    // אם המוצר לא נמצא, מחזירים מוצרים פופולריים כללי
    return Product.find({ isActive: true })
      .sort({ salesCount: -1, viewCount: -1 })
      .limit(limit)
      .lean();
  }

  const categoryId = (currentProduct as any).categoryId;
  
  // שלב 2: חיפוש מוצרים מאותה קטגוריה (ללא המוצר הנוכחי)
  const sameCategoryProducts = await Product.find({
    _id: { $ne: productId },        // לא המוצר הנוכחי
    categoryId: categoryId,         // אותה קטגוריה
    isActive: true,                 // רק מוצרים פעילים
    quantityInStock: { $gt: 0 }     // רק מוצרים במלאי
  })
    .sort({ salesCount: -1, viewCount: -1 }) // מיון לפי פופולריות
    .limit(limit)
    .lean();

  // שלב 3: אם יש מספיק מוצרים מאותה קטגוריה, מחזירים אותם
  if (sameCategoryProducts.length >= limit) {
    return sameCategoryProducts.slice(0, limit);
  }

  // שלב 4: אם אין מספיק, ממלאים עם מוצרים פופולריים מקטגוריות אחרות
  const existingIds = [productId, ...sameCategoryProducts.map(p => (p as any)._id.toString())];
  
  const additionalProducts = await Product.find({
    _id: { $nin: existingIds },     // לא כוללים מוצרים שכבר יש לנו
    isActive: true,                 // רק מוצרים פעילים
    quantityInStock: { $gt: 0 }     // רק מוצרים במלאי
  })
    .sort({ salesCount: -1, viewCount: -1 }) // מיון לפי פופולריות
    .limit(limit - sameCategoryProducts.length)
    .lean();

  // שלב 5: שילוב התוצאות - קודם מאותה קטגוריה, אחר כך פופולריים
  return [...sameCategoryProducts, ...additionalProducts];
};

/**
 * Phase 3.2: שליפת SKUs של מוצר מה-SKU Collection
 * @param {string} productId מזהה המוצר
 * @returns {Promise<any[]>} מערך של SKUs פעילים
 */
export const fetchProductSkus = async (productId: string): Promise<any[]> => {
  // יייבוא דינמי של Sku כדי למנוע circular dependencies
  const Sku = (await import('../models/Sku')).default;
  const skus = await Sku.find({ productId, isActive: true })
    .sort({ sku: 1 })
    .lean();

  // החזרת SKUs עם שדות שטוחים (color, size) - לא צריך נרמול attributes
  return skus.map((sku) => ({
    ...sku,
    productId: sku.productId?.toString?.() || sku.productId,
  }));
};

/**
 * שליפה מרוכזת של SKUs עבור מספר מוצרים במכה אחת למניעת N+1.
 */
export const fetchActiveSkusByProductIds = async (
  productIds: string[]
): Promise<Record<string, any[]>> => {
  if (productIds.length === 0) {
    return {};
  }

  const Sku = (await import('../models/Sku')).default;
  const skus = await Sku.find({ productId: { $in: productIds }, isActive: true })
    .sort({ sku: 1 })
    .lean();

  const grouped: Record<string, any[]> = {};

  skus.forEach((sku) => {
    const key = sku.productId?.toString?.() || String(sku.productId);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({
      ...sku,
      productId: key,
    });
  });

  return grouped;
};

/**
 * יוצר מוצר חדש ושומר אותו במסד הנתונים.
 * @param {Partial<IProduct>} productData נתוני המוצר החדש.
 * @returns {Promise<IProduct>} מסמך המוצר החדש שנוצר.
 */
export const createNewProduct = async (productData: Partial<IProduct>): Promise<IProduct> => {
    const product = new Product(productData);
    const savedProduct = await product.save();
    // 🚀 Performance: ניקוי cache של ספירת מוצרים כי נוסף מוצר
    invalidateTotalProductsCache();
    return savedProduct;
};

/**
 * מעדכן מוצר קיים במסד הנתונים.
 * @param {string} id מזהה המוצר לעדכון.
 * @param {Partial<IProduct>} productData הנתונים החדשים למוצר.
 * @returns {Promise<IProduct | null>} מסמך המוצר המעודכן או null אם לא נמצא.
 */
export const updateExistingProduct = async (id: string, productData: Partial<IProduct>): Promise<IProduct | null> => {
    return Product.findByIdAndUpdate(id, productData, { new: true, runValidators: true });
};

/**
 * מוחק מוצר ממסד הנתונים.
 * @param {string} id מזהה המוצר למחיקה.
 * @returns {Promise<IProduct | null>} מסמך המוצר שנמחק או null אם לא נמצא.
 */
export const deleteExistingProduct = async (id: string): Promise<IProduct | null> => {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (deletedProduct) {
      // 🚀 Performance: ניקוי cache של ספירת מוצרים כי מוחק מוצר
      invalidateTotalProductsCache();
    }
    return deletedProduct;
};

/**
 * מגדיל את מונה הצפיות של מוצר ב-1.
 * @param {string} id מזהה המוצר לעדכון.
 * @returns {Promise<IProduct | null>} מסמך המוצר המעודכן או null אם לא נמצא.
 */
export const incrementProductViewCount = async (id: string): Promise<IProduct | null> => {
    return Product.findByIdAndUpdate(
        id, 
        { $inc: { viewCount: 1 } }, 
        { new: true, runValidators: true }
    );
};

/**
 * מגדיל את מונה המכירות של מוצר בכמות נתונה.
 * @param {string} id מזהה המוצר לעדכון.
 * @param {number} amount כמות להגדלה (ברירת מחדל 1).
 * @returns {Promise<IProduct | null>} מסמך המוצר המעודכן או null אם לא נמצא.
 */
export const incrementProductSalesCount = async (id: string, amount: number = 1): Promise<IProduct | null> => {
    return Product.findByIdAndUpdate(
        id, 
        { $inc: { salesCount: amount } }, 
        { new: true, runValidators: true }
    );
};

// ============================================================================
// 🔥 פונקציות חדשות עם MongoDB Transactions (Phase 0.5.5)
// ============================================================================

/**
 * יוצר מוצר חדש יחד עם ה-SKUs שלו באופן אטומי (Transaction).
 * אם יצירת Product מצליחה אבל יצירת SKU נכשלת - הכל מתבטל (rollback).
 * 
 * CRITICAL: בודק duplicates לפני יצירה, אבל ה-unique index הוא הגנה אמיתית.
 * 
 * @param productData - נתוני המוצר (ללא SKUs מוטמעים)
 * @param skusData - מערך של SKUs ליצירה
 * @returns המוצר המלא עם ה-SKUs שלו
 * @throws Error אם אחד מה-SKUs כבר קיים
 */
export const createProductWithSkus = async (
  productData: Partial<IProduct>,
  skusData: Partial<ISku>[]
): Promise<{ product: IProduct; skus: ISku[] }> => {
  // 🆕 SKU בסיס אוטומטי - אם אין SKUs ו-hasVariants=false
  let finalSkusData = skusData;
  
  if ((!skusData || skusData.length === 0) && !productData.hasVariants) {
    console.log('🤖 [Auto SKU] No SKUs provided and hasVariants=false → Creating base SKU automatically');
    
    // יצירת SKU code ייחודי מהשם
    const baseSku = (productData.name || 'PRODUCT')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-') // החלפת תווים מיוחדים ב-
      .replace(/-+/g, '-') // איחוד מקפים רצופים
      .substring(0, 30); // הגבלת אורך
    
    // יצירת SKU בסיס עם נתוני המוצר
    finalSkusData = [{
      sku: baseSku,
      name: productData.name || 'Default SKU',
      price: productData.basePrice, // משתמש במחיר הבסיס (Base Price Override Pattern)
      stockQuantity: productData.quantityInStock || 0,
      // ללא שדות color/size - מוצר פשוט ללא וריאנטים
      isActive: true
    }];
    
    console.log('✅ [Auto SKU] Created base SKU:', finalSkusData[0]);
  }

  // Pre-validation: בדיקת duplicates לפני יצירת transaction
  const skuCodes = finalSkusData.map((s) => s.sku || '').filter(Boolean);
  if (skuCodes.length > 0) {
    const existingSkus = await checkMultipleSkusExist(skuCodes);
    if (existingSkus.length > 0) {
      throw new Error(
        `SKU codes already exist: ${existingSkus.join(', ')}. ` +
        `Please use unique SKU codes.`
      );
    }
  }

  // יצירת session ל-transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // שלב 1: יצירת המוצר (עם session)
    const [product] = await Product.create([productData], { session });

    // שלב 2: יצירת כל ה-SKUs עם productId של המוצר החדש
    const skusWithProductId = finalSkusData.map(skuData => ({
      ...skuData,
      productId: product._id
    }));

    const createdSkus = await Sku.insertMany(skusWithProductId, { session });

    // שלב 3: Commit - הכל עבר בהצלחה!
    // ====== סינכרון מלאי למוצר בתוך הטרנזקציה ======
    // חישוב סה"כ מלאי מתוך ה-SKUs שנוצרו ועדכון שדה quantityInStock במוצר
    const totalStock = createdSkus.reduce((sum, s) => sum + (s.stockQuantity || 0), 0);
    // עדכון המוצר עם הסה"כ מלאי החדש בתוך אותה session
    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      { quantityInStock: totalStock },
      { new: true, session }
    );

    await session.commitTransaction();
    
    // 🚀 Performance: ניקוי cache של ספירת מוצרים כי נוסף מוצר חדש
    invalidateTotalProductsCache();

    console.log(`✅ Product created with ${createdSkus.length} SKUs (Transaction committed). TotalStock=${totalStock}`);

    return {
      product: updatedProduct || product,
      skus: createdSkus
    };

  } catch (error: any) {
    // שלב 4: Rollback - משהו נכשל, מבטלים הכל!
    await session.abortTransaction();
    
    // זיהוי duplicate key error (MongoDB error code 11000)
    if (error.code === 11000 && error.keyPattern?.sku) {
      const duplicateSku = error.keyValue?.sku;
      console.error(`❌ Duplicate SKU detected: ${duplicateSku}`);
      throw new Error(
        `SKU "${duplicateSku}" already exists. This is a race condition - ` +
        `the SKU was created between validation and insertion.`
      );
    }
    
    console.error('❌ Transaction aborted - Product creation failed:', error);
    throw error;
  } finally {
    // שלב 5: ניקוי session (תמיד!)
    session.endSession();
  }
};

/**
 * מעדכן מוצר קיים יחד עם ה-SKUs שלו באופן אטומי (Transaction).
 * מוחק את כל ה-SKUs הישנים ויוצר את החדשים.
 * 
 * CRITICAL: בודק duplicates לפני עדכון (מלבד SKUs של המוצר הנוכחי).
 * 
 * @param productId - ID של המוצר לעדכון
 * @param productData - נתונים חדשים למוצר
 * @param skusData - מערך חדש של SKUs (מחליף את הישנים)
 * @returns המוצר המעודכן עם ה-SKUs החדשים
 * @throws Error אם אחד מה-SKUs החדשים כבר קיים במוצר אחר
 */
export const updateProductWithSkus = async (
  productId: string,
  productData: Partial<IProduct>,
  skusData: Partial<ISku>[]
): Promise<{ product: IProduct; skus: ISku[] }> => {
  console.log('🔧 [updateProductWithSkus] Called with:', {
    productId,
    productDataKeys: Object.keys(productData),
    specifications: productData.specifications, // 🔍 DEBUG
    skusCount: skusData.length,
    firstSku: skusData[0],
    allSkus: JSON.stringify(skusData, null, 2)
  });

  // Pre-validation: בדיקת duplicates (מלבד SKUs של מוצר זה)
  const skuCodes = skusData.map((s) => s.sku || '').filter(Boolean);
  if (skuCodes.length > 0) {
    const existingSkus = await checkMultipleSkusExist(skuCodes, productId);
    if (existingSkus.length > 0) {
      throw new Error(
        `SKU codes already exist in other products: ${existingSkus.join(', ')}. ` +
        `Please use unique SKU codes.`
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🔔 שלב 0: שמירת מצב המלאי הקודם לזיהוי SKUs שחזרו למלאי
    const previousSkus = await Sku.find({ productId }).select('sku stockQuantity').lean();
    const previousStockMap = new Map<string, number>();
    previousSkus.forEach(s => {
      previousStockMap.set(s.sku, s.stockQuantity || 0);
    });

    // שלב 1: עדכון המוצר
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      productData,
      { new: true, runValidators: true, session }
    );

    if (!updatedProduct) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // שלב 2: מחיקת כל ה-SKUs הישנים
    await Sku.deleteMany({ productId }, { session });

    // שלב 3: יצירת SKUs חדשים
    const skusWithProductId = skusData.map(skuData => ({
      ...skuData,
      productId
    }));

    const createdSkus = await Sku.insertMany(skusWithProductId, { session });

    // שלב 4: Commit
    // ====== סינכרון מלאי למוצר בתוך הטרנזקציה (בעת עדכון) ======
    // חישוב סה"כ מלאי מתוך ה-SKUs החדשים ועדכון שדה quantityInStock במוצר המעודכן
    const totalStock = createdSkus.reduce((sum, s) => sum + (s.stockQuantity || 0), 0);
    const updatedProductWithStock = await Product.findByIdAndUpdate(
      productId,
      { quantityInStock: totalStock },
      { new: true, session }
    );

    await session.commitTransaction();

    console.log(`✅ Product updated with ${createdSkus.length} SKUs (Transaction committed). TotalStock=${totalStock}`);

    // 🔔 שלב 5: זיהוי SKUs שחזרו למלאי ושליחת התראות
    // בודקים אם יש SKU שהיה במלאי 0 ועכשיו יש לו מלאי חיובי
    for (const newSku of createdSkus) {
      const previousStock = previousStockMap.get(newSku.sku) || 0;
      const newStock = newSku.stockQuantity || 0;
      
      // אם היה 0 ועכשיו חיובי - SKU חזר למלאי!
      if (previousStock === 0 && newStock > 0) {
        console.log(`🔔 SKU ${newSku.sku} back in stock! Previous: ${previousStock}, New: ${newStock}. Triggering alerts...`);
        // שליחה אסינכרונית - לא מעכבת
        triggerStockAlerts(newSku.sku, productId).catch((err) => {
          console.error(`Error triggering stock alerts for SKU ${newSku.sku}:`, err);
        });
      }
    }

    return {
      product: updatedProductWithStock || updatedProduct,
      skus: createdSkus
    };

  } catch (error: any) {
    // Rollback
    await session.abortTransaction();
    
    // זיהוי duplicate key error
    if (error.code === 11000 && error.keyPattern?.sku) {
      const duplicateSku = error.keyValue?.sku;
      console.error(`❌ Duplicate SKU detected during update: ${duplicateSku}`);
      throw new Error(
        `SKU "${duplicateSku}" already exists. This is a race condition - ` +
        `the SKU was created between validation and insertion.`
      );
    }
    
    console.error('❌ Transaction aborted - Product update failed:', error);
    throw error;
  } finally {
    // ניקוי session
    session.endSession();
  }
};

/**
 * מחיקה רכה (Soft Delete) של מוצר וכל ה-SKUs שלו באופן אטומי.
 * מעדכן את isActive ל-false במקום למחוק לגמרי.
 * 
 * @param productId - ID של המוצר למחיקה
 */
export const softDeleteProduct = async (productId: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // שלב 1: soft delete של המוצר
    const product = await Product.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true, session }
    );

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // שלב 2: soft delete של כל ה-SKUs
    await Sku.updateMany(
      { productId },
      { isActive: false },
      { session }
    );

    // שלב 3: Commit
    await session.commitTransaction();

    console.log(`✅ Product and SKUs soft deleted (Transaction committed)`);

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Transaction aborted - Soft delete failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * שחזור מוצר ו-SKUs שנמחקו רכה (isActive = true).
 * 
 * @param productId - ID של המוצר לשחזור
 */
export const restoreProduct = async (productId: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // שלב 1: שחזור המוצר
    const product = await Product.findByIdAndUpdate(
      productId,
      { isActive: true },
      { new: true, session }
    );

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // שלב 2: שחזור כל ה-SKUs
    await Sku.updateMany(
      { productId },
      { isActive: true },
      { session }
    );

    // שלב 3: Commit
    await session.commitTransaction();

    console.log(`✅ Product and SKUs restored (Transaction committed)`);

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Transaction aborted - Restore failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * מחיקה קשה (Hard Delete) של מוצר.
 * מוחק לצמיתות את המוצר וכל ה-SKUs שלו (באמצעות pre-delete middleware).
 * כמו כן מוחק את כל התמונות מ-Cloudinary המקושרות למוצר ול-SKUs שלו.
 * 
 * ⚠️ DANGER: פעולה בלתי הפיכה! יש להשתמש רק במקרים נדירים.
 * לרוב המקרים, השתמש ב-softDeleteProduct במקום.
 * 
 * @param productId - ID של המוצר למחיקה
 */
export const hardDeleteProduct = async (productId: string): Promise<void> => {
  try {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // שלב 1: מחיקת תמונות של המוצר מ-DigitalOcean Spaces
    if (product.images && product.images.length > 0) {
      const { deleteBulkFromSpaces } = await import('./spacesService');

      // בניית מערך של כל ה-keys למחיקה (3 גדלים לכל תמונה)
      const keysToDelete: string[] = [];
      for (const image of product.images) {
        keysToDelete.push(
          `${image.key}-thumbnail.webp`,
          `${image.key}-medium.webp`,
          `${image.key}-large.webp`
        );
      }

      try {
        const deletedCount = await deleteBulkFromSpaces(keysToDelete);
        console.log(`🗑️ Deleted ${deletedCount} image files from Spaces`);
      } catch (err) {
        console.warn(`⚠️ Failed to delete some images from Spaces:`, err);
        // לא עוצרים את כל התהליך בגלל כשל במחיקת תמונות
      }
    }

    // שלב 2: מחיקת תמונות של SKUs מ-DigitalOcean Spaces
    const skus = await Sku.find({ productId });
    if (skus.length > 0) {
      const { deleteBulkFromSpaces } = await import('./spacesService');

      // בניית מערך של כל ה-keys למחיקה
      const keysToDelete: string[] = [];
      for (const sku of skus) {
        if (sku.images && sku.images.length > 0) {
          for (const image of sku.images) {
            keysToDelete.push(
              `${image.key}-thumbnail.webp`,
              `${image.key}-medium.webp`,
              `${image.key}-large.webp`
            );
          }
        }
      }

      if (keysToDelete.length > 0) {
        try {
          const deletedCount = await deleteBulkFromSpaces(keysToDelete);
          console.log(`🗑️ Deleted ${deletedCount} SKU image files from Spaces`);
        } catch (err) {
          console.warn(`⚠️ Failed to delete some SKU images from Spaces:`, err);
        }
      }
    }

    // שלב 3: מחיקת המוצר מ-MongoDB (הpre-delete middleware ימחק את SKUs באופן אוטומטי)
    await Product.deleteOne({ _id: productId });

    console.log(`✅ Product, SKUs, and all images permanently deleted`);

  } catch (error) {
    console.error('❌ Hard delete failed:', error);
    throw error;
  }
};

/**
 * בודק אם SKU קיים במערכת (לולידציה לפני יצירה).
 * 
 * CRITICAL: פונקציה זו עובדת ביחד עם unique index על SKU.
 * היא מספקת validation מהיר, אבל ה-unique index ב-MongoDB
 * הוא הגנה אמיתית מפני race conditions.
 * 
 * @param sku - קוד SKU לבדיקה (יומר לאותיות גדולות)
 * @param excludeProductId - (אופציונלי) ID של מוצר להחרגה (לעדכון)
 * @returns true אם SKU קיים, false אחרת
 */
export const checkSkuExists = async (
  sku: string,
  excludeProductId?: string
): Promise<boolean> => {
  // נרמול: המרה לאותיות גדולות (בהתאם למודל)
  const normalizedSku = sku.trim().toUpperCase();
  
  const query: any = { sku: normalizedSku };
  
  // אם זה עדכון, אל תספור SKUs של המוצר הנוכחי
  if (excludeProductId) {
    query.productId = { $ne: excludeProductId };
  }

  // שימוש ב-lean() לביצועים (לא צריך מסמך מלא)
  const existing = await Sku.findOne(query).lean();
  return !!existing;
};

/**
 * בודק ייחודיות של מספר SKUs בבת אחת (לאופטימיזציה).
 * שימושי ליצירת/עדכון מוצר עם מספר SKUs.
 * 
 * @param skus - מערך של קודי SKU לבדיקה
 * @param excludeProductId - (אופציונלי) ID של מוצר להחרגה
 * @returns מערך של SKUs שכבר קיימים
 */
export const checkMultipleSkusExist = async (
  skus: string[],
  excludeProductId?: string
): Promise<string[]> => {
  // נרמול: המרה לאותיות גדולות
  const normalizedSkus = skus.map((s) => s.trim().toUpperCase());
  
  const query: any = { sku: { $in: normalizedSkus } };
  
  // אם זה עדכון, אל תספור SKUs של המוצר הנוכחי
  if (excludeProductId) {
    query.productId = { $ne: excludeProductId };
  }

  // שליפת רק שדה sku (לא כל המסמך)
  const existingSkus = await Sku.find(query).select('sku').lean();
  
  return existingSkus.map((doc) => doc.sku);
};

// ============================================================================
// 🚀 Phase 0.5.10: Cursor-based Pagination (Performance Optimization)
// ============================================================================

/**
 * אפשרויות לפגינציה מבוססת cursor
 */
export interface CursorPaginationOptions {
  priceMin?: number;
  priceMax?: number;
  sort?: string; // price_asc | price_desc | date_desc | date_asc | views_desc | sales_desc
  limit?: number; // כמות פריטים להחזיר (ברירת מחדל 20)
  cursor?: string; // cursor למעבר לעמוד הבא (ערך מקודד)
  categoryIds?: string[];
  categorySlugs?: string[];
}

/**
 * תוצאת פגינציה מבוססת cursor
 */
export interface CursorPaginationResult {
  data: IProduct[];
  meta: {
    total: number; // סה"כ מוצרים במערכת
    filtered: number; // סה"כ מוצרים לאחר פילטרים
    limit: number; // כמות פריטים שהתבקשה
    hasNext: boolean; // האם יש עוד תוצאות
    nextCursor: string | null; // cursor לעמוד הבא
  };
}

/**
 * פונקציית עזר לפענוח cursor
 * Cursor מכיל את ערך המיון האחרון + _id האחרון
 * פורמט: base64(JSON.stringify({sortValue, id}))
 */
function decodeCursor(cursor: string): { sortValue: any; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * פונקציית עזר לקידוד cursor
 */
function encodeCursor(sortValue: any, id: string): string {
  const data = { sortValue, id };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * 🚀 Cursor-based Pagination - אופטימלי לדפי מוצרים גדולים
 * 
 * יתרונות על פני skip-based:
 * - ביצועים קבועים (O(1)) גם בעמודים עמוקים
 * - אין "דילוגים" בנתונים אם מוסיפים/מוחקים מוצרים
 * - מתאים לאינפיניט סקרול
 * 
 * איך זה עובד:
 * 1. בקריאה הראשונה: cursor=null, מחזיר limit+1 פריטים
 * 2. אם יש limit+1 פריטים → hasNext=true, מחזיר cursor לפריט האחרון
 * 3. בקריאה הבאה: cursor מכיל ערך המיון האחרון + _id האחרון
 * 4. השאילתה: WHERE (sortField < lastValue) OR (sortField = lastValue AND _id > lastId)
 */
export async function fetchProductsCursorPagination(
  options: CursorPaginationOptions
): Promise<CursorPaginationResult> {
  const {
    priceMin,
    priceMax,
    sort = 'date_desc',
    limit = 20,
    cursor,
    categoryIds,
    categorySlugs,
  } = options;

  // הגבלת limit למקסימום 100 למניעת עומס
  const safeLimit = Math.min(Math.max(1, limit), 100);

  // בניית פילטר בסיסי
  const filter: Record<string, any> = {};

  // פילטר מחירים
  if (priceMin !== undefined || priceMax !== undefined) {
    filter.basePrice = {};
    if (priceMin !== undefined) filter.basePrice.$gte = priceMin;
    if (priceMax !== undefined) filter.basePrice.$lte = priceMax;
  }

  // פילטר קטגוריות (כמו בפונקציה המקורית)
  let finalCategoryIds: string[] = [];
  
  if (categorySlugs && categorySlugs.length > 0) {
    const allDescendantIds = new Set<string>();
    
    for (const slug of categorySlugs) {
      const descendantIds = await getCategoryWithDescendants(slug);
      descendantIds.forEach((id: string) => allDescendantIds.add(id));
    }
    
    finalCategoryIds = Array.from(allDescendantIds);
  } else if (categoryIds && categoryIds.length > 0) {
    finalCategoryIds = categoryIds.filter((id: string) => 
      mongoose.Types.ObjectId.isValid(id)
    );
  }

  if (finalCategoryIds.length > 0) {
    filter.categoryId = { $in: finalCategoryIds };
  }

  // קביעת שדה המיון וכיוונו
  let sortField: string;
  let sortDirection: 1 | -1;
  let sortObj: Record<string, 1 | -1>;

  switch (sort) {
    case 'price_asc':
      sortField = 'basePrice';
      sortDirection = 1;
      sortObj = { basePrice: 1, _id: 1 };
      break;
    case 'price_desc':
      sortField = 'basePrice';
      sortDirection = -1;
      sortObj = { basePrice: -1, _id: -1 };
      break;
    case 'date_asc':
      sortField = 'createdAt';
      sortDirection = 1;
      sortObj = { createdAt: 1, _id: 1 };
      break;
    case 'views_desc':
      sortField = 'viewCount';
      sortDirection = -1;
      sortObj = { viewCount: -1, _id: -1 };
      break;
    case 'sales_desc':
      sortField = 'salesCount';
      sortDirection = -1;
      sortObj = { salesCount: -1, _id: -1 };
      break;
    case 'date_desc':
    default:
      sortField = 'createdAt';
      sortDirection = -1;
      sortObj = { createdAt: -1, _id: -1 };
  }

  // טיפול ב-cursor (אם קיים)
  if (cursor) {
    const decoded = decodeCursor(cursor);
    
    if (decoded) {
      const { sortValue, id } = decoded;
      
      // המרת id ל-ObjectId תקין
      let objectId;
      try {
        objectId = new mongoose.Types.ObjectId(id);
      } catch (err) {
        console.error('Invalid cursor ObjectId:', id);
        objectId = id; // fallback
      }
      
      // בניית תנאי cursor מורכב:
      // עבור מיון יורד: (sortField < sortValue) OR (sortField = sortValue AND _id < id)
      // עבור מיון עולה: (sortField > sortValue) OR (sortField = sortValue AND _id > id)
      
      const operator = sortDirection === -1 ? '$lt' : '$gt';
      const idOperator = sortDirection === -1 ? '$lt' : '$gt';
      
      // המרת sortValue לטיפוס הנכון
      let parsedSortValue;
      if (sortValue === 'null') {
        parsedSortValue = null;
      } else if (sortField === 'basePrice' || sortField === 'viewCount' || sortField === 'salesCount') {
        parsedSortValue = Number(sortValue);
      } else if (sortField === 'createdAt') {
        parsedSortValue = new Date(sortValue);
      } else {
        parsedSortValue = sortValue;
      }
      
      filter.$or = [
        { [sortField]: { [operator]: parsedSortValue } },
        {
          [sortField]: parsedSortValue,
          _id: { [idOperator]: objectId },
        },
      ];
    }
  }

  // שאילתות מקבילות לספירה ושליפת נתונים
  const [total, filtered, results] = await Promise.all([
    Product.countDocuments({}), // סה"כ מוצרים
    Product.countDocuments(filter), // סה"כ מוצרים מפולטרים
    Product.find(filter)
      .sort(sortObj)
      .limit(safeLimit + 1) // +1 לבדיקת hasNext
      .lean(),
  ]);

  // בדיקה אם יש עמוד נוסף
  const hasNext = results.length > safeLimit;
  
  // אם יש עמוד נוסף, נסיר את הפריט האחרון (זה רק לבדיקה)
  const data = hasNext ? results.slice(0, safeLimit) : results;

  // יצירת cursor לעמוד הבא
  let nextCursor: string | null = null;
  if (hasNext && data.length > 0) {
    const lastItem = data[data.length - 1];
    const sortValue = (lastItem as any)[sortField];
    nextCursor = encodeCursor(sortValue, lastItem._id.toString());
  }

  return {
    data: data as IProduct[],
    meta: {
      total,
      filtered,
      limit: safeLimit,
      hasNext,
      nextCursor,
    },
  };
}

/**
 * Phase 5.0.2: פונקציה חדשה לטעינת מוצרים לדף ניהול עם Cursor Pagination אמיתי
 * תומך בסינון, מיון ו-cursor pagination בצד השרת
 */

export interface FetchProductsWithCursorParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  stockStatus?: 'low' | 'out' | 'lowOrOut'; // סינון לפי מצב מלאי: 'low' = מלאי נמוך, 'out' = אזל מלאי, 'lowOrOut' = שניהם
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface FetchProductsWithCursorResult {
  products: IProduct[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export const fetchProductsWithCursor = async (
  params: FetchProductsWithCursorParams
): Promise<FetchProductsWithCursorResult> => {
  const {
    search,
    categoryId,
    isActive,
    stockStatus, // פרמטר חדש: 'low' או 'out'
    sortBy = 'createdAt',
    sortDirection = 'desc',
    cursor,
    limit = 20
  } = params;
  
  console.log('🔍 [fetchProductsWithCursor] Params:', params);
  
  // בניית query
  const query: any = {};
  
  // פילטר: חיפוש בשם/תיאור
  if (search && search.trim() !== '') {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // פילטר: קטגוריה (כולל כל הצאצאים)
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const rootCategoryId = new mongoose.Types.ObjectId(categoryId);
    const categoryIds = await collectCategoryAndDescendantIds(rootCategoryId);
    query.categoryId = { $in: categoryIds };
    console.log('🗂️ [fetchProductsWithCursor] Category filter expanded to IDs:', categoryIds.map(id => id.toString()));
  } else if (categoryId) {
    console.warn('⚠️ [fetchProductsWithCursor] Invalid categoryId format:', categoryId);
  }
  
  // פילטר: סטטוס פעיל/לא פעיל
  if (isActive !== undefined) {
    query.isActive = isActive;
  }
  
  // Phase 7.1: פילטר מצב מלאי משופר - בודק גם SKUs בודדים
  // 'out' = מוצרים שיש להם לפחות SKU אחד שאזל (stockQuantity = 0)
  // 'low' = מוצרים שיש להם לפחות SKU אחד במלאי נמוך (ללא SKU שאזל)
  // 'lowOrOut' = מוצרים עם SKU נמוך או אזל (לניווט מהדשבורד)
  let useAggregation = false;
  let skuStockFilter: 'out' | 'low' | 'lowOrOut' | null = null;
  
  if (stockStatus === 'out' || stockStatus === 'low' || stockStatus === 'lowOrOut') {
    useAggregation = true;
    skuStockFilter = stockStatus;
    console.log(`📦 [fetchProductsWithCursor] Stock filter: ${stockStatus.toUpperCase()} - using SKU-level check`);
  }
  
  // Cursor pagination - המשך מהמקום שעצרנו
  if (cursor) {
    try {
      const [cursorValue, cursorId] = cursor.split('_');
      const cursorObjectId = new mongoose.Types.ObjectId(cursorId);
      
      // המרת cursorValue לפי סוג השדה
      let parsedCursorValue: any;
      if (sortBy === 'name' || sortBy === 'sku') {
        parsedCursorValue = cursorValue;
      } else if (sortBy === 'basePrice' || sortBy === 'salesCount' || sortBy === 'stockQuantity') {
        parsedCursorValue = Number(cursorValue);
      } else if (sortBy === 'createdAt') {
        parsedCursorValue = new Date(cursorValue);
      } else {
        parsedCursorValue = cursorValue;
      }
      
      // בניית תנאי המשך
      if (sortDirection === 'asc') {
        query.$or = [
          { [sortBy]: { $gt: parsedCursorValue } },
          { [sortBy]: parsedCursorValue, _id: { $gt: cursorObjectId } }
        ];
      } else {
        query.$or = [
          { [sortBy]: { $lt: parsedCursorValue } },
          { [sortBy]: parsedCursorValue, _id: { $lt: cursorObjectId } }
        ];
      }
    } catch (error) {
      console.error('❌ [fetchProductsWithCursor] Invalid cursor:', error);
      // אם ה-cursor לא תקין, ממשיכים בלי אותו
    }
  }
  
  // בניית אובייקט מיון
  const sortObj: any = {};
  sortObj[sortBy] = sortDirection === 'asc' ? 1 : -1;
  sortObj._id = sortDirection === 'asc' ? 1 : -1; // tie-breaker
  
  console.log('📊 [fetchProductsWithCursor] Query:', JSON.stringify(query));
  console.log('📊 [fetchProductsWithCursor] Sort:', sortObj);
  
  // ספירת סה"כ מוצרים (לפני הפילטרים)
  const total = await Product.countDocuments({});
  
  let products: any[];
  
  // Phase 7.1: אם יש פילטר מלאי - משתמשים ב-aggregation עם $lookup
  if (useAggregation && skuStockFilter) {
    // קבלת סף מלאי נמוך מההגדרות הגלובליות
    let skuLowThreshold = 5;
    try {
      const settings = await StoreSettings.getSettings();
      skuLowThreshold = settings.inventory?.defaultLowStockThreshold ?? 5;
    } catch {
      // fallback to 5
    }
    
    const aggregationPipeline: any[] = [
      // שלב 1: פילטר בסיסי על מוצרים
      { $match: query },
      
      // שלב 2: $lookup - צירוף SKUs למוצר
      {
        $lookup: {
          from: 'skus',
          localField: '_id',
          foreignField: 'productId',
          as: 'skusData',
          pipeline: [
            { $match: { isActive: true } } // רק SKUs פעילים
          ]
        }
      },
      
      // שלב 3: הוספת שדות חישוביים למצב מלאי של SKUs
      {
        $addFields: {
          // האם יש SKU שאזל (stockQuantity = 0)
          hasOutOfStockSku: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$skusData',
                    cond: { $eq: ['$$this.stockQuantity', 0] }
                  }
                }
              },
              0
            ]
          },
          // האם יש SKU במלאי נמוך (0 < stockQuantity <= threshold)
          hasLowStockSku: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$skusData',
                    cond: {
                      $and: [
                        { $gt: ['$$this.stockQuantity', 0] },
                        { $lte: ['$$this.stockQuantity', skuLowThreshold] }
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      },
      
      // שלב 4: פילטר לפי מצב מלאי
      {
        $match: (() => {
          if (skuStockFilter === 'lowOrOut') {
            return { $or: [{ hasOutOfStockSku: true }, { hasLowStockSku: true }] }; // מוצרים עם SKU נמוך או אזל
          } else if (skuStockFilter === 'out') {
            return { hasOutOfStockSku: true }; // מוצרים עם SKU שאזל
          } else {
            return { hasLowStockSku: true, hasOutOfStockSku: false }; // מוצרים עם SKU נמוך (בלי אזל)
          }
        })()
      },
      
      // שלב 5: מיון
      { $sort: sortObj },
      
      // שלב 6: הגבלת תוצאות
      { $limit: limit + 1 },
      
      // שלב 7: $lookup לקטגוריה
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      
      // שלב 8: עיצוב התוצאה
      {
        $addFields: {
          categoryId: { $arrayElemAt: ['$categoryData', 0] }
        }
      },
      
      // שלב 9: הסרת שדות זמניים
      {
        $project: {
          skusData: 0,
          categoryData: 0,
          hasOutOfStockSku: 0,
          hasLowStockSku: 0
        }
      }
    ];
    
    products = await Product.aggregate(aggregationPipeline);
    console.log(`📊 [fetchProductsWithCursor] Aggregation returned ${products.length} products`);
    
  } else {
    // שליפה רגילה (בלי פילטר מלאי)
    products = await Product.find(query)
      .sort(sortObj)
      .limit(limit + 1)
      .populate('categoryId', 'name slug')
      .lean();
  }
  
  // האם יש עוד מוצרים?
  const hasMore = products.length > limit;
  
  // הסרת המוצר ה-+1 (שרק לבדיקה)
  const resultProducts = hasMore ? products.slice(0, limit) : products;
  
  // Phase 7.1: שליפת SKUs עבור כל המוצרים להצגת פירוט מלאי
  const productIds = resultProducts.map(p => p._id);
  const skus = await Sku.find({ 
    productId: { $in: productIds },
    isActive: true // רק SKUs פעילים
  })
    .select('_id sku productId name price stockQuantity color attributes')
    .lean();
  
  // מיפוי SKUs לפי productId
  const skusByProduct = skus.reduce((acc, sku) => {
    const productIdStr = sku.productId.toString();
    if (!acc[productIdStr]) {
      acc[productIdStr] = [];
    }
    acc[productIdStr].push(sku);
    return acc;
  }, {} as Record<string, typeof skus>);
  
  // צירוף SKUs לכל מוצר
  const productsWithSkus = resultProducts.map(product => ({
    ...product,
    skus: skusByProduct[product._id.toString()] || []
  }));
  
  // יצירת cursor לעמוד הבא
  let nextCursor: string | null = null;
  if (hasMore && resultProducts.length > 0) {
    const lastProduct = resultProducts[resultProducts.length - 1];
    const sortValue = (lastProduct as any)[sortBy];
    nextCursor = `${sortValue}_${lastProduct._id}`;
  }
  
  console.log('✅ [fetchProductsWithCursor] Results:', {
    total,
    returned: resultProducts.length,
    hasMore,
    nextCursor: nextCursor ? 'exists' : 'null',
    skusLoaded: skus.length // Phase 7.1: לוג כמות SKUs
  });
  
  return {
    products: productsWithSkus as IProduct[],
    nextCursor,
    hasMore,
    total
  };
};

// ✅ Soft delete functions removed - new schema uses hard delete only (DigitalOcean Spaces)

// ============================================================================
// 🔍 Autocomplete - חיפוש מוצרים בזמן אמת
// ============================================================================

/**
 * מבנה תוצאת autocomplete
 * מכיל רק את השדות הנדרשים להצגה ב-dropdown
 */
export interface AutocompleteSuggestion {
  _id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number;
  isOnSale: boolean;
  thumbnail: string; // URL לתמונה קטנה
}

/**
 * חיפוש מוצרים להשלמה אוטומטית (autocomplete)
 * משתמש ב-text index לביצועים מהירים
 * 
 * @param query - טקסט החיפוש (מינימום 2 תווים)
 * @param limit - מספר תוצאות מקסימלי (ברירת מחדל: 8)
 * @returns מערך של הצעות מוצרים
 */
export const searchProductsAutocomplete = async (
  query: string,
  limit: number = 8
): Promise<AutocompleteSuggestion[]> => {
  // מינימום 2 תווים לחיפוש
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    // שימוש ב-text index לביצועים מהירים
    // או regex אם ה-query קצר מדי עבור text search
    const products = await Product.find(
      {
        isActive: true, // רק מוצרים פעילים
        $or: [
          // Text search - חיפוש מילים מלאות
          { $text: { $search: trimmedQuery } },
          // Regex fallback - חיפוש חלקי (prefix match)
          { name: { $regex: trimmedQuery, $options: 'i' } }
        ]
      },
      {
        // Projection - רק שדות נדרשים להצגה
        _id: 1,
        name: 1,
        slug: 1,
        basePrice: 1,
        salePrice: 1,
        isOnSale: 1,
        images: { $slice: 1 }, // רק התמונה הראשונה
        score: { $meta: 'textScore' } // ניקוד רלוונטיות
      }
    )
      .sort({ score: { $meta: 'textScore' } }) // מיון לפי רלוונטיות
      .limit(limit)
      .lean();

    // עיבוד התוצאות - חילוץ thumbnail מהתמונה הראשונה
    return products.map((product: any) => ({
      _id: product._id.toString(),
      name: product.name,
      slug: product.slug || product._id.toString(),
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale || false,
      thumbnail: product.images?.[0]?.thumbnail || ''
    }));
  } catch (error: any) {
    // אם text search נכשל, ננסה regex בלבד
    console.warn('⚠️ Text search failed, falling back to regex:', error.message);
    
    const products = await Product.find(
      {
        isActive: true,
        name: { $regex: trimmedQuery, $options: 'i' }
      },
      {
        _id: 1,
        name: 1,
        slug: 1,
        basePrice: 1,
        salePrice: 1,
        isOnSale: 1,
        images: { $slice: 1 }
      }
    )
      .limit(limit)
      .lean();

    return products.map((product: any) => ({
      _id: product._id.toString(),
      name: product.name,
      slug: product.slug || product._id.toString(),
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale || false,
      thumbnail: product.images?.[0]?.thumbnail || ''
    }));
  }
};


