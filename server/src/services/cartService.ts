import Cart, { ICart, ICartItem } from '../models/Cart';
import Product from '../models/Product';
import Sku, { ISku } from '../models/Sku';
import User from '../models/User';
import FilterAttribute from '../models/FilterAttribute';
import mongoose from 'mongoose';

// קבועים לחישובים
// Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
const FREE_SHIPPING_THRESHOLD = 200; // משלוח חינם מעל 200₪
const SHIPPING_COST = 30; // עלות משלוח רגילה 30₪

// טיפוס תמציתי להחזרת נתוני מחיר בסיסיים מהמוצר ללא יצירת Document כבד
type ProductPricingSnapshot = {
  _id: mongoose.Types.ObjectId;
  basePrice: number;
  name?: string;
  subtitle?: string; // שם משני של המוצר
  categoryId?: mongoose.Types.ObjectId;
  images?: { thumbnail: string; medium: string; large: string }[]; // תמונות המוצר - fallback כשאין תמונות ב-SKU
};

// טיפוס למידע הנחת קבוצת לקוח
interface CustomerGroupPricing {
  originalPrice: number;      // מחיר מקורי (לפני הנחה)
  finalPrice: number;         // מחיר סופי (אחרי הנחה)
  discountPercentage: number; // אחוז ההנחה
  customerGroupName?: string; // שם הקבוצה
  hasDiscount: boolean;       // האם יש הנחה
}

/**
 * שירות לניהול סלי קניות
 */
class CartService {
  /**
   * חישוב מחיר עם הנחת קבוצת לקוח
   * מחזיר את המחיר הסופי, המחיר המקורי, ואחוז ההנחה
   * @param basePrice - מחיר בסיס (SKU.price או Product.basePrice)
   * @param userId - מזהה המשתמש (אופציונלי)
   */
  async calculatePriceWithGroupDiscount(
    basePrice: number,
    userId?: mongoose.Types.ObjectId
  ): Promise<CustomerGroupPricing> {
    const result: CustomerGroupPricing = {
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountPercentage: 0,
      hasDiscount: false
    };

    // אם אין userId, אין הנחה
    if (!userId) {
      return result;
    }

    try {
      // שליפת המשתמש עם קבוצת הלקוח שלו
      const user = await User.findById(userId)
        .populate('customerGroupId')
        .lean();

      if (!user || !user.customerGroupId) {
        return result;
      }

      const customerGroup = user.customerGroupId as any;

      // בדיקה שהקבוצה פעילה ויש לה הנחה
      if (customerGroup && customerGroup.isActive && customerGroup.discountPercentage > 0) {
        const discountAmount = (basePrice * customerGroup.discountPercentage) / 100;
        result.finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;
        
        // בדיקה: האם להציג ללקוח שיש הנחה?
        // אם showOriginalPrice === false, הלקוח לא יידע שהוא מקבל הנחה
        const shouldShowDiscount = customerGroup.showOriginalPrice !== false;
        
        if (shouldShowDiscount) {
          // מצב רגיל - להציג את ההנחה ללקוח
          result.discountPercentage = customerGroup.discountPercentage;
          result.customerGroupName = customerGroup.name;
          result.hasDiscount = true;

          console.log('🛒 Cart: Customer group discount applied (visible):', {
            userId: userId.toString(),
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            originalPrice: basePrice,
            finalPrice: result.finalPrice
          });
        } else {
          // מצב "הנחה שקטה" - הלקוח לא יודע שהוא מקבל הנחה
          // המחיר הסופי כבר חושב, אבל לא נחשוף את המידע
          result.originalPrice = result.finalPrice; // המחיר "המקורי" = המחיר הסופי
          result.hasDiscount = false; // נסתיר את העובדה שיש הנחה
          // לא נשלח discountPercentage או customerGroupName

          console.log('🛒 Cart: Silent discount applied (hidden from customer):', {
            userId: userId.toString(),
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            originalPrice: basePrice,
            finalPrice: result.finalPrice,
            showOriginalPrice: false
          });
        }
      }
    } catch (error) {
      console.error('שגיאה בחישוב הנחת קבוצה:', error);
      // במקרה של שגיאה, החזר מחיר ללא הנחה
    }

    return result;
  }

