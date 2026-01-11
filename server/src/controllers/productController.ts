import { Request, Response } from 'express';
import * as productService from '../services/productService';
import pricingService from '../services/pricingService';
import { IProduct } from '../models/Product';
import mongoose from 'mongoose';

// פונקציית עזר להמרת מסמך מוצר לאובייקט שטוח
// 🆕 מוסיפה ברירות מחדל לשדות חדשים שאולי לא קיימים במוצרים ישנים
const toPlainProduct = (product: any) => {
  const plain = product && typeof product.toObject === 'function' ? product.toObject() : product;
  if (plain) {
    // 🆕 וודא ששדה secondaryVariantAttribute קיים (עבור מוצרים שנוצרו לפני הוספת השדה)
    if (!('secondaryVariantAttribute' in plain)) {
      plain.secondaryVariantAttribute = null;
    }
  }
  return plain;
};

// פונקציית עזר ליצירת מידע מחיר ברירת מחדל
const buildDefaultPricing = (product: any) => ({
  productId: product._id.toString(),
  originalPrice: product.basePrice,
  finalPrice: product.basePrice,
  discountPercentage: 0,
  hasDiscount: false,
});

// Get all products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await productService.fetchAllProducts();
    const plainProducts = products.map(toPlainProduct);
    
    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    
    // חישוב מחירים מותאמים אישית לכל מוצר
    const productIds = plainProducts.map((product: any) => product._id.toString());
  const priceResults = await pricingService.calculatePricesForProducts(productIds, userId, plainProducts);

    // Phase 3.4: שליפת SKUs לכל מוצר במכה אחת
    const skusByProductId = await productService.fetchActiveSkusByProductIds(productIds);

    // שילוב מידע המחירים ו-SKUs עם פרטי המוצרים
    const productsWithPrices = plainProducts.map((product: any) => {
      const priceInfo = priceResults.find(p => p.productId === product._id.toString());
      return {
        ...product,
        pricing: priceInfo || buildDefaultPricing(product),
        skus: skusByProductId[product._id.toString()] || [],
      };
    });
    
    res.json(productsWithPrices);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בקבלת המוצרים', error });
  }
};

