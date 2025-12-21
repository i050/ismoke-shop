# 🏗️ תוכנית מפורטת לבניית דף ניהול מוצרים

## 📊 סקירת תשתית קיימת

### ✅ Backend - קיים ועובד
- **Models:** Product, Sku, Category (היררכי 3 רמות)
- **Services:** productService, skuService, categoryService, pricingService
- **Controllers:** productController (GET בלבד), skuController, categoryController

### ❌ Backend - חסר
- CRUD endpoints למוצרים (POST/PUT/DELETE)
- Upload תמונות (Multer/Cloudinary)
- Validation middleware למוצרים
- **🔴 חסרים קריטיים:** אבטחה, Transactions, Uniqueness, Cascade Delete

### ✅ Frontend - קיים ועובד
- **UI Components:** Button, Input, Modal, Card, Icon, Checkbox, FormField, Pagination, Toolbar, QuantitySelector, Carousel
- **דפים לדוגמה:** UserManagement, CustomerGroups (ללמידה)

### ❌ Frontend - חסר
- ImageUploader
- ConfirmDialog
- Select/Dropdown מתקדם
- כל המבנה של Products Management

---

## 🔐 Phase 0.5: Backend Best Practices & Security (קריטי!)

> **חשוב מאוד:** שלב זה חייב להתבצע לפני Phase 1! הוא מטפל בבעיות אבטחה קריטיות ו-race conditions.

### שלב 0.5.1: אבטחה - Role-Based Access Control
**קובץ:** `server/src/middleware/authMiddleware.ts`

**צעדים:**
1. וידוא קיום middleware `requireAdmin`:
   ```typescript
   export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
     if (req.user?.role !== 'admin') {
       return res.status(403).json({ message: 'גישה נדחתה - נדרש תפקיד מנהל' });
     }
     next();
   };
   ```

2. וידוא קיום middleware `requirePermission`:
   ```typescript
   export const requirePermission = (permission: string) => {
     return (req: Request, res: Response, next: NextFunction) => {
       if (!req.user?.permissions?.includes(permission)) {
         return res.status(403).json({ message: `חסרה הרשאה: ${permission}` });
       }
       next();
     };
   };
   ```

### שלב 0.5.2: אבטחה - Input Validation & Sanitization
**קובץ חדש:** `server/src/middleware/sanitizeInput.ts`

**צעדים:**
1. התקנת חבילות:
   ```bash
   npm install express-validator validator
   npm install @types/validator --save-dev
   ```

2. יצירת middleware לניקוי input:
   ```typescript
   import { body, validationResult } from 'express-validator';
   import validator from 'validator';

   // מניעת XSS
   export const sanitizeProduct = [
     body('name').trim().escape(),
     body('description').trim().escape(),
     body('brand').optional().trim().escape(),
     body('sku').trim().toUpperCase(),
     body('tags.*').trim().escape(),
     (req: Request, res: Response, next: NextFunction) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       next();
     }
   ];
   ```

### שלב 0.5.3: אבטחה - Rate Limiting
**קובץ חדש:** `server/src/middleware/rateLimiter.ts`

**צעדים:**
1. התקנת חבילה:
   ```bash
   npm install express-rate-limit
   ```

2. יצירת rate limiters:
   ```typescript
   import rateLimit from 'express-rate-limit';

   // מגבלה כללית - 100 בקשות לדקה
   export const generalLimiter = rateLimit({
     windowMs: 60 * 1000, // 1 דקה
     max: 100,
     message: 'יותר מדי בקשות, נסה שוב מאוחר יותר',
   });

   // מגבלה ליצירת מוצרים - 20 לדקה
   export const createProductLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 20,
     message: 'יותר מדי יצירות מוצרים, נסה שוב מאוחר יותר',
   });

   // מגבלה להעלאת תמונות - 10 לדקה
   export const uploadLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 10,
     message: 'יותר מדי העלאות, נסה שוב מאוחר יותר',
   });
   ```

3. הוספה ל-server.ts:
   ```typescript
   import { generalLimiter } from './middleware/rateLimiter';
   app.use('/api', generalLimiter);
   ```

---

### ⚠️ שלב 0.5.4: CSRF Protection - דולג (לא רלוונטי)

> **הערה:** שלב זה דולג מכיוון שהפרויקט משתמש ב-JWT tokens ב-`Authorization` header (לא cookies).  
> **CSRF Protection רלוונטי רק כאשר credentials נשמרים ב-cookies.**  
> 
> בפרויקט הנוכחי:
> - ✅ JWT נשמר ב-`localStorage`
> - ✅ נשלח דרך `Authorization: Bearer` header
> - ✅ Same-Origin Policy מגן על headers
> - ✅ **אין סיכון CSRF** → ניתן לדלג בבטחה
>
> במקום CSRF, הפרויקט מוגן על ידי:
> - ✅ CORS מחמיר (כבר מוגדר)
> - ✅ Rate Limiting (Phase 0.5.3 ✓)
> - ✅ Input Sanitization (Phase 0.5.2 ✓)
> - ✅ RBAC (Phase 0.5.1 ✓)

---

### שלב 0.5.5: MongoDB Transactions - יצירת Product + SKUs אטומית
**קובץ:** `server/src/services/productService.ts`

**צעדים:**
1. עדכון פונקציית createProductWithSkus:
   ```typescript
   import mongoose from 'mongoose';

   async createProductWithSkus(
     productData: ProductData, 
     skusData: SkuData[]
   ): Promise<Product> {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
       // יצירת Product
       const [product] = await Product.create([productData], { session });

       // יצירת SKUs עם productId
       const skusWithProductId = skusData.map(sku => ({
         ...sku,
         productId: product._id
       }));

       await Sku.insertMany(skusWithProductId, { session });

       // commit - הכל עבר בהצלחה
       await session.commitTransaction();

       // שליפת המוצר המלא עם SKUs
       return await this.getProductById(product._id.toString());

     } catch (error) {
       // rollback - משהו נכשל
       await session.abortTransaction();
       throw error;
     } finally {
       // ניקוי session
       session.endSession();
     }
   }
   ```

2. עדכון פונקציית updateProductWithSkus:
   ```typescript
   async updateProductWithSkus(
     productId: string,
     productData: Partial<ProductData>,
     skusData: SkuData[]
   ): Promise<Product> {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
       // עדכון Product
       await Product.findByIdAndUpdate(
         productId, 
         productData, 
         { session, new: true }
       );

       // מחיקת כל ה-SKUs הישנים
       await Sku.deleteMany({ productId }, { session });

       // יצירת SKUs חדשים
       const skusWithProductId = skusData.map(sku => ({
         ...sku,
         productId
       }));

       await Sku.insertMany(skusWithProductId, { session });

       await session.commitTransaction();

       return await this.getProductById(productId);

     } catch (error) {
       await session.abortTransaction();
       throw error;
     } finally {
       session.endSession();
     }
   }
   ```

### שלב 0.5.6: SKU Uniqueness - Unique Index + Race Condition Fix
**קובץ:** `server/src/models/Sku.ts`

**צעדים:**
1. הוספת unique index:
   ```typescript
   // בסוף ה-schema, לפני ה-export
   skuSchema.index({ sku: 1 }, { unique: true });
   ```

2. יצירת migration script:
   **קובץ חדש:** `server/src/scripts/createSkuIndex.ts`
   ```typescript
   import mongoose from 'mongoose';
   import Sku from '../models/Sku';

   async function createUniqueIndex() {
     try {
       await mongoose.connect(process.env.MONGODB_URI!);
       
       console.log('יוצר unique index על SKU...');
       await Sku.collection.createIndex({ sku: 1 }, { unique: true });
       
       console.log('✅ Index נוצר בהצלחה');
       process.exit(0);
     } catch (error) {
       console.error('❌ שגיאה ביצירת index:', error);
       process.exit(1);
     }
   }

   createUniqueIndex();
   ```

3. הרצה:
   ```bash
   npx ts-node server/src/scripts/createSkuIndex.ts
   ```

4. בדיקת duplicates קיימים לפני יצירה:
   **עדכון ב-productService.ts:**
   ```typescript
   async checkSkuExists(sku: string, excludeProductId?: string): Promise<boolean> {
     const query: any = { sku };
     if (excludeProductId) {
       query.productId = { $ne: excludeProductId };
     }
     const existing = await Sku.findOne(query);
     return !!existing;
   }

   async createProductWithSkus(productData: ProductData, skusData: SkuData[]): Promise<Product> {
     // בדיקת SKU uniqueness לפני התחלת transaction
     for (const skuData of skusData) {
       const exists = await this.checkSkuExists(skuData.sku);
       if (exists) {
         throw new Error(`SKU ${skuData.sku} כבר קיים במערכת`);
       }
     }

     // המשך ה-transaction...
   }
   ```

### שלב 0.5.7: Cascade Delete - מחיקת SKUs כשמוחקים Product
**קובץ:** `server/src/models/Product.ts`

**צעדים:**
1. הוספת pre middleware למחיקה:
   ```typescript
   import Sku from './Sku';

   // לפני deleteOne
   ProductSchema.pre('deleteOne', { document: true, query: false }, async function() {
     await Sku.deleteMany({ productId: this._id });
   });

   // לפני findOneAndDelete
   ProductSchema.pre('findOneAndDelete', async function() {
     const doc = await this.model.findOne(this.getFilter());
     if (doc) {
       await Sku.deleteMany({ productId: doc._id });
     }
   });
   ```

2. עדכון soft delete (isActive: false) - גם ל-SKUs:
   **עדכון ב-productService.ts:**
   ```typescript
   async softDeleteProduct(productId: string): Promise<void> {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
       // soft delete של Product
       await Product.findByIdAndUpdate(
         productId,
         { isActive: false },
         { session }
       );

       // soft delete של כל ה-SKUs
       await Sku.updateMany(
         { productId },
         { isActive: false },
         { session }
       );

       await session.commitTransaction();
     } catch (error) {
       await session.abortTransaction();
       throw error;
     } finally {
       session.endSession();
     }
   }

   async restoreProduct(productId: string): Promise<void> {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
       await Product.findByIdAndUpdate(
         productId,
         { isActive: true },
         { session }
       );

       await Sku.updateMany(
         { productId },
         { isActive: true },
         { session }
       );

       await session.commitTransaction();
     } catch (error) {
       await session.abortTransaction();
       throw error;
     } finally {
       session.endSession();
     }
   }
   ```

### שלב 0.5.8: Race Conditions במלאי - Atomic Stock Updates
**קובץ:** `server/src/services/skuService.ts`

**צעדים:**
1. החלפת כל עדכוני מלאי ל-atomic operations:
   ```typescript
   // ❌ לא לעשות ככה:
   // const sku = await Sku.findById(id);
   // sku.quantityInStock -= quantity;
   // await sku.save();

   // ✅ לעשות ככה:
   async decrementStock(skuId: string, quantity: number): Promise<Sku | null> {
     // עדכון אטומי עם בדיקת תנאי
     const updated = await Sku.findOneAndUpdate(
       { 
         _id: skuId,
         quantityInStock: { $gte: quantity } // ודא שיש מספיק מלאי
       },
       { 
         $inc: { quantityInStock: -quantity } 
       },
       { 
         new: true // החזר את המוצר המעודכן
       }
     );

     if (!updated) {
       throw new Error('אין מספיק מלאי או SKU לא נמצא');
     }

     return updated;
   }

   async incrementStock(skuId: string, quantity: number): Promise<Sku | null> {
     return await Sku.findByIdAndUpdate(
       skuId,
       { $inc: { quantityInStock: quantity } },
       { new: true }
     );
   }

   async setStock(skuId: string, quantity: number): Promise<Sku | null> {
     return await Sku.findByIdAndUpdate(
       skuId,
       { $set: { quantityInStock: quantity } },
       { new: true }
     );
   }
   ```