  /**
   * חישוב סכום ביניים (לפני מס ומשלוח)
   */
  calculateSubtotal(items: ICartItem[]): number {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  /**
   * חישוב מע"מ
   * Phase 4.2: מע"מ כלול במחיר - מחזירים 0
   */
  calculateTax(_subtotal: number): number {
    return 0; // Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
  }

  /**
   * חישוב עלות משלוח
   */
  calculateShipping(subtotal: number): number {
    // משלוח חינם מעל הסף
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  }

  /**
   * חישוב מחיר סופי
   */
  calculateTotalPrice(subtotal: number, tax: number, shipping: number, discount: number): number {
    const total = subtotal + tax + shipping - discount;
    return Math.max(0, Math.round(total * 100) / 100); // לא יכול להיות שלילי
  }

  /**
   * עדכון כל החישובים בסל
   * Phase 3.2: עובד עם SKU Collection בלבד
   */
  async recalculateCart(cart: ICart): Promise<ICart> {
    // חישוב subtotal לכל פריט
    for (const item of cart.items) {
      item.subtotal = Math.round(item.price * item.quantity * 100) / 100;
      
      // עדכון מלאי ומחיר מ-SKU Collection (Phase 3.2)
      try {
        if (!item.sku) {
          console.warn(`פריט ${item.name} ללא SKU - מדלג`);
          item.availableStock = 0;
          continue;
        }

        // שליפת SKU מה-SKU Collection
  const skuDoc = await Sku.findOne({ sku: item.sku, productId: item.productId }).lean<ISku>();
        
        if (!skuDoc || !skuDoc.isActive) {
          console.warn(`SKU ${item.sku} לא נמצא או לא פעיל`);
          item.availableStock = 0;
        } else {
          // שליפת המוצר לקבלת basePrice + תמונות (לרענון)
          const product = await Product.findById(item.productId)
            .select('basePrice images')
            .lean<ProductPricingSnapshot>();
          if (!product) {
            console.warn(`מוצר ${item.productId} לא נמצא`);
            item.availableStock = 0;
            continue;
          }

          // Base Price + Override Pattern - מחיר בסיס לפני הנחה
          const effectivePrice = skuDoc.price ?? product.basePrice;

          // עדכון מלאי זמין מ-SKU Collection
          item.availableStock = skuDoc.stockQuantity;
          
          // אימות מחיר - חישוב הנחת קבוצת לקוח מחדש
          // חשוב! משווה ל-effectivePrice (מחיר בסיס) ולא ל-item.price (שכבר כולל הנחה)
          const pricingResult = await this.calculatePriceWithGroupDiscount(
            effectivePrice,
            cart.userId
          );
          
          // בדיקה אם המחיר הסופי השתנה (שינוי במחיר בסיס או בהנחת הקבוצה)
          if (Math.abs(item.price - pricingResult.finalPrice) > 0.01) {
            console.log(`מחיר ${item.name} עודכן מ-${item.price} ל-${pricingResult.finalPrice}`);
            item.price = pricingResult.finalPrice;
            item.subtotal = Math.round(pricingResult.finalPrice * item.quantity * 100) / 100;
          }
          
          // עדכון מידע ההנחה על הפריט (לתצוגה בצד הלקוח)
          item.originalPrice = pricingResult.originalPrice;
          item.discountPercentage = pricingResult.discountPercentage;
          item.customerGroupName = pricingResult.customerGroupName;

          // רענון תמונה מ-SKU או מהמוצר (למקרה שהתמונה השתנתה או הייתה ריקה)
          const freshImage = skuDoc.images && skuDoc.images.length > 0
            ? (typeof skuDoc.images[0] === 'string' ? skuDoc.images[0] : skuDoc.images[0].medium)
            : (product.images && product.images.length > 0 ? product.images[0].medium : '');
          if (freshImage && freshImage !== item.image) {
            item.image = freshImage;
          }
        }
      } catch (e) {
        console.error('שגיאה בעדכון פריט:', e);
        item.availableStock = 0;
      }
    }

    // חישוב סכומים כוללים
    cart.subtotal = this.calculateSubtotal(cart.items);
    cart.tax = this.calculateTax(cart.subtotal);
    cart.shippingCost = this.calculateShipping(cart.subtotal);
    
    // חישוב מחיר סופי
    cart.totalPrice = this.calculateTotalPrice(
      cart.subtotal,
      cart.tax,
      cart.shippingCost,
      cart.discount
    );

    return cart;
  }

  /**
   * קבלת סל או יצירת חדש
   */
  async getOrCreateCart(userId?: mongoose.Types.ObjectId, sessionId?: string): Promise<ICart> {
    let cart: ICart | null = null;

    // חיפוש סל קיים
    if (userId) {
      cart = await Cart.findOne({ userId, status: 'active' });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId, status: 'active' });
    }