// GET /api/products/filter - שאילתת מוצרים עם פילטרים + פגינציה + meta
// פרמטרים נתמכים (Query):
// priceMin, priceMax (מספרים), sort (price_asc|price_desc|date_desc|date_asc|views_desc|sales_desc), page, pageSize, categoryIds (מופרד בפסיקים), categories (slugs מופרד בפסיקים)
export const getFilteredProducts = async (req: Request, res: Response) => {
  // 🚀 Performance: לוגים רק ב-development למניעת האטה בפרודקשן
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    const { priceMin, priceMax, sort, page, pageSize, categoryIds, categories, search, ...attributeParams } = req.query;

    if (isDev) {
      console.log('🔍 [getFilteredProducts] Query params:', req.query);
      console.log('🔍 [getFilteredProducts] Attribute params:', attributeParams);
    }

    // עיבוד categoryIds - יכול להיות מחרוזת מופרדת בפסיקים (לתאימות לאחור)
    let parsedCategoryIds: string[] | undefined;
    if (categoryIds && typeof categoryIds === 'string') {
      parsedCategoryIds = categoryIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }

    // עיבוד categories (slugs) - הגישה החדשה שתומכת בהיררכיה
    let parsedCategorySlugs: string[] | undefined;
    if (categories && typeof categories === 'string') {
      parsedCategorySlugs = categories.split(',').map((slug: string) => slug.trim()).filter((slug: string) => slug.length > 0);
    }

    // עיבוד מאפיינים דינמיים (colorFamily, size, material, וכו')
    // כל מאפיין מגיע כ-query param עם ערכים מופרדים בפסיקים
    // לדוגמה: ?colorFamily=red,blue&size=M,L
    const attributeFilters: Record<string, string[]> = {};
    const knownParams = new Set(['priceMin', 'priceMax', 'sort', 'page', 'pageSize', 'categoryIds', 'categories']);
    
    Object.keys(attributeParams).forEach(key => {
      if (!knownParams.has(key)) {
        const value = attributeParams[key];
        if (typeof value === 'string' && value.length > 0) {
          attributeFilters[key] = value.split(',').map((v: string) => v.trim()).filter((v: string) => v.length > 0);
        }
      }
    });

    const result = await productService.fetchProductsFiltered({
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      sort: typeof sort === 'string' ? sort : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      categoryIds: parsedCategoryIds, // לתאימות לאחור
      categorySlugs: parsedCategorySlugs, // החדש שתומך בהיררכיה
      attributeFilters: Object.keys(attributeFilters).length > 0 ? attributeFilters : undefined, // המאפיינים הדינמיים
      search: typeof search === 'string' ? search : undefined, // חיפוש טקסט חופשי
    });

    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    
    // חישוב מחירים מותאמים אישית לכל מוצר ברשימה המסוננת
    if (result.data && result.data.length > 0) {
      const plainProducts = result.data.map(toPlainProduct);
      const productIds = plainProducts.map((product: any) => product._id.toString());
  const priceResults = await pricingService.calculatePricesForProducts(productIds, userId, plainProducts);

      // Phase 3.4: שליפת SKUs לכל מוצר במכה אחת
      const skusByProductId = await productService.fetchActiveSkusByProductIds(productIds);

      // שילוב מידע המחירים ו-SKUs עם פרטי המוצרים
      result.data = plainProducts.map((product: any) => {
        const priceInfo = priceResults.find(p => p.productId === product._id.toString());
        return {
          ...product,
          pricing: priceInfo || buildDefaultPricing(product),
          skus: skusByProductId[product._id.toString()] || [],
        };
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בקבלת המוצרים עם פילטרים', error });
  }
};

// Get all products sorted by createdAt (newest first)
export const getAllProductsByDate = async (req: Request, res: Response) => {
  try {
    const products = await productService.fetchAllProductsSortedByDate();
    const plainProducts = products.map(toPlainProduct);
    
    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    
    // חישוב מחירים מותאמים אישית לכל מוצר
    const productIds = plainProducts.map((product: any) => product._id.toString());
  const priceResults = await pricingService.calculatePricesForProducts(productIds, userId, plainProducts);

    // Phase 3.4: שליפת SKUs לכל מוצר במכה אחת
    const skusByProductId = await productService.fetchActiveSkusByProductIds(productIds);

    // שילוב מידע המחירים ו-SKUs עם פרטי המוצרים
    const productsWithPrices = plainProducts.map((product: any) => {
      const priceInfo = priceResults.find(p => p.productId === product._id.toString());
      return {
        ...product,
        pricing: priceInfo || buildDefaultPricing(product),
        skus: skusByProductId[product._id.toString()] || [],
      };
    });
    
    res.json(productsWithPrices);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בקבלת המוצרים לפי תאריך', error });
  }
};

// Get popular products sorted by viewCount and salesCount
export const getPopularProducts = async (req: Request, res: Response) => {
  // 🚀 Performance: לוגים רק ב-development למניעת האטה בפרודקשן
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    const limit = parseInt(req.query.limit as string); 
//    const limit = parseInt(req.query.limit as string)|| 8; // זה אפשרות אם רוצים ערך ברירת מחדל שיהיה 8

  const products = await productService.fetchPopularProducts(limit);
  const plainProducts = products.map(toPlainProduct);
    
    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    if (isDev) console.log('🎯 getPopularProducts - userId from auth:', userId || 'NO_USER_ID');
    
    // חישוב מחירים מותאמים אישית לכל מוצר
    const productIds = plainProducts.map((product: any) => product._id.toString());
  const priceResults = await pricingService.calculatePricesForProducts(productIds, userId, plainProducts);
  
  if (isDev) console.log('📊 getPopularProducts - price results:', priceResults.slice(0, 2)); // הדפס רק שני ראשונים

    // Phase 3.4: שליפת SKUs לכל מוצר במכה אחת
    const skusByProductId = await productService.fetchActiveSkusByProductIds(productIds);

    // שילוב מידע המחירים ו-SKUs עם פרטי המוצרים
    const productsWithPrices = plainProducts.map((product: any) => {
      const priceInfo = priceResults.find(p => p.productId === product._id.toString());
      return {
        ...product,
        pricing: priceInfo || buildDefaultPricing(product),
        skus: skusByProductId[product._id.toString()] || [],
      };
    });
    
    res.json(productsWithPrices);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בקבלת המוצרים הפופולריים', error });
  }
};

// Get single product by ID
// Phase 3.3: מחזיר את המוצר + SKUs מה-SKU Collection
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await productService.fetchProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'מוצר לא נמצא' });
    }
    
    // Phase 3.3: שליפת SKUs מה-SKU Collection
    const skus = await productService.fetchProductSkus(req.params.id);
    
    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    
    // חישוב מחיר מותאם אישית למוצר הספציפי
  const priceInfo = await pricingService.calculatePriceForUser((product as any)._id.toString(), userId, product as any);
    
    // Phase 3.3: הוספת SKUs למוצר
    const productWithPrice = {
      ...product.toObject(),
      pricing: priceInfo,
      skus: skus, // ← Phase 3.3: SKUs מה-SKU Collection
    };
    
    res.json(productWithPrice);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בקבלת המוצר', error });
  }
};