2. עדכון cartService להשתמש ב-atomic operations:
   **קובץ:** `server/src/services/cartService.ts`
   ```typescript
   import { skuService } from './skuService';

   async checkout(userId: string): Promise<Order> {
     const cart = await this.getCart(userId);
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
       // עדכון מלאי לכל פריט - אטומית!
       for (const item of cart.items) {
         await skuService.decrementStock(item.skuId, item.quantity);
       }

       // יצירת הזמנה
       const order = await Order.create([{
         userId,
         items: cart.items,
         totalPrice: cart.totalPrice
       }], { session });

       // ניקוי עגלה
       await Cart.findOneAndUpdate(
         { userId },
         { items: [], totalPrice: 0 },
         { session }
       );

       await session.commitTransaction();
       return order[0];

     } catch (error) {
       await session.abortTransaction();
       throw error;
     } finally {
       session.endSession();
     }
   }
   ```

### שלב 0.5.9: Image Cleanup - Rollback Strategy
**קובץ חדש:** `server/src/services/imageService.ts`

**צעדים:**
1. יצירת service לניהול תמונות:
   ```typescript
   import cloudinary from '../config/cloudinary';

   class ImageService {
     private uploadedImages: string[] = []; // tracking להעלאות

     async uploadProductImages(files: Express.Multer.File[]): Promise<string[]> {
       const uploadPromises = files.map(file => this.uploadSingle(file));
       
       try {
         const results = await Promise.all(uploadPromises);
         this.uploadedImages = results; // שמירה לצורך rollback
         return results;
       } catch (error) {
         // אם משהו נכשל - מחק את כל מה שהועלה עד כה
         await this.rollbackUploads();
         throw error;
       }
     }

     private async uploadSingle(file: Express.Multer.File): Promise<string> {
       return new Promise((resolve, reject) => {
         const uploadStream = cloudinary.uploader.upload_stream(
           {
             folder: 'products',
             transformation: [
               { width: 800, height: 800, crop: 'limit' },
               { quality: 'auto' }
             ]
           },
           (error, result) => {
             if (error) reject(error);
             else resolve(result!.secure_url);
           }
         );

         uploadStream.end(file.buffer);
       });
     }

     async rollbackUploads(): Promise<void> {
       if (this.uploadedImages.length === 0) return;

       console.log(`מבצע rollback ל-${this.uploadedImages.length} תמונות...`);
       
       const deletePromises = this.uploadedImages.map(url => 
         this.deleteByUrl(url)
       );

       await Promise.allSettled(deletePromises);
       this.uploadedImages = [];
     }

     async deleteByUrl(url: string): Promise<void> {
       // חילוץ publicId מה-URL
       const publicId = this.extractPublicId(url);
       if (publicId) {
         await cloudinary.uploader.destroy(publicId);
       }
     }

     private extractPublicId(url: string): string | null {
       const match = url.match(/\/products\/([^/.]+)/);
       return match ? `products/${match[1]}` : null;
     }

     async deleteOrphanImages(productId: string): Promise<void> {
       // מוצא את כל התמונות של המוצר ב-Cloudinary
       const product = await Product.findById(productId);
       if (!product) return;

       const allImages = [
         ...product.images,
         ...(await Sku.find({ productId })).flatMap(sku => sku.images || [])
       ];

       // מחיקה
       await Promise.allSettled(
         allImages.map(url => this.deleteByUrl(url))
       );
     }
   }

   export default new ImageService();
   ```

2. שימוש ב-service ב-controller:
   ```typescript
   import imageService from '../services/imageService';

   async uploadImages(req: Request, res: Response) {
     try {
       const files = req.files as Express.Multer.File[];
       const urls = await imageService.uploadProductImages(files);
       res.json({ success: true, urls });
     } catch (error) {
       res.status(500).json({ message: 'שגיאה בהעלאת תמונות' });
     }
   }

   async deleteProduct(req: Request, res: Response) {
     const { id } = req.params;
     
     try {
       // מחיקת תמונות מ-Cloudinary
       await imageService.deleteOrphanImages(id);
       
       // מחיקת המוצר
       await productService.softDeleteProduct(id);
       
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ message: 'שגיאה במחיקת מוצר' });
     }
   }
   ```

### שלב 0.5.10: Performance - MongoDB Indexes & Caching
**קובץ:** `server/src/models/Product.ts`

**צעדים:**
1. הוספת indexes:
   ```typescript
   // indexes לחיפושים מהירים
   ProductSchema.index({ name: 'text', description: 'text' }); // text search
   ProductSchema.index({ categoryId: 1 }); // filter by category
   ProductSchema.index({ brand: 1 }); // filter by brand
   ProductSchema.index({ basePrice: 1 }); // sort by price
   ProductSchema.index({ createdAt: -1 }); // sort by date
   ProductSchema.index({ isActive: 1 }); // filter active/inactive
   ProductSchema.index({ 'tags': 1 }); // filter by tags
   
   // compound index למיון + סינון
   ProductSchema.index({ isActive: 1, createdAt: -1 });
   ProductSchema.index({ categoryId: 1, basePrice: 1 });
   ```

2. שיפור Pagination (cursor-based במקום skip):
   **עדכון ב-productService.ts:**
   ```typescript
   async getProducts(filters: any, pagination: any) {
     const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

     // ✅ cursor-based pagination (מהיר יותר)
     const lastId = filters.lastId;
     
     const query: any = { isActive: true };
     
     if (lastId) {
       // המשך מהמקום שעצרנו
       query._id = { $gt: lastId };
     }

     if (filters.categoryId) query.categoryId = filters.categoryId;
     if (filters.brand) query.brand = filters.brand;
     if (filters.search) {
       query.$text = { $search: filters.search };
     }
     if (filters.priceRange) {
       query.basePrice = {
         $gte: filters.priceRange.min,
         $lte: filters.priceRange.max
       };
     }

     const products = await Product.find(query)
       .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
       .limit(pageSize + 1); // +1 כדי לדעת אם יש עוד

     const hasMore = products.length > pageSize;
     const items = hasMore ? products.slice(0, -1) : products;

     return {
       items,
       hasMore,
       nextCursor: items.length > 0 ? items[items.length - 1]._id : null
     };
   }
   ```

3. (אופציונלי) הוספת Redis caching:
   ```bash
   npm install redis
   npm install @types/redis --save-dev
   ```

   **קובץ חדש:** `server/src/config/redis.ts`
   ```typescript
   import { createClient } from 'redis';

   const redisClient = createClient({
     url: process.env.REDIS_URL || 'redis://localhost:6379'
   });

   redisClient.on('error', (err) => console.error('Redis Error:', err));

   export const connectRedis = async () => {
     await redisClient.connect();
     console.log('✅ Redis connected');
   };

   export default redisClient;
   ```

   **שימוש ב-productService:**
   ```typescript
   import redisClient from '../config/redis';

   async getProductById(id: string): Promise<Product | null> {
     // ניסיון למצוא ב-cache
     const cached = await redisClient.get(`product:${id}`);
     if (cached) {
       return JSON.parse(cached);
     }

     // אם לא ב-cache - שלוף מDB
     const product = await Product.findById(id);
     
     if (product) {
       // שמור ב-cache ל-5 דקות
       await redisClient.setEx(
         `product:${id}`,
         300,
         JSON.stringify(product)
       );
     }

     return product;
   }

   async invalidateProductCache(id: string): Promise<void> {
     await redisClient.del(`product:${id}`);
   }
   ```

### שלב 0.5.11: בדיקת השלב הקריטי
**צעדים:**
1. הרצת migration ל-indexes:
   ```bash
   npx ts-node server/src/scripts/createSkuIndex.ts
   ```

2. בדיקת Transactions:
   - ניסיון ליצור Product עם SKU כפול → צריך להיכשל לגמרי
   - ניסיון ליצור Product שעובר אבל SKU נכשל → rollback

3. בדיקת Rate Limiting:
   - ניסיון ל-21 יצירות מוצרים בדקה → ה-21 צריך להיחסם

4. בדיקת Atomic Stock:
   - 2 הזמנות בו-זמנית לאותו SKU → אחת צריכה להיכשל אם אין מלאי

5. בדיקת Cascade Delete:
   - מחיקת Product → וידוא ש-SKUs נמחקו גם

6. בדיקת Image Rollback:
   - העלאת 3 תמונות שאחת מהן invalid → כולן לא צריכות להישאר ב-Cloudinary

**✅ אם הכל עבר - מעבר ל-Phase 1**

---

## 🎯 Phase 0: הכנה ולמידה

### שלב 0.1: למידה מדפים קיימים
**מטרה:** להבין patterns קיימים בפרויקט

**צעדים:**
1. קריאה ולמידה מ-`UserManagementPage.tsx`
2. קריאה ולמידה מ-`UserManagementList.tsx`
3. זיהוי ה-pattern של Redux (userManagementSlice)
4. זיהוי ה-pattern של Service layer
5. הבנת מבנה ה-CSS Modules

### שלב 0.2: זיהוי patterns חוזרים
**צעדים:**
1. תיעוד איך בנויים headers
2. תיעוד איך עובדות רשימות עם pagination
3. תיעוד איך בנויים modals
4. תיעוד איך עובד error handling
5. תיעוד איך עובדים filters

---

## 🔧 Phase 1: Backend - הוספת CRUD למוצרים

### שלב 1.1: הרחבת Product Controller
**קובץ:** `server/src/controllers/productController.ts`

**צעדים:**
1. הוספת פונקציה `createProduct`
   - קבלת נתוני מוצר + SKUs
   - בדיקת validation
   - יצירת Product
   - יצירת SKUs עם productId
   - החזרת תשובה

2. הוספת פונקציה `updateProduct`
   - קבלת ID + נתונים חדשים
   - עדכון Product
   - עדכון/מחיקה/הוספה של SKUs
   - החזרת תשובה

3. הוספת פונקציה `deleteProduct`
   - קבלת ID
   - מחיקה רכה (isActive = false)
   - החזרת תשובה

4. הוספת פונקציה `restoreProduct`
   - קבלת ID
   - שחזור (isActive = true)
   - החזרת תשובה

5. הוספת פונקציה `checkSkuAvailability`
   - קבלת SKU code
   - בדיקה אם קיים
   - החזרת תשובה (available: true/false)

### שלב 1.2: הרחבת Product Service
**קובץ:** `server/src/services/productService.ts`

**צעדים:**
1. יצירת פונקציה `createProductWithSkus`
   - קבלת productData + skusData
   - יצירת Product
   - loop על SKUs - יצירה עם productId
   - החזרת Product מלא עם SKUs

2. יצירת פונקציה `updateProductWithSkus`
   - קבלת productId + productData + skusData
   - עדכון Product
   - השוואת SKUs ישנים לחדשים
   - מחיקת SKUs שנמחקו
   - עדכון SKUs שהשתנו
   - הוספת SKUs חדשים
   - החזרת Product מעודכן

3. יצירת פונקציה `softDeleteProduct`
   - עדכון isActive = false

4. יצירת פונקציה `restoreProduct`
   - עדכון isActive = true

5. יצירת פונקציה `checkSkuExists`
   - חיפוש ב-Sku collection
   - החזרת boolean

### שלב 1.3: יצירת Validation Middleware
**קובץ חדש:** `server/src/middleware/productValidation.ts`

**צעדים:**
1. התקנת Joi: `npm install joi`
2. יצירת schema למוצר:
   - name: string, min 3, max 200, required
   - description: string, min 10, required
   - basePrice: number, min 0, required
   - quantityInStock: number, min 0, required
   - sku: string, pattern, required
   - categoryId: string, optional
   - brand: string, optional
   - images: array of URIs, optional
   - tags: array of strings, optional