    // יצירת סל חדש אם לא נמצא
    if (!cart) {
      cart = new Cart({
        userId,
        sessionId,
        items: [],
        status: 'active',
      });
      await cart.save();
    }

    return cart;
  }

  /**
   * הוספת פריט לסל
   * Phase 3.2: עובד עם SKU Collection בלבד
   * Phase 4.0: תמיכה בהנחת קבוצת לקוחות
   * @param skuCode - קוד SKU של הפריט (חובה)
   */
  async addItem(
    cart: ICart,
    productId: mongoose.Types.ObjectId,
    quantity: number,
    skuCode: string // Phase 3.2: SKU הוא חובה עכשיו
  ): Promise<ICart> {
    // Phase 3.2: בדיקת SKU חובה
    if (!skuCode) {
      throw new Error('SKU חסר - נדרש לבחירת המוצר');
    }

    // שליפת SKU מה-SKU Collection
  const skuDoc = await Sku.findOne({ sku: skuCode, productId }).lean<ISku>();
    if (!skuDoc) {
      throw new Error('SKU לא נמצא במערכת');
    }

    if (!skuDoc.isActive) {
      throw new Error('SKU זה אינו זמין כרגע');
    }

    // בדיקת מלאי מ-SKU Collection (Phase 3.2)
    if (skuDoc.stockQuantity < quantity) {
      throw new Error(`במלאי יש רק ${skuDoc.stockQuantity} יחידות`);
    }

    // שליפת מוצר בסיסי (לשם, קטגוריה, basePrice, secondaryVariantAttribute, subtitle, תמונות)
    const product = await Product.findById(productId)
      .select('name subtitle categoryId basePrice secondaryVariantAttribute images')
      .lean<ProductPricingSnapshot & { secondaryVariantAttribute?: string | null }>();
    if (!product) {
      throw new Error('המוצר לא נמצא');
    }
    
    // Base Price + Override Pattern: נשתמש ב-SKU price אם קיים, אחרת ב-basePrice
    const baseEffectivePrice = skuDoc.price ?? product.basePrice;

    // Phase 4.0: חישוב מחיר עם הנחת קבוצת לקוח
    const pricingResult = await this.calculatePriceWithGroupDiscount(
      baseEffectivePrice,
      cart.userId as mongoose.Types.ObjectId | undefined
    );

    // Phase 3.2: בדיקה אם המוצר כבר קיים בסל (לפי SKU בלבד)
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId.toString() && 
      item.sku === skuCode
    );

    if (existingItemIndex !== -1) {
      // עדכון כמות של פריט קיים
      const existingItem = cart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      // Phase 3.2: בדיקת מלאי מ-SKU Collection
      if (skuDoc.stockQuantity < newQuantity) {
        throw new Error(`במלאי יש רק ${skuDoc.stockQuantity} יחידות`);
      }

      existingItem.quantity = newQuantity;
      // Phase 4.0: שימוש במחיר הסופי (אחרי הנחת קבוצה)
      existingItem.price = pricingResult.finalPrice;
      existingItem.originalPrice = pricingResult.hasDiscount ? pricingResult.originalPrice : undefined;
      existingItem.discountPercentage = pricingResult.hasDiscount ? pricingResult.discountPercentage : undefined;
      existingItem.customerGroupName = pricingResult.customerGroupName;
      existingItem.subtotal = Math.round(pricingResult.finalPrice * newQuantity * 100) / 100;
      existingItem.availableStock = skuDoc.stockQuantity;
      // עדכון שם משני אם קיים במוצר (למקרה שנוסף לפני שהיה)
      if (product.subtitle && !existingItem.subtitle) {
        existingItem.subtitle = product.subtitle;
      }
      // עדכון variant משדות שטוחים (color) ו-attributes + מאפיין משני
      if (skuDoc.color || skuDoc.attributes?.size || product.secondaryVariantAttribute) {
        const secondaryAttr = product.secondaryVariantAttribute;
        const secondaryVal = secondaryAttr && skuDoc.attributes?.[secondaryAttr];
        
        // שליפת שם המאפיין מ-FilterAttribute (אם קיים)
        let secondaryAttrName: string | undefined;
        if (secondaryAttr) {
          const filterAttr = await FilterAttribute.findOne({ key: secondaryAttr }).lean();
          secondaryAttrName = filterAttr?.name;
        }
        
        existingItem.variant = {
          color: skuDoc.color,
          size: skuDoc.attributes?.size,
          name: skuDoc.name, // שם הווריאנט המלא
          secondaryAttribute: secondaryAttr || undefined,
          secondaryAttributeName: secondaryAttrName,
          secondaryValue: secondaryVal || undefined,
        };
      }
    } else {
      // Phase 3.2: הוספת פריט חדש מ-SKU Collection
      // המרת IImage ל-URL string (סל צריך רק URL)
      // עדיפות: תמונת SKU > תמונת המוצר > מחרוזת ריקה
      const itemImage = skuDoc.images && skuDoc.images.length > 0 
        ? (typeof skuDoc.images[0] === 'string' ? skuDoc.images[0] : skuDoc.images[0].medium)
        : (product.images && product.images.length > 0 ? product.images[0].medium : '');

      // שם המוצר הראשי - לא שם הווריאנט
      const itemName = product.name || skuDoc.name || skuDoc.sku;
      // שם משני של המוצר (אם קיים)
      const itemSubtitle = product.subtitle;

      // Phase 4.0: פריט חדש עם הנחת קבוצה
      const newItem: ICartItem = {
        productId,
        name: itemName,
        subtitle: itemSubtitle, // שם משני
        price: pricingResult.finalPrice,
        originalPrice: pricingResult.hasDiscount ? pricingResult.originalPrice : undefined,
        discountPercentage: pricingResult.hasDiscount ? pricingResult.discountPercentage : undefined,
        customerGroupName: pricingResult.customerGroupName,
        quantity,
        image: itemImage,
        subtotal: Math.round(pricingResult.finalPrice * quantity * 100) / 100,
        sku: skuCode,
        availableStock: skuDoc.stockQuantity,
        variant: await (async () => {
          const secondaryAttr = product.secondaryVariantAttribute;
          const secondaryVal = secondaryAttr && skuDoc.attributes?.[secondaryAttr];
          
          // שליפת שם המאפיין מ-FilterAttribute (אם קיים)
          let secondaryAttrName: string | undefined;
          if (secondaryAttr) {
            const filterAttr = await FilterAttribute.findOne({ key: secondaryAttr }).lean();
            secondaryAttrName = filterAttr?.name;
          }
          
          return (skuDoc.color || skuDoc.attributes?.size || secondaryAttr) ? {
            color: skuDoc.color,
            size: skuDoc.attributes?.size,
            name: skuDoc.name, // שם הווריאנט המלא
            secondaryAttribute: secondaryAttr || undefined,
            secondaryAttributeName: secondaryAttrName,
            secondaryValue: secondaryVal || undefined,
          } : undefined;
        })(),
      };

      cart.items.push(newItem as any);
    }

    // חישוב מחדש של הסל
    cart = await this.recalculateCart(cart);
    await cart.save();

    return cart;
  }

  /**
   * עדכון כמות של פריט
   * Phase 3.2: עובד עם SKU Collection בלבד
   * Phase 4.0: תמיכה בהנחת קבוצת לקוחות
   */
  async updateItemQuantity(
    cart: ICart,
    itemId: string,
    quantity: number
  ): Promise<ICart> {
    // מציאת הפריט
    const item = cart.items.find(i => i._id?.toString() === itemId);
    if (!item) {
      throw new Error('הפריט לא נמצא בסל');
    }

    // Phase 3.2: בדיקת SKU
    if (!item.sku) {
      throw new Error('פריט ללא SKU - לא ניתן לעדכן');
    }

    // שליפת SKU מה-SKU Collection
  const skuDoc = await Sku.findOne({ sku: item.sku, productId: item.productId }).lean<ISku>();
    if (!skuDoc || !skuDoc.isActive) {
      throw new Error('SKU לא נמצא או לא פעיל');
    }

    // שליפת המוצר לקבלת basePrice
    const product = await Product.findById(item.productId)
      .select('basePrice')
      .lean<ProductPricingSnapshot>();
    if (!product) {
      throw new Error('המוצר לא נמצא');
    }

    // Base Price + Override Pattern
    const baseEffectivePrice = skuDoc.price ?? product.basePrice;

    // Phase 4.0: חישוב מחיר עם הנחת קבוצת לקוח
    const pricingResult = await this.calculatePriceWithGroupDiscount(
      baseEffectivePrice,
      cart.userId as mongoose.Types.ObjectId | undefined
    );

    // בדיקת מלאי מ-SKU Collection
    if (skuDoc.stockQuantity < quantity) {
      throw new Error(`במלאי יש רק ${skuDoc.stockQuantity} יחידות`);
    }

    // עדכון הכמות והמחיר עם הנחת קבוצה
    item.quantity = quantity;
    item.price = pricingResult.finalPrice;
    item.originalPrice = pricingResult.hasDiscount ? pricingResult.originalPrice : undefined;
    item.discountPercentage = pricingResult.hasDiscount ? pricingResult.discountPercentage : undefined;
    item.customerGroupName = pricingResult.customerGroupName;
    item.subtotal = Math.round(pricingResult.finalPrice * quantity * 100) / 100;
    item.availableStock = skuDoc.stockQuantity;
    // עדכון variant משדות שטוחים (color) ו-attributes.size
    if (skuDoc.color || skuDoc.attributes?.size) {
      item.variant = {
        color: skuDoc.color,
        size: skuDoc.attributes?.size,
      };
    }

    // חישוב מחדש של הסל
    cart = await this.recalculateCart(cart);
    await cart.save();

    return cart;
  }

  /**
   * הסרת פריט מהסל
   */
  async removeItem(cart: ICart, itemId: string): Promise<ICart> {
    // סינון הפריט
    cart.items = cart.items.filter(item => item._id?.toString() !== itemId);

    // חישוב מחדש של הסל
    cart = await this.recalculateCart(cart);
    await cart.save();

    return cart;
  }

  /**
   * ניקוי הסל
   */
  async clearCart(cart: ICart): Promise<ICart> {
    cart.items = [];
    cart.subtotal = 0;
    cart.tax = 0;
    cart.shippingCost = 0;
    cart.discount = 0;
    cart.totalPrice = 0;
    cart.coupon = undefined;

    await cart.save();
    return cart;
  }

  /**
   * סימון סל כנטוש
   */
  async markAsAbandoned(cartId: mongoose.Types.ObjectId): Promise<void> {
    await Cart.findByIdAndUpdate(cartId, { status: 'abandoned' });
  }

  /**
   * מיזוג סלים (אורח → משתמש רשום)
   * Phase 3.2: השוואה לפי SKU בלבד, בדיקת מלאי מ-SKU Collection
   */
  async mergeCarts(
    userCart: ICart,
    guestCart: ICart
  ): Promise<ICart> {
    // מעבר על כל הפריטים בסל האורח
    for (const guestItem of guestCart.items) {
      // Phase 3.2: השוואה לפי SKU בלבד
      if (!guestItem.sku) {
        console.warn(`פריט ${guestItem.name} ללא SKU - מדלג במיזוג`);
        continue;
      }

      // בדיקה אם הפריט כבר קיים בסל המשתמש (לפי SKU בלבד)
      const existingItemIndex = userCart.items.findIndex(item =>
        item.productId.toString() === guestItem.productId.toString() &&
        item.sku === guestItem.sku
      );

      if (existingItemIndex !== -1) {
        // חיבור כמויות
        const existingItem = userCart.items[existingItemIndex];
        const targetQuantity = existingItem.quantity + guestItem.quantity;
        
        // Phase 3.2: בדוק מלאי זמין מ-SKU Collection
        try {
          const skuDoc = await Sku.findOne({ sku: guestItem.sku }).lean<ISku>();
          const maxStock = skuDoc ? skuDoc.stockQuantity : 0;
          
          if (targetQuantity > maxStock) {
            // הגבל לכמות מקסימלית
            console.warn(`מיזוג: ${guestItem.name} - מלאי לא מספיק (${targetQuantity} > ${maxStock})`);
            existingItem.quantity = maxStock;
          } else {
            existingItem.quantity = targetQuantity;
          }
          
          // עדכן מחיר עם הנחת קבוצת לקוח
          if (skuDoc) {
            // שליפת המוצר לקבלת basePrice
            const product = await Product.findById(guestItem.productId)
              .select('basePrice')
              .lean<ProductPricingSnapshot>();
            const effectivePrice = product ? (skuDoc.price ?? product.basePrice) : skuDoc.price ?? 0;
            
            // חישוב הנחת קבוצה עבור המשתמש המחובר
            const pricingResult = await this.calculatePriceWithGroupDiscount(
              effectivePrice,
              userCart.userId
            );
            
            existingItem.price = pricingResult.finalPrice;
            existingItem.originalPrice = pricingResult.originalPrice;
            existingItem.discountPercentage = pricingResult.discountPercentage;
            existingItem.customerGroupName = pricingResult.customerGroupName;
            existingItem.subtotal = Math.round(pricingResult.finalPrice * existingItem.quantity * 100) / 100;
            existingItem.availableStock = skuDoc.stockQuantity;
          }
        } catch (error) {
          console.error(`שגיאה בבדיקת מלאי ל-${guestItem.sku}:`, error);
          // המשך לפריט הבא
        }
      } else {
        // Phase 3.2: פריט לא קיים - הוסף אותו (אחרי בדיקת מלאי)
        try {
          const skuDoc = await Sku.findOne({ sku: guestItem.sku }).lean<ISku>();
          const maxStock = skuDoc ? skuDoc.stockQuantity : 0;
          
          if (guestItem.quantity > maxStock) {
            console.warn(`מיזוג: ${guestItem.name} - מגביל כמות ל-${maxStock}`);
            guestItem.quantity = maxStock;
          }
          
          // עדכן מחיר מ-SKU Collection עם הנחת קבוצה
          if (skuDoc && skuDoc.isActive) {
            // שליפת המוצר לקבלת basePrice
            const product = await Product.findById(guestItem.productId)
              .select('basePrice')
              .lean<ProductPricingSnapshot>();
            const effectivePrice = product ? (skuDoc.price ?? product.basePrice) : skuDoc.price ?? 0;
            
            // חישוב הנחת קבוצה עבור המשתמש המחובר
            const pricingResult = await this.calculatePriceWithGroupDiscount(
              effectivePrice,
              userCart.userId
            );
            
            guestItem.price = pricingResult.finalPrice;
            guestItem.originalPrice = pricingResult.originalPrice;
            guestItem.discountPercentage = pricingResult.discountPercentage;
            guestItem.customerGroupName = pricingResult.customerGroupName;
            guestItem.subtotal = Math.round(pricingResult.finalPrice * guestItem.quantity * 100) / 100;
            guestItem.availableStock = skuDoc.stockQuantity;
            userCart.items.push(guestItem);
          } else {
            console.warn(`SKU ${guestItem.sku} לא פעיל - מדלג במיזוג`);
          }
        } catch (error) {
          console.error(`שגיאה בהוספת פריט ${guestItem.sku}:`, error);
        }
      }
    }

    // חישוב מחדש של הסל
    userCart = await this.recalculateCart(userCart);
    await userCart.save();

    // סימון סל האורח כממוזג
    guestCart.status = 'merged';
    await guestCart.save();

    return userCart;
  }

  /**
   * זיהוי סלים נטושים (לא פעילים ל-15+ דקות)
   */
  async findAbandonedCarts(minutesInactive: number = 15): Promise<ICart[]> {
    const cutoffTime = new Date(Date.now() - minutesInactive * 60 * 1000);
    
    return await Cart.find({
      status: 'active',
      lastActivity: { $lt: cutoffTime },
      'items.0': { $exists: true }, // רק סלים עם פריטים
    }).populate('userId', 'email name');
  }

  /**
   * בדיקת זמינות מלאי לכל הפריטים בסל
   * מחזיר פירוט של כל פריט עם מצב המלאי העדכני
   */
  async validateCartStock(cart: ICart): Promise<StockValidationResult> {
    const items: StockValidationItem[] = [];
    const outOfStockItems: StockValidationItem[] = [];
    const adjustedItems: StockValidationItem[] = [];
    let isValid = true;

    for (const item of cart.items) {
      // בדיקת SKU
      if (!item.sku) {
        const validationItem: StockValidationItem = {
          itemId: item._id?.toString() || '',
          sku: '',
          productId: item.productId.toString(),
          productName: item.name,
          requestedQuantity: item.quantity,
          availableStock: 0,
          isAvailable: false,
          needsAdjustment: true,
        };
        items.push(validationItem);
        outOfStockItems.push(validationItem);
        isValid = false;
        continue;
      }

      // שליפת מלאי עדכני מ-SKU Collection
      const skuDoc = await Sku.findOne({ sku: item.sku, productId: item.productId }).lean<ISku>();
      
      const availableStock = skuDoc?.isActive ? skuDoc.stockQuantity : 0;
      const isAvailable = availableStock > 0;
      const needsAdjustment = item.quantity > availableStock;

      const validationItem: StockValidationItem = {
        itemId: item._id?.toString() || '',
        sku: item.sku,
        productId: item.productId.toString(),
        productName: item.name,
        requestedQuantity: item.quantity,
        availableStock,
        isAvailable,
        needsAdjustment,
      };

      items.push(validationItem);

      // מיון לקטגוריות
      if (!isAvailable) {
        outOfStockItems.push(validationItem);
        isValid = false;
      } else if (needsAdjustment) {
        adjustedItems.push(validationItem);
        isValid = false;
      }
    }

    return {
      isValid,
      items,
      outOfStockItems,
      adjustedItems,
    };
  }

  /**
   * התאמת כמויות בסל לפי המלאי הזמין
   * מעדכן אוטומטית פריטים שהכמות שלהם עולה על המלאי
   */
  async adjustCartQuantities(cart: ICart): Promise<ICart> {
    const validation = await this.validateCartStock(cart);
    
    for (const adjustedItem of validation.adjustedItems) {
      const item = cart.items.find(i => i._id?.toString() === adjustedItem.itemId);
      if (item && adjustedItem.availableStock > 0) {
        item.quantity = adjustedItem.availableStock;
        item.subtotal = Math.round(item.price * item.quantity * 100) / 100;
        item.availableStock = adjustedItem.availableStock;
      }
    }

    // חישוב מחדש של הסל
    cart = await this.recalculateCart(cart);
    await cart.save();

    return cart;
  }

  /**
   * קבלת הזדמנויות שהוחמצו - מוצרים עם מלאי נמוך או אזל שנמצאים בסלי לקוחות
   * מחזיר רשימת מוצרים עם מספר הלקוחות שמחזיקים אותם בסל
   */
  async getMissedOpportunities(): Promise<MissedOpportunityItem[]> {
    // שלב 1: מציאת כל הסלים הפעילים/נטושים עם פריטים
    const activeCarts = await Cart.find({
      status: { $in: ['active', 'abandoned'] },
      'items.0': { $exists: true }
    }).lean();

    if (activeCarts.length === 0) {
      return [];
    }

    // שלב 2: איסוף כל ה-SKUs הייחודיים מהסלים
    const skuToCartsMap = new Map<string, Set<string>>();
    const skuToProductMap = new Map<string, {
      productId: string;
      productName: string;
      price: number;
      image: string;
    }>();

    for (const cart of activeCarts) {
      const cartIdentifier = cart.userId?.toString() || cart.sessionId || cart._id.toString();
      
      for (const item of cart.items) {
        if (!item.sku) continue;
        
        // הוספת הסל לרשימת הסלים שמכילים את ה-SKU
        if (!skuToCartsMap.has(item.sku)) {
          skuToCartsMap.set(item.sku, new Set());
        }
        skuToCartsMap.get(item.sku)!.add(cartIdentifier);
        
        // שמירת פרטי המוצר (פעם אחת)
        if (!skuToProductMap.has(item.sku)) {
          skuToProductMap.set(item.sku, {
            productId: item.productId.toString(),
            productName: item.name,
            price: item.price,
            image: item.image
          });
        }
      }
    }

    // שלב 3: בדיקת מלאי לכל ה-SKUs
    const skuCodes = Array.from(skuToCartsMap.keys());
    const skuDocs = await Sku.find({ sku: { $in: skuCodes } })
      .select('sku stockQuantity productId')
      .populate('productId', 'lowStockThreshold')
      .lean();

    // יצירת מפה של SKU -> מלאי
    const skuStockMap = new Map<string, number>();
    const skuThresholdMap = new Map<string, number>();
    
    for (const skuDoc of skuDocs) {
      skuStockMap.set(skuDoc.sku, skuDoc.stockQuantity);
      const threshold = (skuDoc.productId as any)?.lowStockThreshold || 5;
      skuThresholdMap.set(skuDoc.sku, threshold);
    }

    // שלב 4: סינון רק מוצרים עם מלאי נמוך או אזל
    const missedOpportunities: MissedOpportunityItem[] = [];

    for (const [sku, cartIds] of skuToCartsMap.entries()) {
      const stock = skuStockMap.get(sku) ?? 0;
      const threshold = skuThresholdMap.get(sku) ?? 5;
      
      // רק אם המלאי נמוך או אזל
      if (stock <= threshold) {
        const productInfo = skuToProductMap.get(sku);
        if (!productInfo) continue;

        const customersCount = cartIds.size;
        const potentialValue = productInfo.price * customersCount;
        
        missedOpportunities.push({
          sku,
          productId: productInfo.productId,
          productName: productInfo.productName,
          price: productInfo.price,
          image: productInfo.image,
          stockQuantity: stock,
          customersCount,
          potentialValue,
          reason: stock === 0 ? 'אזל המלאי' : 'מלאי נמוך'
        });
      }
    }

    // מיון לפי פוטנציאל מכירות (מהגבוה לנמוך)
    missedOpportunities.sort((a, b) => b.potentialValue - a.potentialValue);

    // החזרת עד 5 הזדמנויות המשמעותיות ביותר
    return missedOpportunities.slice(0, 5);
  }
}

