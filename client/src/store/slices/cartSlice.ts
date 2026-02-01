// CartSlice - ניהול מצב סל הקניות
// מנהל את כל מה שקשור לסל: פריטים, כמויות, מחירים, קופונים

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import cartService from '../../services/cartService';

// ממשקי TypeScript לטיפוסים שלנו

// פריט בסל
// Phase 3.4: עודכן לעבוד עם SKU בלבד
// Phase 4.0: הוספת תמיכה בהנחת קבוצת לקוחות
// Phase 4.1: הוספת isSelected לבחירה סלקטיבית של פריטים לרכישה
export interface CartItem {
  _id?: string;                 // מזהה הפריט בסל
  productId: string;           // מזהה המוצר
  name: string;                // שם המוצר
  subtitle?: string;           // שם משני - מוצג מתחת לשם הראשי
  price: number;               // מחיר ליחידה (אחרי הנחת קבוצה אם יש)
  originalPrice?: number;      // מחיר מקורי לפני הנחת קבוצה
  discountPercentage?: number; // אחוז ההנחה מקבוצת לקוחות
  customerGroupName?: string;  // שם קבוצת הלקוח (להצגה)
  quantity: number;            // כמות
  image: string;               // תמונה ראשית
  sku: string;                 // Phase 3.4: SKU הוא חובה עכשיו (PRIMARY KEY)
  availableStock?: number;     // הכמות הזמינה במלאי (מהשרת)
  subtotal: number;            // סכום ביניים (price * quantity)
  isSelected: boolean;         // Phase 4.1: האם הפריט נבחר לרכישה (ברירת מחדל: true)
  // Phase 3.4: attributes מה-SKU להצגה ב-UI (color, size, name, secondary)
  variant?: {
    color?: string;
    size?: string;
    name?: string;  // שם הווריאנט המלא (לתצוגה)
    secondaryAttribute?: string; // מזהה המאפיין המשני (size/htngdvt_slylym/nicotine) - key טכני
    secondaryAttributeName?: string; // שם המאפיין בעברית ("התנגדות", "מידה") - לתצוגה
    secondaryValue?: string; // ערך המאפיין המשני
  };
}

// קופון
export interface Coupon {
  code: string;                // קוד הקופון
  discountAmount: number;      // סכום ההנחה
  discountType: 'percentage' | 'fixed';  // סוג ההנחה
}

// מבנה הסל המלא
export interface Cart {
  _id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];           // רשימת הפריטים
  subtotal: number;            // סכום ביניים
  tax: number;                 // מע"מ
  shippingCost: number;        // עלות משלוח
  discount: number;            // הנחה
  totalPrice: number;          // מחיר סופי
  coupon?: Coupon;             // קופון מופעל
  status: 'active' | 'abandoned' | 'checkedOut' | 'merged';
  lastActivity?: string;
  createdAt?: string;
  updatedAt?: string;
}

// מצב הסל ב-Redux
interface CartState {
  cart: Cart | null;           // הסל המלא
  isLoading: boolean;          // האם בתהליך טעינה
  error: string | null;        // הודעת שגיאה - שמור/Legacy
  fatalError?: { message: string; status: number } | null; // שגיאה פאטלית להצגה על גבי העמוד
  isMiniCartOpen: boolean;     // האם המיני-קארט פתוח
  updatingItemIds?: string[];  // מזהי פריטים שבתהליך עדכון כמות (לצורך optimistic UI)
  updatingItemErrors?: Record<string, string | null>; // הודעות שגיאה פריט-פריט
  transientErrors?: Array<{ id: string; message: string; status?: number }>; // שגיאות קצרות טווח להציג כ-banner/toast
}

// מצב התחלתי
const initialState: CartState = {
  cart: null,
  isLoading: false,
  error: null,
  isMiniCartOpen: false,
  updatingItemIds: [],
  updatingItemErrors: {},
  transientErrors: [],
  fatalError: null,
};

// עיצוב כללי: קבועים לחישוב (ניתן להזיז למקום מרכזי בשלב מאוחר יותר)
// Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
const FREE_SHIPPING_THRESHOLD = 200;

/**
 * מחשב סכומים מהפריטים
 * Phase 4.2: המחירים כוללים מע"מ - אין חישוב נפרד
 * מקבל את רשימת הפריטים והסל הקודם (לשימוש בשמירת shippingCost קיים)
 */