3. יצירת middleware function `validateProduct`
   - קבלת req.body
   - הרצת validation
   - אם יש שגיאה - החזרת 400
   - אם תקין - next()

4. יצירת schema ל-SKU:
   - sku: string, pattern, required
   - name: string, required
   - price: number, min 0, optional
   - stockQuantity: number, min 0, required
   - attributes: object, optional
   - images: array, optional

### שלב 1.4: הגדרת Upload תמונות
**קובץ חדש:** `server/src/middleware/uploadMiddleware.ts`

**צעדים:**
1. התקנת חבילות:
   ```bash
   npm install multer cloudinary
   npm install @types/multer --save-dev
   ```

2. הגדרת Cloudinary config:
   - cloud_name מ-env
   - api_key מ-env
   - api_secret מ-env

3. הגדרת Multer:
   - storage: memoryStorage
   - limits: 5MB
   - fileFilter: רק תמונות

4. יצירת middleware `uploadProductImages`
   - upload.array('images', 5)

5. יצירת פונקציה `uploadToCloudinary`
   - קבלת file buffer
   - העלאה לCloudinary
   - transformation: 800x800, quality auto
   - folder: 'products'
   - החזרת secure_url

6. יצירת פונקציה `deleteFromCloudinary`
   - קבלת publicId
   - מחיקה מCloudinary

### שלב 1.5: עדכון Routes
**קובץ:** `server/src/routes/productRoutes.ts`

**צעדים:**
1. הוספת route: `POST /` - createProduct
   - middleware: authMiddleware, requireAdmin, validateProduct
   
2. הוספת route: `PUT /:id` - updateProduct
   - middleware: authMiddleware, requireAdmin, validateProduct

3. הוספת route: `DELETE /:id` - deleteProduct
   - middleware: authMiddleware, requireAdmin

4. הוספת route: `POST /:id/restore` - restoreProduct
   - middleware: authMiddleware, requireAdmin

5. הוספת route: `POST /check-sku` - checkSkuAvailability
   - middleware: authMiddleware, requireAdmin

6. הוספת route: `POST /upload-images` - uploadImages
   - middleware: authMiddleware, requireAdmin, uploadProductImages

### שלב 1.6: בדיקת Backend
**צעדים:**
1. הפעלת שרת: `npm run dev`
2. בדיקה עם Postman/Thunder:
   - יצירת מוצר חדש
   - עדכון מוצר
   - מחיקה
   - שחזור
   - בדיקת SKU
   - העלאת תמונות

---

## 🎨 Phase 2: Frontend - קומפוננטות UI בסיס

### שלב 2.1: יצירת ImageUploader
**תיקייה חדשה:** `client/src/components/ui/ImageUploader/`

**קבצים:**
- `ImageUploader.tsx`
- `ImageUploader.module.css`
- `index.ts`

> **⭐ שימוש בספריות מומלץ:**  
> ```bash
> cd client
> npm install react-dropzone react-easy-crop
> ```
> **react-dropzone** - Drag & Drop מוכן  
> **react-easy-crop** - חיתוך תמונות אינטראקטיבי  
> **חוסך 2-3 ימי עבודה** של קוד מאפס!

**צעדים:**
1. יצירת interface `ImageUploaderProps`:
   - images: string[] (URLs קיימות)
   - onUpload: (files: File[]) => Promise<string[]>
   - onDelete: (url: string) => void
   - onReorder: (images: string[]) => void
   - maxImages: number (ברירת מחדל 5)
   - maxFileSize: number (ברירת מחדל 5MB)

2. יצירת state:
   - uploading: boolean
   - error: string | null
   - dragActive: boolean

3. יצירת drag & drop handlers:
   - handleDragEnter
   - handleDragLeave
   - handleDragOver
   - handleDrop

4. יצירת file input handler:
   - handleFileInput
   - validation: גודל, סוג קובץ
   - הפעלת onUpload
   - הצגת progress

5. יצירת delete handler:
   - אישור מחיקה
   - הפעלת onDelete

6. יצירת reorder handler:
   - drag & drop בין תמונות
   - הפעלת onReorder

7. עיצוב CSS:
   - grid layout
   - drag states
   - upload zone
   - preview cards
   - progress bar

> **💡 שים לב:** בשלב זה ImageUploader עובד עם **mock data בלבד**.  
> העלאה ל-Cloudinary תתווסף ב-**Phase 5** (ProductForm) כשנבנה את הטופס המלא.

### שלב 2.2: יצירת ConfirmDialog
**תיקייה חדשה:** `client/src/components/ui/ConfirmDialog/`

**קבצים:**
- `ConfirmDialog.tsx`
- `ConfirmDialog.module.css`
- `index.ts`

**צעדים:**
1. יצירת interface `ConfirmDialogProps`:
   - isOpen: boolean
   - title: string
   - message: string
   - confirmText: string (ברירת מחדל "אישור")
   - cancelText: string (ברירת מחדל "ביטול")
   - onConfirm: () => void
   - onCancel: () => void
   - variant: 'danger' | 'warning' | 'info' (ברירת מחדל 'info')

2. שימוש ב-Modal component קיים

3. הוספת אייקונים לפי variant:
   - danger: AlertTriangle (אדום)
   - warning: AlertCircle (כתום)
   - info: Info (כחול)

4. עיצוב לפי variant

5. keyboard support (Escape, Enter)

### שלב 2.3: התקנת shadcn/ui Select
**תיקייה:** `client/src/components/ui/select/` (יווצר אוטומטית)

> **✅ החלטה סופית: shadcn/ui Select**  
> 
> **למה shadcn/ui ולא react-select?**  
> - ✅ **עקבי** עם Button, Input, Card שכבר קיימים בפרויקט  
> - ✅ **אתה שולט בקוד המלא** (לא חבילה חיצונית)  
> - ✅ **קל להתאים** לצרכים (חיפוש, multiple, keyboard navigation)  
> - ✅ **מותאם מראש ל-TypeScript**  
> - ✅ **30 דקות עבודה** - התקנה ומוכן!  
> 
> **react-select** מתאים רק אם צריך פיצ'רים מאוד מתקדמים (async search מורכב, tags וכו').

**צעדים:**
1. התקנת shadcn/ui Select:
   ```bash
   cd client
   npx shadcn@latest add select
   ```

2. בדיקת הקומפוננטה:
   - הקובץ נוצר ב-`client/src/components/ui/select.tsx`
   - יש `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`

3. דוגמת שימוש בסיסי:
   ```tsx
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
   
   <Select onValueChange={setValue}>
     <SelectTrigger>
       <SelectValue placeholder="בחר אפשרות" />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="option1">אפשרות 1</SelectItem>
       <SelectItem value="option2">אפשרות 2</SelectItem>
     </SelectContent>
   </Select>
   ```

4. התאמות נוספות (אם נדרש):
   - הוספת חיפוש (search) בתוך SelectContent
   - תמיכה ב-multiple selection (דרך state חיצוני)
   - keyboard navigation (כבר מובנה)

> **💡 טיפ:** אם צריך Select היררכי (עץ קטגוריות), תוסיף לוגיקה מותאמת בשלב מאוחר יותר.

---

## 📦 Phase 3: Frontend - Products Management Core (מקוצר)

> **📌 גישת פיתוח: Redux מינימלי**  
> בשלב זה נבנה **רק מה שצריך ל-Products Table (Phase 4)**.  
> פונקציות נוספות (Create, Update, Duplicate) יתווספו ב-**Phase 5** (ProductForm).  
> 
> **למה?**  
> - Separation of Concerns ✅  
> - Redux צריך להיות minimal ✅  
> - קל להרחבה אחר כך ✅  
> 
> **Timeline צפוי: 1-1.5 ימי עבודה**
> 
> ---
> 
> ### ⚠️ הערה חשובה - Phase 3 TDD:
> 
> **Phase 3 משתמש ב-API זמני (`GET /api/products`)** - זה **פלסטר מכוון!**
> 
> **למה פלסטר?**
> - ✅ TDD - רואים תוצאות מהר (Redux עובד)
> - ✅ ממשיכים לבנות UI (Phase 4) מיד
> - ✅ יש רק 18 מוצרים - זה יעבוד מצוין
> 
> **מה לא עובד בפלסטר:**
> - ❌ Cursor pagination (hasMore: false, cursor: null)
> - ❌ Filters בשרת (search, categoryId, isActive)
> - ❌ Total לא נכון (רק מה שהגיע)
> - ❌ טוען הכל בבת אחת (לא מתאים ל-1000+ מוצרים)
> 
> **🔧 תיקון ב-Phase 5 - Endpoint חדש:**
> ```
> GET /api/admin/products
> ↓
> { success: true, data: [...], cursor: "abc", hasMore: true, total: 150 }
> ```
> 
> **📌 תזכורת ל-Phase 5:**
> 1. צור controller: `getProductsForManagement`
> 2. צור service method: `fetchProductsWithCursor`
> 3. Route חדש: `/api/admin/products`
> 4. עדכן `productManagementService.ts` → שנה URL ל-`/api/admin/products`
> 5. הסר קוד הפלסטר (המרה ידנית של array → object)
> 
> ---

### שלב 3.1: יצירת Redux Slice (מקוצר)
**קובץ חדש:** `client/src/store/slices/productsManagementSlice.ts`

**צעדים:**
1. הגדרת interface `ProductsManagementState` **מקוצר**:
   ```typescript
   interface ProductsManagementState {
     products: Product[];           // רשימת המוצרים
     loading: boolean;              // מצב טעינה
     error: string | null;          // שגיאה
     
     // Pagination (cursor-based מPhase 0.5.10)
     cursor: string | null;         // cursor להמשך
     hasMore: boolean;              // האם יש עוד תוצאות
     
     // Filters & Search (בסיסי)
     filters: {
       search: string;
       categoryId: string | null;
       isActive: boolean | null;
     };
     
     // Selection (למחיקה)
     selectedIds: string[];
   }
   ```

2. יצירת initialState

3. יצירת **2 async thunks בלבד**:
   - `fetchProducts` - GET /api/products (עם filters + cursor)
   - `deleteProduct` - DELETE /api/products/:id/soft
   
   > **לא בשלב זה:**  
   > - createProduct ❌  
   > - updateProduct ❌  
   > - duplicateProduct ❌  
   > - restoreProduct ❌  
   > **אלו יתווספו ב-Phase 5!**

4. יצירת reducers:
   - `setFilters` - עדכון פילטרים
   - `setSearch` - עדכון חיפוש
   - `setSelectedIds` - עדכון בחירות
   - `clearFilters` - ניקוי פילטרים
   - `setPage` - מעבר לעמוד (cursor)

5. טיפול ב-fulfilled/rejected:
   - fetchProducts.pending → loading: true
   - fetchProducts.fulfilled → products, cursor, hasMore
   - fetchProducts.rejected → error
   - deleteProduct.fulfilled → הסרה מ-products array

### שלב 3.2: יצירת Service Layer (מקוצר)
**קובץ חדש:** `client/src/services/productManagementService.ts`

> **📌 רק 2 פונקציות בשלב זה!**  
> שאר הפונקציות יתווספו ב-Phase 5 כשנבנה את ProductForm.

**צעדים:**
1. יצירת class `ProductManagementService`

2. יצירת method `getProducts` **בלבד**:
   ```typescript
   async getProducts(filters: ProductFilters, cursor?: string) {
     const params = new URLSearchParams();
     if (filters.search) params.append('search', filters.search);
     if (filters.categoryId) params.append('categoryId', filters.categoryId);
     if (filters.isActive !== null) params.append('isActive', String(filters.isActive));
     if (cursor) params.append('cursor', cursor);
     
     const response = await axios.get(`/api/products?${params}`);
     return response.data; // { data: Product[], cursor: string, hasMore: boolean }
   }
   ```