// Get related products for a specific product
export const getRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 4;
    
    const relatedProducts = await productService.fetchRelatedProducts(id, limit);
    
    // קבלת מזהה המשתמש מהטוקן (אם קיים)
    const userId = (req as any).user?.userId;
    
    // הוספת מחירים מותאמים ו-SKUs לכל מוצר
    const productsWithPricing = await Promise.all(
      relatedProducts.map(async (product: any) => {
        const priceInfo = await pricingService.calculatePriceForUser(
          product._id.toString(), 
          userId, 
          product
        );
        const skus = await productService.fetchProductSkus(product._id.toString());
        
        return {
          ...product.toObject ? product.toObject() : product,
          pricing: priceInfo,
          skus: skus,
        };
      })
    );
    
    res.json(productsWithPricing);
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({ message: 'שגיאה בקבלת מוצרים קשורים', error });
  }
};

// Create new product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const savedProduct = await productService.createNewProduct(req.body);
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'שגיאה ביצירת המוצר', error });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await productService.updateExistingProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ message: 'מוצר לא נמצא' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'שגיאה בעדכון המוצר', error });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await productService.deleteExistingProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'מוצר לא נמצא' });
    }
    res.json({ message: 'המוצר נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה במחיקת המוצר', error });
  }
};

// Increment product view count
export const incrementViewCount = async (req: Request, res: Response) => {
  try {
    const product = await productService.incrementProductViewCount(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'מוצר לא נמצא' });
    }
    res.json({ message: 'מספר הצפיות עודכן', viewCount: product.viewCount });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בעדכון מספר הצפיות', error });
  }
};

// ============================================================================
// 🚀 Phase 1.1: CRUD למוצרים עם SKUs ו-Transactions
// ============================================================================

/**
 * יצירת מוצר חדש עם SKUs באופן אטומי (Transaction)
 * POST /api/products/with-skus
 * 
 * Body: {
 *   product: { name, description, basePrice, categoryId, images, ... },
 *   skus: [{ sku, price, stockQuantity, color, size, ... }]
 * }
 * 
 * Phase 0.5.5: משתמש ב-MongoDB Transaction להבטחת atomicity
 * Phase 0.5.6: בודק ייחודיות SKU לפני יצירה
 * Phase 0.5.9: בעת כשלון - מוחק תמונות שהועלו (rollback)
 */
export const createProductWithSkus = async (req: Request, res: Response) => {
  try {
    const { product: productData, skus: skusData } = req.body;

    // וולידציה בסיסית
    if (!productData || !productData.name) {
      return res.status(400).json({ 
        success: false,
        message: 'נתוני מוצר חסרים - שם המוצר הוא שדה חובה' 
      });
    }

    // יצירת המוצר עם SKUs (Transaction)
    // הערה: skusData יכול להיות מערך ריק - ה-service ייצר SKU בסיס אם
    // productData.hasVariants === false והמערכת צריכה SKU ברירת מחדל.
    const result = await productService.createProductWithSkus(productData, skusData);

    res.status(201).json({
      success: true,
      message: 'המוצר נוצר בהצלחה',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error in createProductWithSkus:', error);
    
    // טיפול בשגיאות ספציפיות
    if (error.message?.includes('SKU already exists') || error.message?.includes('כבר קיים')) {
      return res.status(409).json({ 
        success: false,
        message: 'אחד או יותר מקודי ה-SKU כבר קיימים במערכת',
        error: error.message 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'שגיאה ביצירת המוצר',
      error: error.message 
    });
  }
};

/**
 * עדכון מוצר קיים עם SKUs באופן אטומי (Transaction)
 * PUT /api/products/:id/with-skus
 * 
 * Body: {
 *   product: { name, description, basePrice, ... },
 *   skus: [{ sku, price, stockQuantity, ... }]
 * }
 * 
 * Phase 0.5.5: משתמש ב-Transaction להבטחת atomicity
 * Phase 0.5.6: בודק ייחודיות SKU (למעט SKUs של המוצר הנוכחי)
 */
export const updateProductWithSkus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { product: productData, skus: skusData } = req.body;

    // 🔍 DEBUG: לוג מה מגיע מה-client
    console.log('🔍 [updateProductWithSkus Controller] Received productData.specifications:', productData?.specifications);
    console.log('🔍 [updateProductWithSkus Controller] Received SKUs from client:');
    skusData?.forEach((sku: any, index: number) => {
      console.log(`  ${index + 1}. ${sku.sku}:`);
      console.log(`     color: ${sku.color || 'לא מוגדר'}`);
      console.log(`     colorHex: ${sku.colorHex || 'לא מוגדר'}`); // 🆕 DEBUG
      console.log(`     colorFamily: ${sku.colorFamily || 'לא מוגדר'}`); // 🆕 DEBUG
      console.log(`     attributes:`, JSON.stringify(sku.attributes));
    });

    // וולידציה
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'מזהה מוצר לא תקין' 
      });
    }

    // עדכון המוצר עם SKUs (Transaction)
    const result = await productService.updateProductWithSkus(id, productData, skusData);
    
    // 🔍 DEBUG: לוג מה חזר מה-service
    console.log('🔍 [updateProductWithSkus Controller] Returning SKUs to client:');
    result.skus?.forEach((sku: any, index: number) => {
      console.log(`  ${index + 1}. ${sku.sku}:`);
      console.log(`     color: ${sku.color || 'לא מוגדר'}`);
      console.log(`     colorHex: ${sku.colorHex || 'לא מוגדר'}`); // 🆕 DEBUG
      console.log(`     colorFamily: ${sku.colorFamily || 'לא מוגדר'}`); // 🆕 DEBUG
      console.log(`     attributes:`, JSON.stringify(sku.attributes));
    });

    res.json({
      success: true,
      message: 'המוצר עודכן בהצלחה',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error in updateProductWithSkus:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('לא נמצא')) {
      return res.status(404).json({ 
        success: false,
        message: 'המוצר לא נמצא' 
      });
    }

    if (error.message?.includes('SKU already exists') || error.message?.includes('כבר קיים')) {
      return res.status(409).json({ 
        success: false,
        message: 'אחד או יותר מקודי ה-SKU כבר קיימים במערכת',
        error: error.message 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'שגיאה בעדכון המוצר',
      error: error.message 
    });
  }
};