function computeCartTotals(items: CartItem[], prevCart?: Cart | null) {
  const subtotal = items.reduce((s, it) => s + (it.price * (it.quantity || 0)), 0);
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (prevCart?.shippingCost ?? 0);
  const tax = 0; // Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
  const totalPrice = subtotal + shippingCost - (prevCart?.discount ?? 0);
  return { subtotal, shippingCost, tax, totalPrice };
}

// Async Thunks - פעולות אסינכרוניות שמתקשרות עם השרת
// הן מאפשרות לנו לבצע קריאות API ולעדכן את ה-store בהתאם לתוצאה

/**
 * קבלת הסל מהשרת
 */
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const cart = await cartService.getCart();
      
      // כל הפריטים תמיד נבחרים - הלקוח קונה את כל העגלה
      // פריטים שאזלו מהמלאי עדיין יוצגו בעגלה עם התראה מתאימה
      if (cart && cart.items) {
        cart.items = cart.items.map(item => ({
          ...item,
          isSelected: true
        }));
      }
      
      // שמירה גם ב-localStorage לגיבוי
      cartService.saveLocalCart(cart);
      return cart;
    } catch (error: any) {
      // במקרה של שגיאה מסווגת - אם זו שגיאת לקוח (4xx) נציג אותה כ־transient
      const status = error?.status || 500;
      const message = error?.message || 'שגיאה בטעינת הסל';
      if (status < 500) {
        const id = `err_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dispatch(cartSlice.actions.addTransientError({ id, message, status }));
        setTimeout(() => dispatch(cartSlice.actions.clearTransientError(id)), 3500);
      }
      return rejectWithValue({ message, status });
    }
  }
);

/**
 * הוספת פריט לסל
 * Phase 3.4: עכשיו מקבל SKU במקום variant/variantIndex
 */
export const addItemToCart = createAsyncThunk(
  'cart/addItem',
  async (
    payload: { productId: string; quantity: number; sku: string }, // Phase 3.4: SKU הוא חובה
    { rejectWithValue, dispatch }
  ) => {
    try {
      const cart = await cartService.addItem(
        payload.productId,
        payload.quantity,
        payload.sku // Phase 3.4: שולח SKU
      );
      // שמירה ב-localStorage
      cartService.saveLocalCart(cart);
      return cart;
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'שגיאה בהוספת פריט לסל';
      if (status < 500) {
        // הצג הודעה דיסקרטית בתוך הממשק במקום להפנות לעמוד שגיאה
        const id = `err_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dispatch(cartSlice.actions.addTransientError({ id, message, status }));
        setTimeout(() => dispatch(cartSlice.actions.clearTransientError(id)), 3500);
      }
      return rejectWithValue({ message, status });
    }
  }
);

/**
 * עדכון כמות של פריט
 */