3. יצירת method `deleteProduct` **בלבד**:
   ```typescript
   async deleteProduct(id: string) {
     const response = await axios.delete(`/api/products/${id}/soft`);
     return response.data;
   }
   ```

4. export singleton instance:
   ```typescript
   export default new ProductManagementService();
   ```

> **פונקציות שיתווספו ב-Phase 5:**  
> - createProduct ⏭️  
> - updateProduct ⏭️  
> - duplicateProduct ⏭️  
> - restoreProduct ⏭️  
> - checkSkuAvailability ⏭️  
> - uploadImages ⏭️  
> - deleteImage ⏭️

---

## 📋 Phase 4: Products Table - רשימת מוצרים (MVP)

> **📌 MVP - Minimum Viable Product**  
> בשלב זה נבנה טבלה **עובדת ופונקציונלית** עם הפיצ'רים הבסיסיים.  
> 
> **מה כן בונים:**  
> - ✅ רשימת מוצרים עם נתונים מהשרת  
> - ✅ חיפוש בסיסי (search)  
> - ✅ סינון פשוט (קטגוריה, active/inactive)  
> - ✅ מיון (לפי שם, מחיר, תאריך)  
> - ✅ Pagination (cursor-based)  
> - ✅ כפתור "מחק" (soft delete)  
> - ✅ בחירת שורות (selection)  
> 
> **מה לא בונים בשלב זה:**  
> - ❌ Filters מורכבים (טווח מחירים, tags, brands)  
> - ❌ Bulk Actions (מחיקה מרובה, עדכון מרובה)  
> - ❌ Export CSV/Excel  
> - ❌ Toolbar מתקדם  
> 
> **למה?**  
> - רואים תוצאות מהר ✅  
> - אפשר לבדוק אינטגרציה עם Redux ✅  
> - קל להוסיף פיצ'רים אחר כך ✅  
> 
> **Timeline צפוי: 2 ימי עבודה**

### שלב 4.1: יצירת ProductsTableHeader
     products: Product[];
     loading: boolean;
     error: string | null;
     filters: {
       search: string;
       categoryId?: string;
       brand?: string;
       inStock?: boolean;
       isActive?: boolean;
       priceRange?: { min: number; max: number };
     };
     pagination: {
       page: number;
       pageSize: number;
       total: number;
       totalPages: number;
     };
     sortBy: 'name' | 'price' | 'date' | 'stock';
     sortOrder: 'asc' | 'desc';
     selectedIds: string[];
     editingProduct: Product | null;
     mode: 'list' | 'create' | 'edit';
   }
   ```

2. יצירת initialState

3. יצירת async thunks:
   - `fetchProducts` - שליפה עם filters + pagination
   - `createProduct` - יצירה
   - `updateProduct` - עדכון
   - `deleteProduct` - מחיקה
   - `restoreProduct` - שחזור
   - `duplicateProduct` - שכפול

4. יצירת reducers:
   - `setFilters` - עדכון פילטרים
   - `setPage` - עדכון עמוד
   - `setPageSize` - עדכון גודל עמוד
   - `setSort` - עדכון מיון
   - `selectProduct` - בחירת מוצר
   - `deselectProduct` - ביטול בחירה
   - `selectAll` - בחירת הכל
   - `deselectAll` - ביטול בחירת הכל
   - `setMode` - שינוי מצב (list/create/edit)
   - `setEditingProduct` - הגדרת מוצר לעריכה

5. טיפול ב-fulfilled/rejected למטרת loading + error

### שלב 3.2: יצירת Service Layer
**קובץ חדש:** `client/src/services/productManagementService.ts`

**צעדים:**
1. יצירת class `ProductManagementService`

2. יצירת method `getProducts`:
   - קבלת filters + pagination
   - בניית query string
   - קריאה ל-API
   - החזרת { data, pagination, meta }

3. יצירת method `createProduct`:
   - קבלת productData + skusData
   - POST ל-/api/products
   - החזרת product חדש

4. יצירת method `updateProduct`:
   - קבלת id + productData + skusData
   - PUT ל-/api/products/:id
   - החזרת product מעודכן

5. יצירת method `deleteProduct`:
   - קבלת id
   - DELETE ל-/api/products/:id
   - החזרת success

6. יצירת method `restoreProduct`:
   - קבלת id
   - POST ל-/api/products/:id/restore
   - החזרת product משוחזר

7. יצירת method `duplicateProduct`:
   - קבלת id
   - GET product
   - שינוי name + sku
   - POST product חדש

8. יצירת method `checkSkuAvailability`:
   - קבלת sku + productId (אופציונלי)
   - POST ל-/api/products/check-sku
   - החזרת { available: boolean }

9. יצירת method `uploadImages`:
   - קבלת files: File[]
   - יצירת FormData
   - POST ל-/api/products/upload-images
   - החזרת URLs array

10. יצירת method `deleteImage`:
    - קבלת url
    - DELETE ל-/api/products/delete-image
    - החזרת success

11. export singleton instance

---

## 📋 Phase 4: Products Table - רשימת מוצרים (MVP)

> **📌 MVP - Minimum Viable Product**  
> בשלב זה נבנה טבלה **עובדת ופונקציונלית** עם הפיצ'רים הבסיסיים.  
> 
> **מה כן בונים:**  
> - ✅ רשימת מוצרים עם נתונים מהשרת  
> - ✅ חיפוש בסיסי (search)  
> - ✅ סינון פשוט (קטגוריה, active/inactive)  
> - ✅ מיון (לפי שם, מחיר, תאריך)  
> - ✅ Pagination (cursor-based)  
> - ✅ כפתור "מחק" (soft delete)  
> - ✅ בחירת שורות (selection)  
> 
> **מה לא בונים בשלב זה:**  
> - ❌ Filters מורכבים (טווח מחירים, tags, brands)  
> - ❌ Bulk Actions (מחיקה מרובה, עדכון מרובה)  
> - ❌ Export CSV/Excel  
> - ❌ Toolbar מתקדם  
> 
> **למה?**  
> - רואים תוצאות מהר ✅  
> - אפשר לבדוק אינטגרציה עם Redux ✅  
> - קל להוסיף פיצ'רים אחר כך ✅  
> 
> **Timeline צפוי: 2 ימי עבודה**

### שלב 4.1: יצירת ProductsTableHeader
**תיקייה:** `client/src/components/features/admin/Products/ProductsTable/ProductsTableHeader/`

**קבצים:**
- `ProductsTableHeader.tsx`
- `ProductsTableHeader.module.css`
- `index.ts`

**צעדים:**
1. יצירת interface `ProductsTableHeaderProps`:
   - totalCount: number
   - onAddProduct: () => void

2. בניית JSX:
   - כפתור "הוסף מוצר חדש" (primary, large)
   - תצוגת מונה: "סה\"כ {totalCount} מוצרים"

3. עיצוב CSS:
   - flexbox layout
   - spacing
   - responsive

> **לא בשלב זה:**  
> - Bulk delete ❌  
> - Export button ❌  
> - Advanced toolbar ❌

### שלב 4.2: יצירת ProductsTableFilters
**תיקייה:** `client/src/components/features/admin/Products/ProductsTable/ProductsTableFilters/`

**צעדים:**
1. יצירת interface `ProductsTableFiltersProps`:
   - filters: ProductFilters
   - categories: Category[] (עץ היררכי)
   - onFilterChange: (key: string, value: any) => void
   - onReset: () => void

2. בניית JSX (MVP):
   - Select קטגוריה (שימוש ב-shadcn/ui Select)
   - Select סטטוס (פעיל / לא פעיל / הכל)
   - כפתור "נקה פילטרים"

3. הצגת active filters כ-chips (badges)

4. עיצוב CSS

> **לא בשלב זה:**  
> - טווח מחירים ❌  
> - סינון לפי brand ❌  
> - סינון לפי tags ❌  
> - Date range picker ❌

### שלב 4.3: יצירת ProductsTableToolbar
**תיקייה:** `client/src/components/features/admin/Products/ProductsTable/ProductsTableToolbar/`

**צעדים:**
1. יצירת interface `ProductsTableToolbarProps`:
   - searchQuery: string
   - onSearchChange: (query: string) => void
   - sortBy: string
   - sortOrder: 'asc' | 'desc'
   - onSortChange: (sortBy: string, order: 'asc' | 'desc') => void
   - viewMode: 'table' | 'grid'
   - onViewModeChange: (mode: 'table' | 'grid') => void

2. בניית JSX:
   - Input חיפוש עם debounce (300ms)
   - Select מיון (שם, מחיר, תאריך, מלאי)
   - כפתורי ASC/DESC
   - Toggle תצוגת טבלה/רשת
   - Results counter

3. שימוש ב-useDebouncedValue hook לחיפוש

4. עיצוב CSS

### שלב 4.4: יצירת ProductRow
**תיקייה:** `client/src/components/features/admin/Products/ProductsTable/ProductRow/`

**צעדים:**
1. יצירת interface `ProductRowProps`:
   - product: Product
   - isSelected: boolean
   - onSelect: (id: string, selected: boolean) => void
   - onEdit: (id: string) => void
   - onDelete: (id: string) => void
   - onDuplicate: (id: string) => void
   - onToggleActive: (id: string, isActive: boolean) => void

2. בניית JSX:
   - Checkbox בחירה
   - תמונה ממוזערת (50x50)
   - שם מוצר (קליק → עריכה)
   - SKU ראשי
   - מחיר + badge הנחה
   - מלאי (עם צבע: ירוק/כתום/אדום)
   - קטגוריה ראשית
   - Toggle סטטוס (פעיל/לא פעיל)
   - תפריט פעולות (⋮):
     - ערוך
     - שכפל
     - מחק
     - הצג בחנות

3. עיצוב CSS:
   - grid layout
   - hover effects
   - status colors

### שלב 4.5: יצירת ProductsTable - הרכבה
**תיקייה:** `client/src/components/features/admin/Products/ProductsTable/`

**קבצים:**
- `ProductsTable.tsx`
- `ProductsTable.module.css`
- `index.ts`

**צעדים:**
1. יצירת interface `ProductsTableProps`:
   - (ריק - הכל מ-Redux)

2. שימוש ב-Redux hooks:
   - useAppSelector לקבלת state
   - useAppDispatch לשליחת actions

3. useEffect לטעינת נתונים בהתחלה:
   - dispatch(fetchProducts())

4. בניית JSX:
   - ProductsTableHeader
   - ProductsTableFilters
   - ProductsTableToolbar
   - Loading skeleton (אם loading=true)
   - Error message (אם error)
   - Empty state (אם אין מוצרים)
   - טבלה:
     - thead עם checkbox "select all"
     - tbody עם ProductRow לכל מוצר
   - Pagination

5. handlers:
   - handleAddProduct → setMode('create')
   - handleBulkDelete → ConfirmDialog + dispatch
   - handleExport → ייצוא ל-CSV
   - handleFiltersChange → dispatch(setFilters)
   - handleSortChange → dispatch(setSort)
   - handlePageChange → dispatch(setPage)

6. עיצוב CSS:
   - responsive table
   - scroll horizontal במובייל

---

## 🔗 Phase 4.7: Redux Integration - חיבור ה-UI ל-Redux (חובה!)

> **⚠️ שלב קריטי שנשמט מהתוכנית המקורית!**  
> 
> **למה צריך שלב זה?**  
> ב-Phase 4.1-4.5 בנינו UI מלא עם handlers, אבל כולם עם `alert` זמני!  
> עכשיו נחבר את כל ה-handlers האלה ל-Redux האמיתי.
> 
> **מה לא בשלב זה:**  
> - ❌ Backend endpoint חדש (זה Phase 5.0)  
> - ❌ ProductForm (זה Phase 5.1-5.9)  
> - ❌ ImageUploader→Cloudinary (זה Phase 5.5)  
> 
> **Timeline צפוי: 3-4 שעות**

### שלב 4.7.1: חיבור Delete ל-Redux
**קובץ:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

**צעדים:**
1. בדיקה אם deleteProduct thunk קיים ב-Redux:
   ```bash
   # אם לא קיים - צריך להוסיף ל-productsManagementSlice.ts
   ```

2. עדכון handler:
   ```typescript
   // לפני (Phase 4.6):
   const handleDeleteProduct = (productId: string) => {
     if (window.confirm('למחוק?')) {
       alert('מחיקה תתבצע ב-Phase 5');
     }
   };
   
   // אחרי (Phase 4.7.1):
   const handleDeleteProduct = async (productId: string) => {
     const product = products.find((p) => p._id === productId);
     if (!product) return;
     
     if (window.confirm(`האם למחוק את "${product.name}"?`)) {
       try {
         await dispatch(deleteProduct(productId)).unwrap();
         // הצלחה - הודעה ידידותית
         console.log('✅ מוצר נמחק בהצלחה');
         // טעינה מחדש
         dispatch(fetchProducts({ filters, sortBy, sortDirection }));
       } catch (error) {
         console.error('❌ שגיאה במחיקה:', error);
         alert('שגיאה במחיקת המוצר');
       }
     }
   };
   ```

3. בדיקה:
   - לחץ על כפתור Delete
   - ודא ש-API נקרא (Network tab)
   - ודא שהמוצר נעלם מהרשימה

### שלב 4.7.2: חיבור Filters ל-Redux (אמיתי)
**קובץ:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

**בעיה נוכחית:**
```typescript
// Phase 4.2 - רק שומר ב-state, לא עושה כלום אמיתי
const handleFilterChange = (newFilters) => {
  dispatch(setFilters(newFilters));
  dispatch(fetchProducts({ filters: { ...filters, ...newFilters } }));
};
```

**צעדים:**
1. וידוא ש-fetchProducts thunk מקבל filters:
   ```typescript
   // בדוק ב-productsManagementSlice.ts
   export const fetchProducts = createAsyncThunk(
     'productsManagement/fetchProducts',
     async (params: { filters?: any; sortBy?: string; sortDirection?: string }) => {
       // ...
     }
   );
   ```

2. עדכון handler (אם צריך):
   ```typescript
   const handleFilterChange = (newFilters: Partial<typeof filters>) => {
     console.log('🔍 שינוי פילטרים:', newFilters);
     
     // עדכון ב-Redux
     dispatch(setFilters(newFilters));
     
     // טעינה מחדש עם הפילטרים החדשים
     const mergedFilters = { ...filters, ...newFilters };
     dispatch(fetchProducts({ 
       filters: mergedFilters, 
       sortBy, 
       sortDirection 
     }));
   };
   ```

3. בדיקה:
   - בחר קטגוריה → ודא שהרשימה מסתננת
   - בחר "לא פעיל" → ודא שרואים רק לא פעילים
   - לחץ "איפוס" → ודא שחוזר לכל המוצרים

### שלב 4.7.3: חיבור Search ל-Redux (אמיתי)
**קובץ:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

**בעיה נוכחית:**
```typescript
// Phase 4.3 - רק debounce, לא חיפוש אמיתי בשרת
const handleSearchChange = (query: string) => {
  dispatch(setFilters({ search: query }));
  dispatch(fetchProducts({ filters: { ...filters, search: query } }));
};
```

**צעדים:**
1. וידוא ש-fetchProducts thunk מעביר search לשרת:
   ```typescript
   // בדוק ב-productManagementService.ts
   async getProducts(params: { filters?: any }) {
     const queryParams = new URLSearchParams();
     if (params.filters?.search) {
       queryParams.append('search', params.filters.search);
     }
     // ...
   }
   ```

2. אם צריך - עדכון Service Layer:
   ```typescript
   // productManagementService.ts
   async getProducts(params: { 
     filters?: { 
       search?: string; 
       categoryId?: string; 
       isActive?: boolean 
     }; 
     sortBy?: string; 
     sortDirection?: string;
   }) {
     const queryParams = new URLSearchParams();
     
     if (params.filters?.search) {
       queryParams.append('search', params.filters.search);
     }
     if (params.filters?.categoryId) {
       queryParams.append('categoryId', params.filters.categoryId);
     }
     if (params.filters?.isActive !== undefined) {
       queryParams.append('isActive', params.filters.isActive.toString());
     }
     if (params.sortBy) {
       queryParams.append('sortBy', params.sortBy);
     }
     if (params.sortDirection) {
       queryParams.append('sortDirection', params.sortDirection);
     }
     
     const url = `/api/products?${queryParams.toString()}`;
     const response = await this.makeRequest<Product[]>(url, { method: 'GET' });
     
     return {
       products: Array.isArray(response) ? response : [],
       cursor: null,
       hasMore: false,
       total: Array.isArray(response) ? response.length : 0,
     };
   }
   ```

3. בדיקה:
   - הקלד "laptop" בחיפוש
   - ודא ש-API נקרא עם `?search=laptop`
   - ודא שרואים רק מוצרים רלוונטיים

### שלב 4.7.4: חיבור Sorting ל-Redux (אמיתי)
**קובץ:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

**בעיה נוכחית:**
```typescript
// Phase 4.3 - רק שומר ב-state, לא ממיין אמיתית
const handleSortChange = (newSortBy, newSortDirection) => {
  dispatch(setSorting({ sortBy: newSortBy, sortDirection: newSortDirection }));
  dispatch(fetchProducts({ filters, sortBy: newSortBy, sortDirection: newSortDirection }));
};
```

**צעדים:**
1. וידוא ש-Service Layer מעביר sortBy + sortDirection:
   ```typescript
   // כבר עשינו ב-4.7.3, רק צריך לוודא שעובד
   ```

2. וידוא ש-Backend מטפל ב-sorting:
   ```typescript
   // בדוק ב-server/src/controllers/productController.ts
   // האם getProducts תומך ב-sortBy?
   // אם לא - Phase 5.0 יתקן את זה!
   ```

3. **לעת עתה** - Sorting **בצד לקוח בלבד**:
   ```typescript
   // productManagementService.ts - תיקון זמני
   async getProducts(params: any) {
     // ... קריאה לשרת ...
     
     // ⚠️ Sorting זמני בצד לקוח (עד Phase 5.0)
     let sortedProducts = [...products];
     if (params.sortBy && params.sortDirection) {
       sortedProducts.sort((a, b) => {
         let aVal = a[params.sortBy];
         let bVal = b[params.sortBy];
         
         if (params.sortBy === 'name') {
           return params.sortDirection === 'asc' 
             ? aVal.localeCompare(bVal) 
             : bVal.localeCompare(aVal);
         }
         
         return params.sortDirection === 'asc' 
           ? aVal - bVal 
           : bVal - aVal;
       });
     }
     
     return {
       products: sortedProducts,
       // ...
     };
   }
   ```

4. בדיקה:
   - בחר "מיון לפי מחיר"
   - לחץ על כיוון מיון
   - ודא שהרשימה משתנה

### שלב 4.7.5: חיבור Bulk Selection ל-Redux
**קובץ:** `client/src/components/features/admin/Products/ProductsTable/ProductsTable/ProductsTable.tsx`

**בעיה נוכחית:**
```typescript
// Phase 4.5 - רק useState מקומי, לא מחובר לפעולות
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**צעדים:**
1. הוספת selectedIds ל-Redux state:
   ```typescript
   // productsManagementSlice.ts
   interface ProductsManagementState {
     // ... קיים ...
     selectedIds: string[]; // 🆕
   }
   
   const initialState: ProductsManagementState = {
     // ...
     selectedIds: [], // 🆕
   };
   
   // Reducers:
   reducers: {
     // ...
     selectProduct: (state, action: PayloadAction<string>) => {
       if (!state.selectedIds.includes(action.payload)) {
         state.selectedIds.push(action.payload);
       }
     },
     deselectProduct: (state, action: PayloadAction<string>) => {
       state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
     },
     selectAll: (state) => {
       state.selectedIds = state.products.map(p => p._id);
     },
     deselectAll: (state) => {
       state.selectedIds = [];
     },
   }
   ```