// ממשק להזדמנות שהוחמצה
export interface MissedOpportunityItem {
  sku: string;              // קוד SKU
  productId: string;        // מזהה המוצר
  productName: string;      // שם המוצר
  price: number;            // מחיר
  image: string;            // תמונה
  stockQuantity: number;    // כמות במלאי
  customersCount: number;   // מספר לקוחות שמחזיקים בסל
  potentialValue: number;   // ערך פוטנציאלי (מחיר * לקוחות)
  reason: string;           // סיבה (אזל המלאי / מלאי נמוך)
}

// ממשקים לתוצאת בדיקת מלאי
export interface StockValidationItem {
  itemId: string;           // מזהה הפריט בסל
  sku: string;              // קוד SKU
  productId: string;        // מזהה המוצר
  productName: string;      // שם המוצר
  requestedQuantity: number; // הכמות שהלקוח רוצה
  availableStock: number;   // המלאי הזמין בפועל
  isAvailable: boolean;     // האם זמין (מלאי > 0)
  needsAdjustment: boolean; // האם צריך להתאים את הכמות
}

export interface StockValidationResult {
  isValid: boolean;         // האם כל הפריטים זמינים בכמות המבוקשת
  items: StockValidationItem[];
  outOfStockItems: StockValidationItem[];    // פריטים שאזלו לגמרי
  adjustedItems: StockValidationItem[];      // פריטים שהכמות שלהם צריכה לרדת
}

export default new CartService();