export const updateItemQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async (
    payload: { itemId: string; quantity: number },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const cart = await cartService.updateItemQuantity(
        payload.itemId,
        payload.quantity
      );
      // שמירה ב-localStorage
      cartService.saveLocalCart(cart);
      return cart;
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'שגיאה בעדכון כמות';
      if (status < 500) {
        const id = `err_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dispatch(cartSlice.actions.addTransientError({ id, message, status }));
        setTimeout(() => dispatch(cartSlice.actions.clearTransientError(id)), 3500);
      }
      return rejectWithValue({ message, status });
    }
  }
);

/**
 * Optimistic update thunk - מעדכן מיד את ה־state בצד הלקוח, מבצע קריאה לשרת
 * ואם השרת מחזיר שגיאה - מבצע rollback לכמות הקודמת.
 */
export const updateItemQuantityOptimistic = createAsyncThunk(
  'cart/updateQuantityOptimistic',
  async (
    payload: { itemId: string; quantity: number },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as { cart: CartState };
    const prevItem = state.cart.cart?.items.find(i => i._id === payload.itemId);
    const prevQuantity = prevItem ? prevItem.quantity : 0;

    try {
      // עדכון מקומי מידי (optimistic)
      dispatch(cartSlice.actions.startUpdatingItem(payload.itemId));
      dispatch(cartSlice.actions.setItemQuantityLocal({ itemId: payload.itemId, quantity: payload.quantity }));

      // קריאה לשרת בעדכון הכמות
      const cart = await cartService.updateItemQuantity(payload.itemId, payload.quantity);
      // שמירה ב-localStorage
      cartService.saveLocalCart(cart);

      // סיום מצב עדכון עבור הפריט
      dispatch(cartSlice.actions.finishUpdatingItem(payload.itemId));
      // וודא שאין הודעת שגיאה קיימת עבורו
      dispatch(cartSlice.actions.setUpdatingItemError({ itemId: payload.itemId, message: null }));

      return cart;
    } catch (error: any) {
      // rollback: החזרת הכמות הישנה
      dispatch(cartSlice.actions.setItemQuantityLocal({ itemId: payload.itemId, quantity: prevQuantity }));
      dispatch(cartSlice.actions.finishUpdatingItem(payload.itemId));
      // הצגת הודעת שגיאה פריט-פריט לזמן קצר
      const msg = error?.message || 'שגיאה בעדכון כמות';
      const status = error?.status || (error instanceof Error && (error as any).status) || 500;
      dispatch(cartSlice.actions.setUpdatingItemError({ itemId: payload.itemId, message: msg }));
      // נקה את ההודעה אחרי כמה שניות כדי להראות אותה לזמן קצר
      setTimeout(() => {
        dispatch(cartSlice.actions.setUpdatingItemError({ itemId: payload.itemId, message: null }));
      }, 3500);

      // החזרת מבנה מובנה שיכיל message ו-status כדי שה-extraReducers יחליטו על חומרת השגיאה
      return rejectWithValue({ message: msg, status });
    }
  }
);

/**
 * הסרת פריט מהסל
 */
export const removeItemFromCart = createAsyncThunk(
  'cart/removeItem',
  async (itemId: string, { rejectWithValue, dispatch }) => {
    try {
      const cart = await cartService.removeItem(itemId);
      // שמירה ב-localStorage
      cartService.saveLocalCart(cart);
      return cart;
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'שגיאה בהסרת פריט';
      if (status < 500) {
        const id = `err_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dispatch(cartSlice.actions.addTransientError({ id, message, status }));
        setTimeout(() => dispatch(cartSlice.actions.clearTransientError(id)), 3500);
      }
      return rejectWithValue({ message, status });
    }
  }
);

/**
 * ניקוי הסל
 */