2. עדכון ProductsTable להשתמש ב-Redux:
   ```typescript
   // ProductsTable.tsx
   import { selectProduct, deselectProduct, selectAll, deselectAll } from '...';
   
   const ProductsTable: React.FC<ProductsTableProps> = ({ ... }) => {
     const dispatch = useAppDispatch();
     const selectedIds = useAppSelector(state => state.productsManagement.selectedIds);
     
     // הסר: const [selectedIds, setSelectedIds] = useState...
     
     const handleSelectRow = (productId: string, selected: boolean) => {
       if (selected) {
         dispatch(selectProduct(productId));
       } else {
         dispatch(deselectProduct(productId));
       }
     };
     
     const handleSelectAll = (selected: boolean) => {
       if (selected) {
         dispatch(selectAll());
       } else {
         dispatch(deselectAll());
       }
     };
     
     // ...
   };
   ```

3. הוספת Bulk Delete:
   ```typescript
   // ProductsManagementPage.tsx
   const handleBulkDelete = async () => {
     if (selectedIds.length === 0) return;
     
     if (window.confirm(`האם למחוק ${selectedIds.length} מוצרים?`)) {
       try {
         // מחיקה מרובה
         await Promise.all(
           selectedIds.map(id => dispatch(deleteProduct(id)).unwrap())
         );
         
         console.log('✅ מוצרים נמחקו בהצלחה');
         dispatch(deselectAll());
         dispatch(fetchProducts({ filters, sortBy, sortDirection }));
       } catch (error) {
         console.error('❌ שגיאה במחיקה מרובה:', error);
         alert('שגיאה במחיקת מוצרים');
       }
     }
   };
   ```

4. הוספת כפתור Bulk Delete ל-UI:
   ```typescript
   // ProductsTable.tsx - Bulk Actions Bar
   {selectedIds.length > 0 && (
     <div className={styles.bulkActionsBar}>
       <span className={styles.bulkCount}>
         {selectedIds.length} מוצרים נבחרו
       </span>
       <Button
         variant="danger"
         size="sm"
         onClick={onBulkDelete}
       >
         <Icon name="Trash2" size={16} />
         מחק נבחרים
       </Button>
       <button
         className={styles.bulkCancel}
         onClick={() => dispatch(deselectAll())}
       >
         ביטול
       </button>
     </div>
   )}
   ```

5. בדיקה:
   - סמן 3 מוצרים
   - לחץ "מחק נבחרים"
   - ודא שכולם נמחקים

### שלב 4.7.6: בדיקה מקיפה
**צעדים:**
1. בדוק Delete בודד - ✅
2. בדוק Filters (קטגוריה + סטטוס) - ✅
3. בדוק Search - ✅
4. בדוק Sorting (5 שדות × 2 כיוונים) - ✅
5. בדוק Bulk Delete - ✅
6. בדוק שילוב: Filter + Search + Sort - ✅

---

## ⏱️ Timeline מעודכן (Phases 2-4.7)

| Phase | תיאור | זמן משוער |
|-------|--------|----------|
| **Phase 2.1** | ImageUploader (react-dropzone + mock) | 1-2 ימים |
| **Phase 2.2** | ConfirmDialog | 0.5 יום |
| **Phase 2.3** | shadcn/ui Select | 0.5 יום |
| **Phase 3.1** | Redux Slice (מקוצר) | 0.5-1 יום |
| **Phase 3.2** | Service Layer (2 פונקציות) | 0.5 יום |
| **Phase 4.1-4.6** | Products Table UI | 2 ימים |
| **Phase 4.7** | Redux Integration ⭐ | 0.5 יום |
| **סה"כ** | | **5.5-7.5 ימים** |

