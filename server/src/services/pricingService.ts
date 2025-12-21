import mongoose from 'mongoose';
import Product, { type IProduct } from '../models/Product';
import User from '../models/User';

// ממשק לתוצאת חישוב מחיר
interface PriceCalculationResult {
  productId: string;
  originalPrice: number;      // מחיר מקורי של המוצר
  finalPrice: number;         // מחיר סופי אחרי הנחה
  discountPercentage: number; // אחוז ההנחה שהוחל
  customerGroupName?: string; // שם קבוצת הלקוח (אם יש)
  hasDiscount: boolean;       // האם יש הנחה
}

type ProductLike = Partial<IProduct> & {
  _id: mongoose.Types.ObjectId | string;
  toObject?: () => unknown;
};

class PricingService {
  /**
   * מחשב מחיר מותאם אישית עבור משתמש ספציפי
   * @param productId - מזהה המוצר
   * @param userId - מזהה המשתמש (אופציונלי - עבור אורחים)
   * @returns תוצאת חישוב מחיר מפורטת
   */
  async calculatePriceForUser(
    productId: string,
    userId?: string,
    productDoc?: ProductLike | Record<string, any>,
    preloadedUser?: Record<string, any> | null
  ): Promise<PriceCalculationResult> {
    // שלב 1: שימוש במסמך שכבר נטען (אם קיים) כדי למנוע שליפה נוספת
    let product: any = productDoc;
    if (product && typeof product.toObject === 'function') {
      product = product.toObject();
    }

    if (!product) {
      product = await Product.findById(productId).lean();
    }

    if (!product) {
      throw new Error('מוצר לא נמצא');
    }

    // שלב 2: אתחול תוצאה עם מחיר בסיס (עבור אורחים)
    const result: PriceCalculationResult = {
      productId,
      originalPrice: product.basePrice,
      finalPrice: product.basePrice,
      discountPercentage: 0,
      hasDiscount: false
    };

    // שלב 3: שליפת המשתמש פעם אחת (אם לא סופק מראש)
    let user = preloadedUser;
    if (userId && !user) {
      const loadedUser = await User.findById(userId)
        .populate('customerGroupId')
        .lean(); // lean מספק אובייקט שטוח לצורך חישוב הנחה ללא צורך במתודות מסמך
      user = loadedUser;
    }

    // שלב 4: חישוב הנחה לקבוצת הלקוח (אם קיימת)
    const customerGroup = user?.customerGroupId as any;
    
    // 🚀 Performance: לוגים רק ב-development למניעת האטה בפרודקשן
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('💰 PricingService.calculatePriceForUser:', {
        productId: productId,
        userId: userId || 'guest',
        basePrice: product.basePrice,
        hasCustomerGroup: !!customerGroup,
        customerGroup: customerGroup ? {
          name: customerGroup.name,
          discountPercentage: customerGroup.discountPercentage,
          isActive: customerGroup.isActive
        } : null
      });
    }
    
    if (customerGroup && customerGroup.isActive && customerGroup.discountPercentage > 0) {
      const discountAmount = (product.basePrice * customerGroup.discountPercentage) / 100;

      // חישוב המחיר הסופי - תמיד מיושם
      result.finalPrice = product.basePrice - discountAmount;
      
      // בדיקה: האם להציג ללקוח שיש הנחה?
      // אם showOriginalPrice === false, הלקוח לא יידע שהוא מקבל הנחה
      const shouldShowDiscount = customerGroup.showOriginalPrice !== false;
      
      if (shouldShowDiscount) {
        // מצב רגיל - להציג את ההנחה ללקוח
        result.discountPercentage = customerGroup.discountPercentage;
        result.customerGroupName = customerGroup.name;
        result.hasDiscount = true;
        
        // 🚀 Performance: לוגים רק ב-development
        if (isDev) {
          console.log('✅ Discount applied (visible to customer):', {
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            discountAmount: discountAmount,
            finalPrice: result.finalPrice
          });
        }
      } else {
        // מצב "הנחה שקטה" - הלקוח לא יודע שהוא מקבל הנחה
        // המחיר הסופי כבר חושב, אבל לא נחשוף את המידע
        result.originalPrice = result.finalPrice; // המחיר "המקורי" = המחיר הסופי
        result.hasDiscount = false; // נסתיר את העובדה שיש הנחה
        // לא נשלח discountPercentage או customerGroupName
        
        // 🚀 Performance: לוגים רק ב-development
        if (isDev) {
          console.log('✅ Silent discount applied (hidden from customer):', {
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            discountAmount: discountAmount,
            finalPrice: result.finalPrice,
            showOriginalPrice: false
          });
        }
      }
    } else if (customerGroup && isDev) {
      // 🚀 Performance: לוג רק ב-development
      console.log('⚠️ Customer group exists but discount not applied:', {
        isActive: customerGroup.isActive,
        discountPercentage: customerGroup.discountPercentage
      });
    }

    // שלב 5: עיגול המחיר לשני מקומות אחרי הנקודה
    result.finalPrice = Math.round(result.finalPrice * 100) / 100;

    return result;
  }

  /**
   * מחשב מחירים עבור מספר מוצרים בבת אחת (לדפי רשימות)
   * @param productIds - מערך מזהי מוצרים
   * @param userId - מזהה המשתמש (אופציונלי)
   * @returns מערך תוצאות חישוב מחיר
   */
  async calculatePricesForProducts(
    productIds: string[],
    userId?: string,
    productDocs?: Array<ProductLike | Record<string, any>>
  ): Promise<PriceCalculationResult[]> {
    
    // חישוב מחיר לכל מוצר במקביל לביצועים טובים יותר
    const docsById = new Map<string, ProductLike | Record<string, any>>();
    if (productDocs) {
      productDocs.forEach((doc) => {
        const raw = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
        if (raw && raw._id) {
          docsById.set(raw._id.toString(), raw);
        }
      });
    }

    let userDoc: Record<string, any> | null = null;
    if (userId) {
      const loadedUser = await User.findById(userId)
        .populate('customerGroupId')
        .lean(); // lean לצורך שימוש חוזר בנתוני המשתמש ללא תקורה
      userDoc = loadedUser as any;
    }

    const pricePromises = productIds.map((productId) =>
      this.calculatePriceForUser(productId, userId, docsById.get(productId), userDoc)
    );

    return Promise.all(pricePromises);
  }
}

// ייצוא יחיד של המחלקה
export default new PricingService();