/**
 * מחיקה רכה (Soft Delete) של מוצר
 * DELETE /api/products/:id/soft
 * 
 * Phase 0.5.7: מעדכן גם את ה-SKUs ל-isActive: false
 */
export const softDeleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'מזהה מוצר לא תקין' 
      });
    }

    await productService.softDeleteProduct(id);

    res.json({
      success: true,
      message: 'המוצר הוסתר בהצלחה (ניתן לשחזר)',
    });
  } catch (error: any) {
    console.error('❌ Error in softDeleteProduct:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('לא נמצא')) {
      return res.status(404).json({ 
        success: false,
        message: 'המוצר לא נמצא' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'שגיאה במחיקת המוצר',
      error: error.message 
    });
  }
};

/**
 * שחזור מוצר שנמחק (Restore)
 * POST /api/products/:id/restore
 * 
 * Phase 0.5.7: משחזר גם את ה-SKUs ל-isActive: true
 */
export const restoreProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'מזהה מוצר לא תקין' 
      });
    }

    await productService.restoreProduct(id);

    res.json({
      success: true,
      message: 'המוצר שוחזר בהצלחה',
    });
  } catch (error: any) {
    console.error('❌ Error in restoreProduct:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('לא נמצא')) {
      return res.status(404).json({ 
        success: false,
        message: 'המוצר לא נמצא' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'שגיאה בשחזור המוצר',
      error: error.message 
    });
  }
};

/**
 * מחיקה לצמיתות (Hard Delete) של מוצר
 * DELETE /api/products/:id/permanent
 *
 * Phase 8: מחיקה בלתי הפיכה עם מחיקת תמונות Cloudinary
 * דורש אישור משתמש בפה על בדוק כדי למנוע טעויות
 */
export const hardDeleteProductController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה מוצר לא תקין'
      });
    }

    // בצע מחיקה קשה (מוחק את המוצר, SKUs, ותמונות Cloudinary)
    await productService.hardDeleteProduct(id);

    res.json({
      success: true,
      message: 'המוצר נמחק לצמיתות (אין אפשרות לשחזר)',
    });
  } catch (error: any) {
    console.error('❌ Error in hardDeleteProductController:', error);

    if (error.message?.includes('not found') || error.message?.includes('לא נמצא')) {
      return res.status(404).json({
        success: false,
        message: 'המוצר לא נמצא'
      });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקה לצמיתות של המוצר',
      error: error.message
    });
  }
};