**✅ Phase 4.7 הושלם - 26 אוקטובר 2025**

**אחרי Phase 4.7 תהיה לך:**
- ✅ טבלת מוצרים **מחוברת למלא ל-Redux**
- ✅ Delete עובד (Phase 4.7.1) ✓
- ✅ Filters עובד (Phase 4.7.2) ✓
- ✅ Search עובד (Phase 4.7.3) ✓
- ✅ Sorting עובד (Phase 4.7.4) ✓ (זמני בצד לקוח)
- ✅ Bulk Delete עובד (Phase 4.7.5) ✓
- ✅ בסיס יציב ל-Phase 5!
- ✅ דוח בדיקה מקיף (Phase 4.7.6) ✓

**📄 קובץ דוח:** `PHASE_4_7_6_TEST_REPORT.md`

**השלב הבא:** Phase 5.0 - Backend Endpoint (תיקון הפלסטר!)

---

## ⏱️ Timeline סיכום (Phases 2-4)

| Phase | תיאור | זמן משוער |
|-------|--------|----------|
| **Phase 2.1** | ImageUploader (react-dropzone + mock) | 1-2 ימים |
| **Phase 2.2** | ConfirmDialog | 0.5 יום |
| **Phase 2.3** | shadcn/ui Select | 0.5 יום |
| **Phase 3.1** | Redux Slice (מקוצר) | 0.5-1 יום |
| **Phase 3.2** | Service Layer (2 פונקציות) | 0.5 יום |
| **Phase 4** | Products Table MVP | 2 ימים |
| **סה"כ** | | **5-7 ימים** |

**אחרי Phase 4 תהיה לך:**
- ✅ טבלת מוצרים עובדת עם Backend אמיתי
- ✅ חיפוש וסינון בסיסי
- ✅ מחיקת מוצרים
- ✅ Pagination
- ✅ בסיס יציב להוספת פיצ'רים

**השלב הבא:** Phase 5.0 - Backend Endpoint (תיקון הפלסטר!)

---

## 📝 Phase 5: Product Form - טופס מוצר

> **📌 בשלב זה:**  
> - **Phase 5.0** - תיקון Backend: Endpoint חדש עם Cursor Pagination אמיתי  
> - **Phase 5.1-5.9** - בניית ProductForm מלא (Create/Edit)  
> - **Phase 5.5** - חיבור ImageUploader ל-Cloudinary (לא mock יותר!)  
> - הוספת פונקציות ל-Redux: createProduct, updateProduct, etc.  
> 
> **⚠️ הבדל חשוב מ-Phase 4.7:**  
> - **Phase 4.7** = חיבור ProductsTable ל-Redux (רשימה/ניהול)  
> - **Phase 5** = ProductForm (יצירה/עריכה של מוצר)  
> - **2 דברים שונים לחלוטין!**
> 
> **Timeline צפוי: 5-7 שעות (לא ימים!)**

---

### 🔧 שלב 5.0: תיקון Endpoint - Cursor Pagination אמיתי (חובה!)

> **⚠️ תיקון הפלסטר מ-Phase 3!**  
> עכשיו ניצור endpoint חדש שמחזיר פורמט מלא עם cursor + filters.

#### **שלב 5.0.1: Backend - Controller חדש**
**קובץ:** `server/src/controllers/productController.ts`

**צעדים:**
1. הוספת פונקציה `getProductsForManagement`:
   ```typescript
   /**
    * GET /api/admin/products - טעינת מוצרים לדף ניהול
    * תומך ב-cursor pagination, filters, sort
    */
   export const getProductsForManagement = async (req: Request, res: Response) => {
     try {
       const { 
         search,          // חיפוש בשם/תיאור
         categoryId,      // סינון לפי קטגוריה
         isActive,        // סינון לפי סטטוס (true/false)
         sortBy,          // name|price|createdAt|salesCount|stockQuantity
         sortDirection,   // asc|desc
         cursor,          // cursor לעמוד הבא
         limit = '20'     // כמה מוצרים בעמוד
       } = req.query;
       
       const result = await productService.fetchProductsWithCursor({
         search: search as string | undefined,
         categoryId: categoryId as string | undefined,
         isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
         sortBy: sortBy as string | undefined,
         sortDirection: sortDirection as 'asc' | 'desc' | undefined,
         cursor: cursor as string | undefined,
         limit: parseInt(limit as string, 10)
       });
       
       res.json({
         success: true,
         data: result.products,
         cursor: result.nextCursor,
         hasMore: result.hasMore,
         total: result.total
       });
     } catch (error) {
       console.error('שגיאה בטעינת מוצרים לניהול:', error);
       res.status(500).json({ 
         success: false, 
         message: 'שגיאה בטעינת מוצרים', 
         error: error instanceof Error ? error.message : 'Unknown error'
       });
     }
   };
   ```

#### **שלב 5.0.2: Backend - Service חדש**
**קובץ:** `server/src/services/productService.ts`

**צעדים:**
1. הוספת פונקציה `fetchProductsWithCursor`:
   ```typescript
   interface FetchProductsWithCursorParams {
     search?: string;
     categoryId?: string;
     isActive?: boolean;
     sortBy?: string;
     sortDirection?: 'asc' | 'desc';
     cursor?: string;
     limit?: number;
   }
   
   export const fetchProductsWithCursor = async (params: FetchProductsWithCursorParams) => {
     const {
       search,
       categoryId,
       isActive,
       sortBy = 'createdAt',
       sortDirection = 'desc',
       cursor,
       limit = 20
     } = params;
     
     // בניית query
     const query: any = {};
     
     // פילטרים
     if (search) {
       query.$or = [
         { name: { $regex: search, $options: 'i' } },
         { description: { $regex: search, $options: 'i' } }
       ];
     }
     
     if (categoryId) {
       query.categoryId = categoryId;
     }
     
     if (isActive !== undefined) {
       query.isActive = isActive;
     }
     
     // Cursor pagination
     if (cursor) {
       const [cursorValue, cursorId] = cursor.split('_');
       
       if (sortDirection === 'asc') {
         query.$or = [
           { [sortBy]: { $gt: cursorValue } },
           { [sortBy]: cursorValue, _id: { $gt: cursorId } }
         ];
       } else {
         query.$or = [
           { [sortBy]: { $lt: cursorValue } },
           { [sortBy]: cursorValue, _id: { $lt: cursorId } }
         ];
       }
     }
     
     // מיון
     const sortObj: any = {};
     sortObj[sortBy] = sortDirection === 'asc' ? 1 : -1;
     sortObj._id = sortDirection === 'asc' ? 1 : -1; // tie-breaker
     
     // שליפה
     const products = await Product.find(query)
       .sort(sortObj)
       .limit(limit + 1) // +1 כדי לדעת אם יש עוד
       .populate('categoryId', 'name slug')
       .lean();
     
     // האם יש עוד?
     const hasMore = products.length > limit;
     if (hasMore) {
       products.pop(); // הסרת המוצר ה-21
     }
     
     // יצירת cursor הבא
     let nextCursor = null;
     if (hasMore && products.length > 0) {
       const lastProduct = products[products.length - 1];
       nextCursor = `${lastProduct[sortBy]}_${lastProduct._id}`;
     }
     
     // ספירת סה"כ (רק בפעם הראשונה, ללא cursor)
     const total = cursor ? undefined : await Product.countDocuments(query);
     
     return {
       products,
       nextCursor,
       hasMore,
       total
     };
   };
   ```

#### **שלב 5.0.3: Backend - Route חדש**
**קובץ:** `server/src/routes/productRoutes.ts`

**צעדים:**
1. הוספת route:
   ```typescript
   import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
   
   // Route חדש לניהול (admin בלבד)
   router.get('/admin/products', authMiddleware, requireAdmin, getProductsForManagement);
   ```

#### **שלב 5.0.4: Frontend - עדכון Service**
**קובץ:** `client/src/services/productManagementService.ts`

**צעדים:**
1. שינוי ה-baseUrl:
   ```typescript
   private baseUrl = '/api/admin/products'; // ← שינוי מ-'/api/products'
   ```

2. הסרת קוד הפלסטר:
   ```typescript
   async getProducts(params: FetchProductsParams = {}): Promise<FetchProductsResponse> {
     try {
       // ... buildQueryString ...
       
       const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;
       
       // ✅ עכשיו השרת מחזיר פורמט מלא!
       const response = await this.makeRequest<{
         success: boolean;
         data: Product[];
         cursor: string | null;
         hasMore: boolean;
         total: number;
       }>(url, {
         method: 'GET',
       });
       
       return {
         products: response.data,
         cursor: response.cursor,
         hasMore: response.hasMore,
         total: response.total,
       };
     } catch (error) {
       // ... error handling ...
     }
   }
   ```

#### **שלב 5.0.5: בדיקה**
**צעדים:**
1. הפעלת שרת: `npm run dev`
2. בדוק ב-TestProductsRedux:
   - `Products Count` > 0 ✅
   - `Has More` = Yes (אם יש יותר מ-20) ✅
   - `Cursor` לא null ✅
   - כפתור "טען עוד" עובד ✅

---

### שלב 5.1: הגדרת Form Schema
**קובץ חדש:** `client/src/components/features/admin/Products/ProductForm/productFormSchema.ts`

**צעדים:**
1. התקנת yup: `npm install yup`

2. יצירת schema:
   ```typescript
   const productSchema = yup.object({
     name: yup.string().min(3).max(200).required('שם חובה'),
     description: yup.string().min(10).required('תיאור חובה'),
     basePrice: yup.number().min(0).required('מחיר חובה'),
     compareAtPrice: yup.number().min(0).optional(),
     brand: yup.string().optional(),
     sku: yup.string().matches(/^[A-Z0-9-]+$/).required('SKU חובה'),
     quantityInStock: yup.number().min(0).required('מלאי חובה'),
     categoryId: yup.string().optional(),
     images: yup.array().of(yup.string().url()),
     tags: yup.array().of(yup.string()),
     skus: yup.array().of(yup.object({
       sku: yup.string().required(),
       name: yup.string().required(),
       price: yup.number().min(0),
       stockQuantity: yup.number().min(0).required(),
       attributes: yup.object(),
       images: yup.array().of(yup.string().url())
     }))
   });
   ```

### שלב 5.2: יצירת ProductBasicInfo
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductBasicInfo/`

**צעדים:**
1. יצירת interface `ProductBasicInfoProps`:
   - values: { name, description, brand }
   - errors: Record<string, string>
   - onChange: (field: string, value: any) => void

2. בניית JSX:
   - Input שם מוצר
   - Textarea תיאור (או RichTextEditor)
   - Input מותג
   - character counter לתיאור

3. real-time validation

4. עיצוב CSS

### שלב 5.3: יצירת ProductPricing
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductPricing/`

**צעדים:**
1. יצירת interface `ProductPricingProps`:
   - values: { basePrice, compareAtPrice, discountPercentage }
   - errors: Record<string, string>
   - onChange: (field: string, value: any) => void

2. בניית JSX:
   - Input מחיר בסיס (חובה)
   - Input מחיר להשוואה (אופציונלי)
   - תצוגה מחושבת של אחוז הנחה
   - preview חזותי של ההנחה

3. חישוב אוטומטי של discountPercentage

4. validation: compareAtPrice > basePrice

5. עיצוב CSS

