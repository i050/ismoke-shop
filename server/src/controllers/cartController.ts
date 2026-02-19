import { Request, Response } from 'express';
import cartService from '../services/cartService';
import mongoose from 'mongoose';

/**
 * Controller לניהול סל קניות
 */

/**
 * GET /api/cart - קבלת סל קניות
 * מחזיר סל קיים או יוצר חדש
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

  // קבלת או יצירת סל
  let cart = await cartService.getOrCreateCart(userId, sessionId);
  // עדכון חישובים ומלאי זמין לפני ההחזרה ללקוח
  cart = await cartService.recalculateCart(cart);

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בקבלת סל:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת סל הקניות',
      error: error.message,
    });
  }
};

/**
 * GET /api/cart/validate-stock - בדיקת זמינות מלאי לכל הפריטים בסל
 * מחזיר פירוט של כל פריט עם מצב המלאי העדכני
 */
export const validateCartStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);
    
    // עדכון מלאי לפני הבדיקה
    cart = await cartService.recalculateCart(cart);
    
    // בדיקת מלאי
    const validation = await cartService.validateCartStock(cart);

    res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    console.error('שגיאה בבדיקת מלאי סל:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת זמינות מלאי',
      error: error.message,
    });
  }
};

/**
 * POST /api/cart/adjust-quantities - התאמת כמויות בסל לפי מלאי זמין
 * מעדכן אוטומטית פריטים שהכמות שלהם עולה על המלאי
 */
export const adjustCartQuantities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);
    
    // התאמת כמויות
    cart = await cartService.adjustCartQuantities(cart);
    
    // בדיקת מלאי אחרי ההתאמה
    const validation = await cartService.validateCartStock(cart);

    res.status(200).json({
      success: true,
      message: 'הכמויות הותאמו בהצלחה',
      data: {
        cart,
        validation,
      },
    });
  } catch (error: any) {
    console.error('שגיאה בהתאמת כמויות:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהתאמת כמויות בסל',
      error: error.message,
    });
  }
};

/**
 * POST /api/cart/items - הוספת פריט לסל
 * Phase 3.3: Body חייב לכלול { productId, quantity, sku }
 */
export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity, sku } = req.body;

    // Phase 3.3: ולידציה - SKU הוא חובה עכשיו
    if (!productId || !quantity || !sku) {
      res.status(400).json({
        success: false,
        message: 'חסרים שדות חובה: productId, quantity, sku',
      });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({
        success: false,
        message: 'הכמות חייבת להיות לפחות 1',
      });
      return;
    }

    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);

    // Phase 3.3: הוספת הפריט עם SKU
    cart = await cartService.addItem(
      cart,
      new mongoose.Types.ObjectId(productId),
      quantity,
      sku
    );

    res.status(201).json({
      success: true,
      message: 'המוצר נוסף לסל בהצלחה',
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בהוספת פריט לסל:', error);
    
    // שגיאות ידועות
    if (error.message.includes('לא נמצא') || error.message.includes('במלאי') || error.message.includes('SKU')) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה בהוספת פריט לסל',
      error: error.message,
    });
  }
};

/**
 * PUT /api/cart/items/:itemId/variant - שינוי וריאנט (SKU) של פריט בסל
 * Body: { sku } - קוד ה-SKU החדש
 */
export const changeItemVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { sku } = req.body;

    // ולידציה - קוד SKU חדש הוא חובה
    if (!sku) {
      res.status(400).json({
        success: false,
        message: 'חסר קוד SKU חדש',
      });
      return;
    }

    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);

    // שינוי הווריאנט
    cart = await cartService.changeItemVariant(cart, itemId, sku);

    res.status(200).json({
      success: true,
      message: 'הווריאנט עודכן בהצלחה',
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בשינוי וריאנט:', error);

    // שגיאות ידועות (400)
    if (
      error.message.includes('לא נמצא') ||
      error.message.includes('במלאי') ||
      error.message.includes('SKU') ||
      error.message.includes('אינו זמין') ||
      error.message.includes('אזל')
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה בשינוי וריאנט',
      error: error.message,
    });
  }
};

/**
 * PUT /api/cart/items/:itemId - עדכון כמות פריט
 * Body: { quantity }
 */
export const updateItemQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // ולידציה
    if (!quantity || quantity < 1) {
      res.status(400).json({
        success: false,
        message: 'הכמות חייבת להיות לפחות 1',
      });
      return;
    }

    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);

    // עדכון הכמות
    cart = await cartService.updateItemQuantity(cart, itemId, quantity);

    res.status(200).json({
      success: true,
      message: 'הכמות עודכנה בהצלחה',
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בעדכון כמות:', error);
    
    if (error.message.includes('לא נמצא') || error.message.includes('במלאי')) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון כמות',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/cart/items/:itemId - הסרת פריט מהסל
 */
export const removeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);

    // הסרת הפריט
    cart = await cartService.removeItem(cart, itemId);

    res.status(200).json({
      success: true,
      message: 'הפריט הוסר מהסל בהצלחה',
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בהסרת פריט:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהסרת פריט מהסל',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/cart - ניקוי הסל
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

    // קבלת הסל
    let cart = await cartService.getOrCreateCart(userId, sessionId);

    // ניקוי הסל
    cart = await cartService.clearCart(cart);

    res.status(200).json({
      success: true,
      message: 'הסל נוקה בהצלחה',
      data: cart,
    });
  } catch (error: any) {
    console.error('שגיאה בניקוי סל:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בניקוי הסל',
      error: error.message,
    });
  }
};

/**
 * POST /api/cart/merge - מיזוג סלים (אורח → משתמש)
 * Body: { guestSessionId }
 */
export const mergeCarts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { guestSessionId } = req.body;
    const userId = req.user?.userId;

    // ולידציה
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'נדרשת התחברות למערכת',
      });
      return;
    }

    if (!guestSessionId) {
      res.status(400).json({
        success: false,
        message: 'חסר מזהה סשן אורח',
      });
      return;
    }

    // קבלת הסלים
    const userCart = await cartService.getOrCreateCart(new mongoose.Types.ObjectId(userId));
    const guestCart = await cartService.getOrCreateCart(undefined, guestSessionId);

    // מיזוג
    const mergedCart = await cartService.mergeCarts(userCart, guestCart);

    res.status(200).json({
      success: true,
      message: 'הסלים מוזגו בהצלחה',
      data: mergedCart,
    });
  } catch (error: any) {
    console.error('שגיאה במיזוג סלים:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה במיזוג סלים',
      error: error.message,
    });
  }
};