/**
 * בדיקת זמינות SKU (ייחודיות)
 * POST /api/products/check-sku
 * 
 * Body: {
 *   sku: string,
 *   productId?: string (אופציונלי - לבדיקה בעת עריכה)
 * }
 * 
 * Phase 0.5.6: בודק אם SKU כבר קיים במערכת
 */
export const checkSkuAvailability = async (req: Request, res: Response) => {
  try {
    const { sku, productId } = req.body;

    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'קוד SKU חסר או לא תקין',
        available: false 
      });
    }

    // בדיקת קיום SKU
    const exists = await productService.checkSkuExists(sku, productId);

    res.json({
      success: true,
      available: !exists, // זמין = לא קיים
      message: exists ? 'קוד SKU כבר קיים במערכת' : 'קוד SKU זמין',
    });
  } catch (error: any) {
    console.error('❌ Error in checkSkuAvailability:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'שגיאה בבדיקת זמינות SKU',
      available: false,
      error: error.message 
    });
  }
};

/**
 * GET /api/admin/products - טעינת מוצרים לדף ניהול (Phase 5.0.1)
 * תומך ב-cursor pagination, filters, sort
 * זהו תיקון ל"פלסטר" מ-Phase 3 - endpoint אמיתי עם סינון בשרת
 */
export const getProductsForManagement = async (req: Request, res: Response) => {
  // 🚀 Performance: לוגים רק ב-development למניעת האטה בפרודקשן
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    const { 
      search,          // חיפוש בשם/תיאור
      categoryId,      // סינון לפי קטגוריה
      isActive,        // סינון לפי סטטוס (true/false)
      stockStatus,     // סינון לפי מצב מלאי: 'low' (מלאי נמוך) או 'out' (אזל מלאי)
      sortBy,          // name|price|createdAt|salesCount|stockQuantity
      sortDirection,   // asc|desc
      cursor,          // cursor לעמוד הבא
      limit = '20'     // כמה מוצרים בעמוד
    } = req.query;
    
    if (isDev) {
      console.log('📦 [getProductsForManagement] Query params:', {
        search,
        categoryId,
        isActive,
        stockStatus,
        sortBy,
        sortDirection,
        cursor,
        limit
      });
    }
    
    // המרת isActive לבוליאן
    let isActiveBool: boolean | undefined;
    if (isActive === 'true') isActiveBool = true;
    else if (isActive === 'false') isActiveBool = false;
    
    // קריאה ל-service עם הפרמטרים
    const result = await productService.fetchProductsWithCursor({
      search: search as string | undefined,
      categoryId: categoryId as string | undefined,
      isActive: isActiveBool,
      stockStatus: stockStatus as 'low' | 'out' | undefined,
      sortBy: sortBy as string | undefined,
      sortDirection: sortDirection as 'asc' | 'desc' | undefined,
      cursor: cursor as string | undefined,
      limit: parseInt(limit as string, 10)
    });
    
    if (isDev) {
      console.log('✅ [getProductsForManagement] Results:', {
        productsCount: result.products.length,
        hasMore: result.hasMore,
        total: result.total
      });
    }
    
    res.json({
      success: true,
      data: result.products,
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total
    });
  } catch (error: any) {
    console.error('❌ [getProductsForManagement] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת מוצרים לניהול', 
      error: error.message
    });
  }
};

// ============================================================================
// 🔍 Autocomplete - חיפוש מוצרים בזמן אמת
// ============================================================================

/**
 * GET /api/products/autocomplete - השלמה אוטומטית לחיפוש מוצרים
 * מחזיר רשימת הצעות מוצרים מהירה בהתאם לשאילתת החיפוש
 * 
 * Query params:
 * - q: טקסט החיפוש (מינימום 2 תווים)
 * - limit: מספר תוצאות מקסימלי (ברירת מחדל: 8, מקסימום: 20)
 * 
 * Response: {
 *   success: boolean,
 *   data: ProductSuggestion[],
 *   query: string,
 *   total: number
 * }
 */
export const getProductsAutocomplete = async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    
    // וולידציה של query
    const query = typeof q === 'string' ? q.trim() : '';
    if (query.length < 2) {
      return res.json({
        success: true,
        data: [],
        query,
        total: 0
      });
    }
    
    // הגבלת limit למקסימום 20
    const maxLimit = Math.min(
      parseInt(limit as string, 10) || 8,
      20
    );
    
    // קריאה ל-service
    const suggestions = await productService.searchProductsAutocomplete(query, maxLimit);
    
    res.json({
      success: true,
      data: suggestions,
      query,
      total: suggestions.length
    });
  } catch (error: any) {
    console.error('❌ [getProductsAutocomplete] Error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בחיפוש מוצרים',
      error: error.message
    });
  }
};