### שלב 5.4: יצירת ProductInventory
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductInventory/`

**צעדים:**
1. יצירת interface `ProductInventoryProps`:
   - values: { sku, quantityInStock, trackInventory }
   - errors: Record<string, string>
   - onChange: (field: string, value: any) => void
   - onCheckSku: (sku: string) => Promise<boolean>

2. בניית JSX:
   - Input SKU עם בדיקת ייחודיות
   - אינדיקטור: SKU זמין/תפוס
   - Input כמות במלאי
   - Checkbox "עקוב אחרי מלאי"
   - Input warning threshold (אזהרת מלאי נמוך)

3. debounced SKU check (500ms)

4. עיצוב CSS

### שלב 5.5: יצירת ProductImages
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductImages/`

**צעדים:**
1. יצירת interface `ProductImagesProps`:
   - images: string[]
   - onChange: (images: string[]) => void
   - onUpload: (files: File[]) => Promise<string[]>

2. שימוש ב-ImageUploader component

3. הוספת primary image indicator

4. עיצוב CSS

### שלב 5.6: יצירת ProductCategories
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductCategories/`

**צעדים:**
1. יצירת interface `ProductCategoriesProps`:
   - selectedCategoryId: string
   - categories: Category[]
   - onChange: (categoryId: string) => void

2. שימוש ב-categoryService לטעינת קטגוריות

3. בניית tree view היררכי:
   - רקורסיה על children
   - indent לפי level
   - אייקון פתוח/סגור לקטגוריות עם children

4. חיפוש בקטגוריות

5. breadcrumb להצגת הנתיב

6. עיצוב CSS

### שלב 5.7: יצירת ProductSKUs - ניהול וריאנטים בטופס

> **📌 חשוב - הבהרה:**  
> קומפוננטה זו מיועדת **לטופס יצירה/עריכה בלבד** (ProductForm).  
> **לא** מדובר בהצגה בטבלת המוצרים (ProductsTable)!  
> 
> **גישת UX מקובלת:**  
> ```
> דף ניהול מוצרים (Phase 4):
> ┌─────────────────────────────────────────────┐
> │ 📦 ASPIRE FLEXUS Q POD MOD KIT             │
> │ ₪180 | 15 יח' סה"כ | פעיל                │
> │ [✏️ ערוך] [🗑️ מחק]                        │
> └─────────────────────────────────────────────┘
>         ↓ לחיצה על "ערוך"
> 
> טופס עריכת מוצר (Phase 5):
> ┌─────────────────────────────────────────────┐
> │ [מידע בסיסי] [מחיר] [תמונות] [SKUs] ← טאב │
> │                                             │
> │ טאב SKUs:                                   │
> │   ├─ 🔵 כחול (5 יח')    [✏️] [🗑️]         │
> │   ├─ 🌸 ורוד (5 יח')    [✏️] [🗑️]         │
> │   └─ 🟠 כתום (5 יח')    [✏️] [🗑️]         │
> │                                             │
> │   [➕ הוסף וריאנט]                          │
> └─────────────────────────────────────────────┘
> ```
> 
> **למה לא בטבלה?**  
> - ✅ **פשוט וברור** - טבלה עם שורה אחת למוצר, קל לסרוק  
> - ✅ **מהיר** - לא טוען עשרות SKUs בכל פעם  
> - ✅ **נקי** - לא עומס חזותי  
> - ✅ **מקובל** - WooCommerce, Shopify, Magento עושים ככה  
> 
> **אם בעתיד תרצה Expandable Rows (כמו GitHub PR):**  
> - זה יהיה **Phase 9 - Advanced Features** (אופציונלי)  
> - דורש שינויים ב-ProductsTable + API נוסף  
> - **לא** עכשיו! תחילה תסיים את ה-MVP ותבדוק שהכל עובד.

**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductSKUs/`

**קבצים:**
- `ProductSKUs.tsx` - קומפוננטה ראשית
- `SKURow.tsx` - שורת SKU בודדת (עריכה inline)
- `AddSKUModal.tsx` - מודל להוספת SKU חדש
- `ProductSKUs.module.css` - עיצוב
- `index.ts` - exports

**צעדים:**

**1. יצירת interface `ProductSKUsProps`:**
```typescript
interface ProductSKUsProps {
  skus: SKUFormData[];              // רשימת SKUs נוכחית
  onChange: (skus: SKUFormData[]) => void;  // callback לעדכון
  onCheckSku: (sku: string, excludeIndex?: number) => Promise<boolean>; // בדיקת ייחודיות
  basePrice?: number;                // מחיר בסיס (לתצוגה)
}
```

**2. יצירת interface `SKUFormData`:**
```typescript
interface SKUFormData {
  sku: string;              // קוד SKU ייחודי (חובה)
  name: string;             // שם תצוגה (חובה) - למשל "ASPIRE FLEXUS Q - כחול"
  price?: number;           // מחיר ספציפי (אופציונלי, אחרת מחיר בסיס)
  stockQuantity: number;    // מלאי (חובה)
  images: string[];         // תמונות (אופציונלי)
  attributes: {             // תכונות דינמיות
    color?: string;         // צבע (אופציונלי)
    size?: string;          // מידה (אופציונלי)
    [key: string]: any;     // תכונות נוספות
  };
  isActive: boolean;        // פעיל/לא פעיל (ברירת מחדל: true)
}
```

**3. בניית JSX - רשימת SKUs קיימים:**
```tsx
<div className={styles.skusSection}>
  {/* כותרת + סיכום */}
  <div className={styles.header}>
    <h3>וריאנטים (SKUs)</h3>
    <span className={styles.summary}>
      {skus.length} וריאנטים | סה"כ {totalStock} יח' במלאי
    </span>
  </div>
  
  {/* רשימה */}
  {skus.length > 0 ? (
    <div className={styles.skusList}>
      {skus.map((sku, index) => (
        <SKURow
          key={index}
          sku={sku}
          index={index}
          basePrice={basePrice}
          onUpdate={(updated) => handleUpdateSKU(index, updated)}
          onDelete={() => handleDeleteSKU(index)}
          onCheckSku={(skuCode) => onCheckSku(skuCode, index)}
        />
      ))}
    </div>
  ) : (
    <div className={styles.emptyState}>
      <Icon name="Package" size={48} />
      <p>טרם הוספו וריאנטים למוצר זה</p>
      <p className={styles.hint}>
        לחץ על "הוסף וריאנט" כדי ליצור SKU חדש
      </p>
    </div>
  )}
  
  {/* כפתור הוספה */}
  <Button
    variant="secondary"
    size="md"
    onClick={() => setShowAddModal(true)}
    className={styles.addButton}
  >
    <Icon name="Plus" size={16} />
    הוסף וריאנט
  </Button>
</div>
```

**4. בניית SKURow (עריכה inline):**
```tsx
<div className={styles.skuRow}>
  {/* תמונה ממוזערת */}
  <div className={styles.thumbnail}>
    {sku.images[0] ? (
      <img src={sku.images[0]} alt={sku.name} />
    ) : (
      <Icon name="Image" size={24} />
    )}
  </div>
  
  {/* שדות עריכה */}
  <div className={styles.fields}>
    {/* SKU */}
    <div className={styles.field}>
      <label>קוד SKU</label>
      <Input
        value={sku.sku}
        onChange={(e) => handleFieldChange('sku', e.target.value)}
        onBlur={() => handleCheckSku(sku.sku)}
        placeholder="ASP-FLEXUS-Q-BLUE"
        className={!isUnique ? styles.error : ''}
      />
      {checkingUniqueness && <Spinner size="sm" />}
      {!isUnique && <span className={styles.errorText}>SKU כבר קיים</span>}
    </div>
    
    {/* שם */}
    <div className={styles.field}>
      <label>שם וריאנט</label>
      <Input
        value={sku.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        placeholder="ASPIRE FLEXUS Q - כחול"
      />
    </div>
    
    {/* צבע */}
    <div className={styles.field}>
      <label>צבע</label>
      <div className={styles.colorPicker}>
        <input
          type="color"
          value={sku.attributes.color || '#000000'}
          onChange={(e) => handleAttributeChange('color', e.target.value)}
        />
        <Input
          value={sku.attributes.color || ''}
          onChange={(e) => handleAttributeChange('color', e.target.value)}
          placeholder="כחול / #0000FF"
        />
      </div>
    </div>
    
    {/* מחיר (אופציונלי) */}
    <div className={styles.field}>
      <label>מחיר (אופציונלי)</label>
      <Input
        type="number"
        value={sku.price || ''}
        onChange={(e) => handleFieldChange('price', parseFloat(e.target.value))}
        placeholder={basePrice ? `ברירת מחדל: ₪${basePrice}` : 'מחיר'}
      />
    </div>
    
    {/* מלאי */}
    <div className={styles.field}>
      <label>מלאי</label>
      <Input
        type="number"
        value={sku.stockQuantity}
        onChange={(e) => handleFieldChange('stockQuantity', parseInt(e.target.value) || 0)}
        min="0"
      />
    </div>
    
    {/* תמונות (mini uploader) */}
    <div className={styles.field}>
      <label>תמונות</label>
      <button
        onClick={() => setShowImageModal(true)}
        className={styles.imageButton}
      >
        <Icon name="Image" size={16} />
        {sku.images.length} תמונות
      </button>
    </div>
    
    {/* סטטוס */}
    <div className={styles.field}>
      <label>פעיל</label>
      <Checkbox
        checked={sku.isActive}
        onChange={(checked) => handleFieldChange('isActive', checked)}
      />
    </div>
  </div>
  
  {/* כפתור מחיקה */}
  <button
    onClick={() => handleDelete()}
    className={styles.deleteButton}
    title="מחק וריאנט"
  >
    <Icon name="Trash2" size={16} />
  </button>
</div>
```

**5. יצירת handlers:**
```typescript
// הוספת SKU חדש
const handleAddSKU = (newSKU: SKUFormData) => {
  onChange([...skus, newSKU]);
  setShowAddModal(false);
};

// עדכון SKU קיים
const handleUpdateSKU = (index: number, updated: Partial<SKUFormData>) => {
  const updatedSkus = [...skus];
  updatedSkus[index] = { ...updatedSkus[index], ...updated };
  onChange(updatedSkus);
};

// מחיקת SKU
const handleDeleteSKU = (index: number) => {
  const skuToDelete = skus[index];
  if (window.confirm(`האם למחוק את הוריאנט "${skuToDelete.name}"?`)) {
    const updatedSkus = skus.filter((_, i) => i !== index);
    onChange(updatedSkus);
  }
};

// בדיקת ייחודיות (debounced)
const handleCheckSku = useDebouncedCallback(
  async (skuCode: string, excludeIndex?: number) => {
    if (!skuCode) return;
    
    setCheckingUniqueness(true);
    try {
      const isAvailable = await onCheckSku(skuCode, excludeIndex);
      setIsUnique(isAvailable);
    } catch (error) {
      console.error('שגיאה בבדיקת SKU:', error);
    } finally {
      setCheckingUniqueness(false);
    }
  },
  500
);
```

**6. חישוב סיכומים:**
```typescript
// סה"כ מלאי מכל ה-SKUs
const totalStock = useMemo(() => {
  return skus.reduce((sum, sku) => sum + sku.stockQuantity, 0);
}, [skus]);

// סה"כ SKUs פעילים
const activeSkusCount = useMemo(() => {
  return skus.filter(sku => sku.isActive).length;
}, [skus]);

// טווח מחירים (אם יש מחירים שונים)
const priceRange = useMemo(() => {
  const prices = skus
    .map(sku => sku.price)
    .filter((p): p is number => p !== undefined);
  
  if (prices.length === 0) return null;
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  return min === max ? `₪${min}` : `₪${min} - ₪${max}`;
}, [skus]);
```

**7. Validation:**
```typescript
// בדיקה שכל ה-SKUs תקינים
const validateSKUs = (): string[] => {
  const errors: string[] = [];
  
  // בדיקת ייחודיות בין SKUs
  const skuCodes = skus.map(s => s.sku);
  const duplicates = skuCodes.filter((sku, index) => 
    skuCodes.indexOf(sku) !== index
  );
  
  if (duplicates.length > 0) {
    errors.push(`קודי SKU כפולים: ${duplicates.join(', ')}`);
  }
  
  // בדיקת שדות חובה
  skus.forEach((sku, index) => {
    if (!sku.sku?.trim()) {
      errors.push(`SKU #${index + 1}: חסר קוד SKU`);
    }
    if (!sku.name?.trim()) {
      errors.push(`SKU #${index + 1}: חסר שם`);
    }
    if (sku.stockQuantity < 0) {
      errors.push(`SKU #${index + 1}: מלאי לא תקין`);
    }
  });
  
  return errors;
};