export const clearCart = createAsyncThunk(
  'cart/clear',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const cart = await cartService.clearCart();
      // מחיקת הגיבוי המקומי
      cartService.clearLocalCart();
      return cart;
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'שגיאה בניקוי הסל';
      if (status < 500) {
        const id = `err_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dispatch(cartSlice.actions.addTransientError({ id, message, status }));
        setTimeout(() => dispatch(cartSlice.actions.clearTransientError(id)), 3500);
      }
      return rejectWithValue({ message, status });
    }
  }
);

// יצירת ה-Slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  
  // Reducers סינכרוניים - לשינויים מקומיים במצב
  reducers: {
    /**
     * פתיחת המיני-קארט
     */
    openMiniCart: (state) => {
      state.isMiniCartOpen = true;
    },
    
    /**
     * סגירת המיני-קארט
     */
    closeMiniCart: (state) => {
      state.isMiniCartOpen = false;
    },
    
    /**
     * החלפת מצב המיני-קארט (פתוח/סגור)
     */
    toggleMiniCart: (state) => {
      state.isMiniCartOpen = !state.isMiniCartOpen;
    },
    
    /**
     * איפוס שגיאה
     */
    clearError: (state) => {
      state.error = null;
      state.fatalError = null;
    },
    
    /**
     * הגדרת סל ידנית (למקרי edge cases)
     */
    setCart: (state, action: PayloadAction<Cart>) => {
      state.cart = action.payload;
    },
    /**
     * התחלת עדכון עבור פריט ספציפי (מוסיף את ה-id למערך עדכונים)
     */
    startUpdatingItem: (state, action: PayloadAction<string>) => {
      if (!state.updatingItemIds) state.updatingItemIds = [];
      if (!state.updatingItemIds.includes(action.payload)) {
        state.updatingItemIds.push(action.payload);
      }
    },
    /**
     * סיום עדכון עבור פריט ספציפי (מוציא את ה-id ממערך העדכונים)
     */
    finishUpdatingItem: (state, action: PayloadAction<string>) => {
      state.updatingItemIds = (state.updatingItemIds || []).filter(id => id !== action.payload);
    },
    /**
     * עדכון כמות מקומי (optimistic) - משנה את הכמות ומעדכן סכומים מקומיים
     */
    setItemQuantityLocal: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
      const { itemId, quantity } = action.payload;
      if (!state.cart) return;
      const item = state.cart.items.find(i => i._id === itemId);
      if (!item) return;
      item.quantity = quantity;
      item.subtotal = item.price * quantity;
      const totals = computeCartTotals(state.cart.items, state.cart);
      state.cart.subtotal = totals.subtotal;
      state.cart.tax = totals.tax;
      state.cart.shippingCost = totals.shippingCost;
      state.cart.totalPrice = totals.totalPrice;
    },
    /**
     * עדכון מלאי זמין לפריט ספציפי - משמש לשמירה על המלאי העדכני לאחר בדיקה מהשרת
     * הפריט נשאר תמיד isSelected: true - הלקוח קונה את כל העגלה
     * פריטים חסרי מלאי יוצגו עם התראה ולא יאפשרו checkout
     */
    setItemAvailableStock: (state, action: PayloadAction<{ itemId: string; availableStock: number }>) => {
      if (!state.cart) return;
      const { itemId, availableStock } = action.payload;
      const item = state.cart.items.find(i => i._id === itemId);
      if (!item) return;
      item.availableStock = availableStock;
      // isSelected נשאר true - לא משנים אותו
    },
    /**
     * הצבת הודעת שגיאה עבור פריט ספציפי (נמשכת לזמן קצר)
     */
    setUpdatingItemError: (state, action: PayloadAction<{ itemId: string; message: string | null }>) => {
      if (!state.updatingItemErrors) state.updatingItemErrors = {};
      const { itemId, message } = action.payload;
      state.updatingItemErrors[itemId] = message;
    },
    /**
     * הוספת שגיאה קצרה (לדוגמה: "אין מספיק במלאי" או "יותר מידי בקשות")
     * השגיאה מוצגת דיסקרטית בתוך העמוד ולא כ‐full page
     */
    addTransientError: (state, action: PayloadAction<{ id: string; message: string; status?: number }>) => {
      if (!state.transientErrors) state.transientErrors = [];
      state.transientErrors.push(action.payload);
    },
    /**
     * הסרת שגיאה קצרה לפי id
     */
    clearTransientError: (state, action: PayloadAction<string>) => {
      state.transientErrors = (state.transientErrors || []).filter(e => e.id !== action.payload);
    },
    
    // הוסר: toggleItemSelection, selectAllItems, deselectAllItems
    // הלקוח קונה את כל העגלה - אין בחירה סלקטיבית
  },
  
  // ExtraReducers - לטיפול בתוצאות של async thunks
  extraReducers: (builder) => {
    // fetchCart - קבלת הסל
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.fatalError = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        // כל הפריטים תמיד נבחרים - הלקוח קונה את כל העגלה
        const cart = action.payload;
        if (cart?.items) {
          cart.items = cart.items.map(item => ({
            ...item,
            isSelected: true
          }));
        }
        state.cart = cart;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בטעינת הסל';
        const status = payload?.status || 500;
        if (status >= 500) {
          state.fatalError = { message, status };
        }
      });
    
    // addItemToCart - הוספת פריט
    builder
      .addCase(addItemToCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.fatalError = null;
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // שמירת מצב הבחירה של פריטים קיימים
        const selectionState: Record<string, boolean> = {};
        if (state.cart) {
          state.cart.items.forEach(item => {
            if (item._id) {
              selectionState[item._id] = item.isSelected ?? false;
            }
          });
        }
        
        // Phase 4.1: הוספת isSelected = true לכל פריט שלא נקבע לו ערך קודם
        const cart = action.payload;
        if (cart?.items) {
          cart.items = cart.items.map(item => ({
            ...item,
            // שחזור מצב הבחירה של פריטים קיימים, או true לפריטים חדשים
            isSelected: item._id && selectionState[item._id] !== undefined 
              ? selectionState[item._id] 
              : (item.isSelected ?? true)
          }));
        }
        state.cart = cart;
        state.error = null;
        // לא פותחים את המיני-קארט - המשוב יהיה על הכפתור עצמו
        // state.isMiniCartOpen = true;
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.isLoading = false;
        // action.payload יכול להיות string או אובייקט עם message/status
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בהוספת פריט';
        const status = payload?.status || 500;
        // רק כשמדובר בשגיאה פאטלית (5xx) נציג page-level error
        if (status >= 500) {
          state.fatalError = { message, status };
        }
        // בשאר המקרים יש כבר transientErrors שנוספו על ידי ה-thunk
      });
    
    // updateItemQuantity - עדכון כמות (non-optimistic legacy thunk)
    builder
      .addCase(updateItemQuantity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.fatalError = null;
      })
      .addCase(updateItemQuantity.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // שמירת מצב הבחירה של כל פריט לפני עדכון הסל
        const selectionState: Record<string, boolean> = {};
        if (state.cart) {
          state.cart.items.forEach(item => {
            if (item._id) {
              selectionState[item._id] = item.isSelected ?? false;
            }
          });
        }
        
        state.cart = action.payload;
        
        // שחזור מצב הבחירה של כל פריט
        if (state.cart) {
          state.cart.items.forEach(item => {
            if (item._id && selectionState[item._id] !== undefined) {
              item.isSelected = selectionState[item._id];
            }
          });
        }
        
        state.error = null;
      })
      .addCase(updateItemQuantity.rejected, (state, action) => {
        state.isLoading = false;
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בעדכון כמות';
        const status = payload?.status || 500;
        if (status >= 500) {
          state.fatalError = { message, status };
        }
      });

    // updateItemQuantityOptimistic - טיפול ב-optimistic flow
    builder
      .addCase(updateItemQuantityOptimistic.pending, (state) => {
        // לא מסמנים isLoading גלובלי - משתמשי ה-UI מונחסים לפי updatingItemIds
        state.error = null;
        state.fatalError = null;
      })
      .addCase(updateItemQuantityOptimistic.fulfilled, (state, action) => {
        // שמירת מצב הבחירה של כל פריט לפני עדכון הסל
        const selectionState: Record<string, boolean> = {};
        if (state.cart) {
          state.cart.items.forEach(item => {
            if (item._id) {
              selectionState[item._id] = item.isSelected ?? false;
            }
          });
        }

        // על הצלחה מעדכנים את הסל לנתוני השרת הסופיים
        state.cart = action.payload;
        
        // שחזור מצב הבחירה של כל פריט
        if (state.cart) {
          state.cart.items.forEach(item => {
            if (item._id && selectionState[item._id] !== undefined) {
              item.isSelected = selectionState[item._id];
            }
          });
        }
        
        state.error = null;
      })
      .addCase(updateItemQuantityOptimistic.rejected, (state, action) => {
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בעדכון כמות';
        const status = payload?.status || 500;
        if (status >= 500) {
          state.fatalError = { message, status };
        }
      });
    
    // removeItemFromCart - הסרת פריט
    builder
      .addCase(removeItemFromCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.fatalError = null;
      })
      .addCase(removeItemFromCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(removeItemFromCart.rejected, (state, action) => {
        state.isLoading = false;
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בהסרת פריט';
        const status = payload?.status || 500;
        // רק כשמדובר בשגיאה פאטלית (5xx) נציג page-level error
        if (status >= 500) {
          state.fatalError = { message, status };
        }
      });
    
    // clearCart - ניקוי הסל
    builder
      .addCase(clearCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.fatalError = null;
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isLoading = false;
        const payload: any = action.payload;
        const message = payload?.message || payload || 'שגיאה בניקוי הסל';
        const status = payload?.status || 500;
        // רק כשמדובר בשגיאה פאטלית (5xx) נציג page-level error
        if (status >= 500) {
          state.fatalError = { message, status };
        }
      });
  },
});

// ייצוא ה-actions (הפעולות הסינכרוניות)
// הוסר: toggleItemSelection, selectAllItems, deselectAllItems - הלקוח קונה את כל העגלה
export const {
  openMiniCart,
  closeMiniCart,
  toggleMiniCart,
  clearError,
  setCart,
  startUpdatingItem,
  finishUpdatingItem,
  setItemQuantityLocal,
  setUpdatingItemError,
  addTransientError,
  clearTransientError,
  setItemAvailableStock,
} = cartSlice.actions;

// ייצוא ה-reducer (לשימוש ב-store)
export default cartSlice.reducer;

// Selectors - פונקציות עזר לגישה למידע מה-state
// מאפשרות לנו לקבל מידע ספציפי מהסל בצורה נוחה

/**
 * מספר הפריטים בסל (סה"כ כמויות)
 */
export const selectCartItemsCount = (state: { cart: CartState }) => {
  return state.cart.cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;
};

/**
 * מספר סוגי מוצרים שונים בסל
 */
export const selectCartItemsTypeCount = (state: { cart: CartState }) => {
  return state.cart.cart?.items.length || 0;
};

/**
 * האם הסל ריק
 */
export const selectIsCartEmpty = (state: { cart: CartState }) => {
  return !state.cart.cart?.items.length;
};

/**
 * סכום המוצרים בלבד (ללא משלוח) - מוצג בהדר
 */
export const selectCartTotal = (state: { cart: CartState }) => {
  return state.cart.cart?.subtotal || 0;
};

/**
 * האם מגיעים למשלוח חינם
 */
export const selectIsFreeShipping = (state: { cart: CartState }) => {
  const subtotal = state.cart.cart?.subtotal || 0;
  const FREE_SHIPPING_THRESHOLD = 200; // סף למשלוח חינם
  return subtotal >= FREE_SHIPPING_THRESHOLD;
};

/**
 * כמה חסר למשלוח חינם
 */
export const selectAmountToFreeShipping = (state: { cart: CartState }) => {
  const subtotal = state.cart.cart?.subtotal || 0;
  const FREE_SHIPPING_THRESHOLD = 200;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  return remaining > 0 ? remaining : 0;
};

// ======================================
// Phase 4.1: Selectors לפריטים נבחרים
// ======================================

/**
 * רשימת הפריטים הנבחרים לרכישה
 */
export const selectSelectedItems = (state: { cart: CartState }) => {
  return state.cart.cart?.items.filter(item => item.isSelected) || [];
};

/**
 * מספר הפריטים הנבחרים (סה"כ כמויות)
 */
export const selectSelectedItemsCount = (state: { cart: CartState }) => {
  const selectedItems = state.cart.cart?.items.filter(item => item.isSelected) || [];
  return selectedItems.reduce((total, item) => total + item.quantity, 0);
};

/**
 * מספר סוגי מוצרים נבחרים (לא כמויות)
 */
export const selectSelectedItemsTypeCount = (state: { cart: CartState }) => {
  return state.cart.cart?.items.filter(item => item.isSelected).length || 0;
};

/**
 * סכום ביניים של הפריטים הנבחרים בלבד
 */
export const selectSelectedSubtotal = (state: { cart: CartState }) => {
  const selectedItems = state.cart.cart?.items.filter(item => item.isSelected) || [];
  return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

/**
 * סה"כ לתשלום של הפריטים הנבחרים (כולל משלוח)
 * Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
 */
export const selectSelectedTotal = (state: { cart: CartState }) => {
  const selectedSubtotal = selectSelectedSubtotal(state);
  const shippingCost = selectedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (state.cart.cart?.shippingCost ?? 0);
  return selectedSubtotal + shippingCost - (state.cart.cart?.discount ?? 0);
};

/**
 * האם כל הפריטים נבחרים
 */
export const selectIsAllSelected = (state: { cart: CartState }) => {
  const items = state.cart.cart?.items || [];
  return items.length > 0 && items.every(item => item.isSelected);
};

/**
 * האם יש לפחות פריט אחד נבחר
 */
export const selectHasSelectedItems = (state: { cart: CartState }) => {
  return state.cart.cart?.items.some(item => item.isSelected) || false;
};

/**
 * האם הפריטים הנבחרים מגיעים למשלוח חינם
 */
export const selectSelectedIsFreeShipping = (state: { cart: CartState }) => {
  const subtotal = selectSelectedSubtotal(state);
  return subtotal >= FREE_SHIPPING_THRESHOLD;
};

/**
 * כמה חסר לפריטים הנבחרים למשלוח חינם
 */
export const selectSelectedAmountToFreeShipping = (state: { cart: CartState }) => {
  const subtotal = selectSelectedSubtotal(state);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  return remaining > 0 ? remaining : 0;
};
