import express from 'express';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  mergeCarts,
  validateCartStock,
  adjustCartQuantities,
} from '../controllers/cartController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * נתיבי API לסל קניות
 * משתמש ב-optionalAuthMiddleware כדי לתמוך גם במשתמשים מחוברים וגם באורחים
 */

// GET /api/cart - קבלת סל קניות
router.get('/', optionalAuthMiddleware, getCart);

// GET /api/cart/validate-stock - בדיקת זמינות מלאי
router.get('/validate-stock', optionalAuthMiddleware, validateCartStock);

// POST /api/cart/adjust-quantities - התאמת כמויות לפי מלאי
router.post('/adjust-quantities', optionalAuthMiddleware, adjustCartQuantities);

// POST /api/cart/items - הוספת פריט לסל
router.post('/items', optionalAuthMiddleware, addItem);

// PUT /api/cart/items/:itemId - עדכון כמות פריט
router.put('/items/:itemId', optionalAuthMiddleware, updateItemQuantity);

// DELETE /api/cart/items/:itemId - הסרת פריט מהסל
router.delete('/items/:itemId', optionalAuthMiddleware, removeItem);

// DELETE /api/cart - ניקוי הסל
router.delete('/', optionalAuthMiddleware, clearCart);

// POST /api/cart/merge - מיזוג סלים (דורש התחברות)
router.post('/merge', authMiddleware, mergeCarts);

export default router;