// שימוש ב-validation לפני שמירה
const handleSave = () => {
  const errors = validateSKUs();
  
  if (errors.length > 0) {
    alert('שגיאות בוריאנטים:\n' + errors.join('\n'));
    return;
  }
  
  // המשך לשמירה...
};
```

**8. עיצוב CSS:**
```css
/* מיכל כללי */
.skusSection {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

/* כותרת + סיכום */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.summary {
  font-size: 0.875rem;
  color: #6b7280;
}

/* רשימת SKUs */
.skusList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

/* שורת SKU */
.skuRow {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.skuRow:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* תמונה */
.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* שדות */
.fields {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

/* בורר צבע */
.colorPicker {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.colorPicker input[type="color"] {
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
}

/* כפתור מחיקה */
.deleteButton {
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.deleteButton:hover {
  background: #fee2e2;
}

/* Empty state */
.emptyState {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.emptyState .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* כפתור הוספה */
.addButton {
  width: 100%;
  margin-top: 1rem;
}

/* שגיאות */
.error {
  border-color: #ef4444 !important;
}

.errorText {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

/* Responsive */
@media (max-width: 768px) {
  .skuRow {
    flex-direction: column;
  }
  
  .fields {
    grid-template-columns: 1fr;
  }
}
```

**9. הערות חשובות:**
- ✅ **בדיקת ייחודיות:** חובה לבדוק שה-SKU לא קיים כבר במערכת (גם במוצר הנוכחי וגם במוצרים אחרים)
- ✅ **מחיר אופציונלי:** אם SKU לא מגדיר מחיר, נשתמש במחיר הבסיס של המוצר
- ✅ **תמונות:** כל SKU יכול תמונות משלו (למשל צבעים שונים)
- ✅ **Attributes דינמי:** מאפשר להוסיף שדות נוספים (גודל, חומר, וכו')
- ✅ **סיכומים:** סה"כ מלאי מכל ה-SKUs מוצג בראש הקומפוננטה
- ⚠️ **זה הטופס בלבד!** לא להציג את כל ה-SKUs בטבלת המוצרים (Phase 4)

### שלב 5.8: יצירת ProductFormActions
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/ProductFormActions/`

**צעדים:**
1. יצירת interface `ProductFormActionsProps`:
   - mode: 'create' | 'edit'
   - isSubmitting: boolean
   - isDirty: boolean
   - onSave: () => void
   - onCancel: () => void
   - onDelete?: () => void
   - onDuplicate?: () => void

2. בניית JSX:
   - כפתור "שמור" (primary, disabled אם !isDirty או isSubmitting)
   - כפתור "ביטול"
   - כפתור "מחק" (destructive, רק במצב edit)
   - כפתור "שכפל מוצר" (רק במצב edit)

3. unsaved changes warning

4. עיצוב CSS:
   - sticky footer
   - spacing

### שלב 5.9: יצירת ProductForm - הרכבת הטופס
**תיקייה:** `client/src/components/features/admin/Products/ProductForm/`

**קבצים:**
- `ProductForm.tsx`
- `ProductForm.module.css`
- `index.ts`

**צעדים:**
1. יצירת interface `ProductFormProps`:
   - mode: 'create' | 'edit'
   - initialData?: Product
   - onSubmit: (data: ProductFormData) => Promise<void>
   - onCancel: () => void

2. שימוש ב-react-hook-form:
   ```bash
   npm install react-hook-form @hookform/resolvers
   ```

3. הגדרת form:
   ```typescript
   const { register, handleSubmit, watch, setValue, formState } = useForm({
     resolver: yupResolver(productSchema),
     defaultValues: initialData || defaultValues
   });
   ```

4. state נוסף:
   - uploading: boolean
   - checkingSku: boolean

5. בניית JSX בתוך Tabs:
   - Tab "מידע בסיסי": ProductBasicInfo
   - Tab "מחירים ומלאי": ProductPricing + ProductInventory
   - Tab "תמונות": ProductImages
   - Tab "SKUs": ProductSKUs
   - Tab "קטגוריות": ProductCategories

6. progress indicator:
   - חישוב כמה שדות חובה מולאו
   - הצגת progress bar

7. handlers:
   - handleSave → validation + dispatch
   - handleCancel → אזהרה אם isDirty
   - handleDelete → ConfirmDialog + dispatch
   - handleDuplicate → dispatch

8. עיצוב CSS:
   - tabs navigation
   - form layout
   - responsive

---

## 🔗 Phase 6: אינטגרציה - חיבור הכל ביחד

### שלב 6.1: עדכון ProductsManagementPage
**קובץ:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

**צעדים:**
1. import של ProductsTable + ProductForm

2. שימוש ב-Redux:
   ```typescript
   const { mode, editingProduct } = useAppSelector(state => state.productsManagement);
   const dispatch = useAppDispatch();
   ```

3. בניית JSX:
   ```tsx
   return (
     <div className={styles.container}>
       {/* Header */}
       <TitleWithIcon icon="Package" title="ניהול מוצרים" />
       
       {/* תוכן דינמי */}
       {mode === 'list' && <ProductsTable />}
       {mode === 'create' && <ProductForm mode="create" />}
       {mode === 'edit' && editingProduct && (
         <ProductForm mode="edit" initialData={editingProduct} />
       )}
     </div>
   );
   ```

4. עיצוב CSS

### שלב 6.2: רישום ה-Slice ב-Store
**קובץ:** `client/src/store/index.ts`

**צעדים:**
1. import productsManagementReducer

2. הוספה ל-configureStore:
   ```typescript
   productsManagement: productsManagementReducer
   ```

### שלב 6.3: בדיקה ראשונית
**צעדים:**
1. הפעלת שרת: `npm run dev` (שרת + קליינט)
2. כניסה לדף ניהול מוצרים
3. בדיקת טעינת רשימה
4. בדיקת פילטרים
5. בדיקת מיון
6. בדיקת pagination
7. פתיחת טופס יצירה
8. מילוי שדות
9. העלאת תמונות
10. שמירה
11. בדיקה שהמוצר מופיע ברשימה

---

## 🧪 Phase 7: Testing & Quality

### שלב 7.1: Unit Tests
**צעדים:**
1. בדיקת productsManagementSlice:
   - actions
   - reducers
   - selectors

2. בדיקת productManagementService:
   - API calls
   - error handling

3. בדיקת ProductForm:
   - validation
   - submission

### שלב 7.2: Component Tests
**צעדים:**
1. בדיקת ProductsTable:
   - rendering
   - filters
   - sorting
   - selection

2. בדיקת ProductForm:
   - rendering
   - validation
   - submission
   - image upload

3. בדיקת ProductSKUs:
   - add/edit/delete
   - validation

### שלב 7.3: Integration Tests
**צעדים:**
1. Flow מלא: יצירת מוצר
2. Flow מלא: עריכת מוצר
3. Flow מלא: מחיקת מוצר
4. Flow מלא: שכפול מוצר
5. בדיקת bulk operations

### שלב 7.4: E2E Tests (Playwright/Cypress)
**צעדים:**
1. התקנה: `npm install -D @playwright/test`
2. כתיבת test: כניסה → יצירת מוצר → שמירה
3. כתיבת test: עריכה + תמונות
4. כתיבת test: מחיקה + אישור
5. הרצת tests: `npm run test:e2e`

---

## 🎨 Phase 8: UX Polish & Improvements

### שלב 8.1: Loading States
**צעדים:**
1. הוספת skeleton screens לטבלה
2. הוספת spinners לכפתורים
3. הוספת progress bars להעלאת תמונות
4. הוספת shimmer effects

### שלב 8.2: Error Handling
**צעדים:**
1. הוספת toast notifications:
   - הצלחה: "המוצר נשמר בהצלחה"
   - שגיאה: "שגיאה בשמירת המוצר"
2. inline errors בטפסים
3. fallback UI למצבי שגיאה
4. retry mechanism

### שלב 8.3: Optimistic Updates
**צעדים:**
1. עדכון UI לפני תשובת שרת
2. rollback במקרה של כישלון
3. loading indicators עדינים

### שלב 8.4: Animations
**צעדים:**
1. fade in/out למודלים
2. slide in לside panels
3. smooth transitions
4. hover effects
5. micro-interactions

### שלב 8.5: Keyboard Shortcuts
**צעדים:**
1. יצירת useKeyboardShortcuts hook
2. רישום shortcuts:
   - `Ctrl+N` → מוצר חדש
   - `Ctrl+S` → שמור
   - `Esc` → סגור/בטל
   - `Ctrl+F` → חיפוש
   - `Delete` → מחק נבחרים
3. הצגת shortcuts במקומות רלוונטיים

### שלב 8.6: Accessibility
**צעדים:**
1. הוספת ARIA labels לכל האלמנטים
2. תמיכה מלאה ב-keyboard navigation
3. focus management
4. screen reader support
5. בדיקת color contrast (WCAG AA)
6. הרצת lighthouse audit

---

## 🚀 Phase 9 (אופציונלי): Advanced Features

### שלב 9.1: Bulk Import/Export
**צעדים:**
1. יצירת CSV template
2. יצירת import wizard
3. validation של CSV
4. preview לפני import
5. ייצוא מוצרים ל-CSV

### שלב 9.2: History & Audit
**צעדים:**
1. הוספת audit log ב-backend
2. שמירת כל שינוי במוצר
3. הצגת history timeline
4. שחזור לגרסה קודמת (version control)

### שלב 9.3: Advanced Search
**צעדים:**
1. search ב-multiple fields
2. saved searches
3. search suggestions
4. recent searches

---

## ✅ Checklist סופי

### Backend
- [ ] Product Controller - CRUD מלא
- [ ] Product Service - לוגיקה מלאה
- [ ] Validation middleware
- [ ] Upload middleware (Cloudinary)
- [ ] Routes מוגדרים
- [ ] בדיקה עם Postman

### Frontend - UI Components
- [ ] ImageUploader
- [ ] ConfirmDialog
- [ ] Select/Dropdown

### Frontend - Products Management
- [ ] Redux Slice
- [ ] Service Layer
- [ ] ProductsTable מלא
- [ ] ProductForm מלא
- [ ] ProductsManagementPage

### Testing
- [ ] Unit tests
- [ ] Component tests
- [ ] Integration tests
- [ ] E2E tests

### UX
- [ ] Loading states
- [ ] Error handling
- [ ] Animations
- [ ] Keyboard shortcuts
- [ ] Accessibility

---

## 🎯 סיכום

תוכנית זו מפרטת את כל השלבים הנדרשים לבניית דף ניהול מוצרים מקצועי ומתקדם. כל שלב מפורט עם צעדים ברורים, ללא אומדני זמן, כך שניתן לעבוד בקצב שלך ולוודא איכות בכל צעד.

**הצלחה! 🚀**
