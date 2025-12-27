// CartItem - קומפוננטה להצגת פריט בסל הקניות
// מציגה תמונה, שם, מחיר, בורר כמות וכפתור הסרה

import { useEffect, useRef, useState } from 'react';
import { ProductService } from '../../../../services/productService';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { setItemAvailableStock } from '../../../../store/slices/cartSlice';
import type { CartItem as CartItemType } from '../../../../store/slices/cartSlice';
import QuantitySelector from '../../../ui/QuantitySelector';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon/Icon';
import StockAlertButton from '../../products/StockAlertButton';
import styles from './CartItem.module.css';
import { getColorNameHebrew } from '../../../../utils/colorUtils';
import { isHexColor } from '../../../../utils/colorConstants';

// ממשק Props של הקומפוננטה
interface CartItemProps {
  item: CartItemType;                           // פרטי הפריט
  onUpdateQuantity: (itemId: string, quantity: number) => void; // עדכון כמות
  onRemove: (itemId: string) => void;           // הסרת פריט
  onToggleSelection?: (itemId: string) => void; // Phase 4.1: החלפת בחירה
  isUpdating?: boolean;                         // האם בתהליך עדכון
  updateError?: string | null;                  // הודעת שגיאה מקומית לפריט (לכמה שניות)
  showSelection?: boolean;                      // Phase 4.1: האם להציג checkbox לבחירה
}

/**
 * קומפוננטת CartItem
 * מציגה פריט בודד בסל הקניות עם אפשרות לעדכן כמות ולהסיר
 */
const CartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  onToggleSelection,
  isUpdating = false,
  updateError = null,
  showSelection = true,
}: CartItemProps) => {
  // קבלת אימייל המשתמש המחובר לשימוש בכפתור התראת מלאי
  const user = useAppSelector((state) => state.auth.user);
  const userEmail = user?.email || '';
  
  // state לניהול מצב טעינה מקומי
  const [isRemoving, setIsRemoving] = useState(false);
  // כוח להצגת הודעת מלאי זמנית כאשר המשתמש לוחץ + מעבר למקס
  const [forceShowStockMessage, setForceShowStockMessage] = useState(false);
  // ref לשמור טיימאוט כדי שנוכל לנקות אותו כשצריך
  const forceTimerRef = useRef<number | null>(null);
  const clearMessageTimerRef = useRef<number | null>(null);
  const productStockControllerRef = useRef<AbortController | null>(null);
  // משך זמן מומלץ להצגה (UX): 3500ms = 3.5s
  const STOCK_PILL_DURATION = 3500;
  // משך האנימציית ה־fade ב־CSS (להמתין לפני סילוק הטקסט מה-DOM)
  const STOCK_PILL_TRANSITION = 260;

  // שמירת ההודעה האחרונה כך שנוכל להציג אותה בזמן האנימציה גם כש־force=false
  const [lastStockMessage, setLastStockMessage] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // state לניהול כמות pending עם debounce
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const DEBOUNCE_DELAY = 300; // זמן debounce ב-ms

  // פונקציה אחידה להצגת ה־pill לזמן קצר ולמחיקתו אחרי זמן מומלץ
  const showStockPill = async () => {
    // ביטול טיימאוטים קודמים
    if (forceTimerRef.current) {
      window.clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
    if (clearMessageTimerRef.current) {
      window.clearTimeout(clearMessageTimerRef.current);
      clearMessageTimerRef.current = null;
    }

    // הצגת הודעה ראשונית מה־state האחרון (fallback) כדי לספק משוב מיידי
    const fallbackStock = (item as any).availableStock;
    const fallbackMessage = typeof fallbackStock === 'number'
      ? `במלאי יש רק ${fallbackStock} יחידות`
      : 'המוצר אינו במלאי';
    setLastStockMessage(fallbackMessage);
    setForceShowStockMessage(true);

    // נסיון לקבל נתוני מלאי מעודכנים מהשרת
    try {
      if (productStockControllerRef.current) {
        productStockControllerRef.current.abort();
        productStockControllerRef.current = null;
      }
      const controller = new AbortController();
      productStockControllerRef.current = controller;

      const fresh = await ProductService.getProductById(item.productId, controller.signal);

      // Phase 3.4: מציאת ה-SKU התואם כדי לקבל מלאי מדויק (מבנה חדש)
      let freshStock = 0;
      if (item.sku && fresh.skus) {
        // מציאת ה-SKU הספציפי לפי קוד SKU
        const matchingSku = fresh.skus.find(s => s.sku === item.sku);
        freshStock = matchingSku?.stockQuantity ?? 0;
      } else {
        // fallback למוצרים ללא SKU ספציפי (אם בכלל יש)
        freshStock = fresh.quantityInStock ?? 0;
      }

      if (freshStock !== fallbackStock) {
        const message = freshStock > 0 ? `במלאי יש רק ${freshStock} יחידות` : 'אזל מהמלאי';
        setLastStockMessage(message);
      }

      // עדכון ה-store כדי שהסל יציג את המספר האמיתי שנותר במקום ערכים ישנים
      if (item._id && typeof freshStock === 'number') {
        dispatch(setItemAvailableStock({ itemId: item._id, availableStock: freshStock }));
      }

      productStockControllerRef.current = null;
    } catch (err) {
      // בביטול בקשה (AbortError) - זה תקין, אל תציג שגיאה
      if (err instanceof Error && err.name === 'AbortError') {
        // בקשה בוטלה כמתוכנן, אל תעשה כלום
        return;
      }
      // בשגיאות אחרות - נשאיר את ההודעה fallback
    }

    // סגירת ה-pill לאחר פרק זמן מומלץ
    forceTimerRef.current = window.setTimeout(() => {
      setForceShowStockMessage(false);
      forceTimerRef.current = null;
      clearMessageTimerRef.current = window.setTimeout(() => {
        setLastStockMessage(null);
        clearMessageTimerRef.current = null;
      }, STOCK_PILL_TRANSITION);
    }, STOCK_PILL_DURATION);
  };

  // ניקוי הטיימאוטים בעת unmount של הקומפוננטה
  useEffect(() => {
    return () => {
      if (forceTimerRef.current) {
        window.clearTimeout(forceTimerRef.current);
        forceTimerRef.current = null;
      }
      if (clearMessageTimerRef.current) {
        window.clearTimeout(clearMessageTimerRef.current);
        clearMessageTimerRef.current = null;
      }
      if (productStockControllerRef.current) {
        productStockControllerRef.current.abort();
        productStockControllerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // פונקציה לטיפול בעדכון כמות עם debounce ו-optimistic update
  const handleQuantityChange = (newQuantity: number) => {
    if (!item._id) return;
    // עדכון ויזואלי מיידי (optimistic)
    setPendingQuantity(newQuantity);

    // בטל debounce קודם אם קיים
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // debounce את השליחה לשרת
    debounceTimerRef.current = window.setTimeout(() => {
      onUpdateQuantity(item._id!, newQuantity);
      setPendingQuantity(null); // נקה את ה-pending אחרי שליחה
    }, DEBOUNCE_DELAY);
  };

  // הודעה על מלאי — עדיפות לשגיאת שרת (updateError), אחרת מציגים את הטקסט האחרון שנקבע
  const stockMessage = updateError || lastStockMessage;
  // האם ה־pill צריך להיות בגירסה ה"נראית" (שלוחה של שגיאת שרת או הצגה מסיבות משתמש)
  const pillVisible = Boolean(updateError) || forceShowStockMessage;

  // כאשר מגיעה שגיאת שרת חדשה, נעדכן את הטקסט האחרון ונבטל טיימאוטי ניקוי קיימים
  useEffect(() => {
    if (updateError) {
      setLastStockMessage(updateError);
      if (clearMessageTimerRef.current) {
        window.clearTimeout(clearMessageTimerRef.current);
        clearMessageTimerRef.current = null;
      }
    } else {
      // אם השגיאה נעלמה ואין הצגה מאולצת - ננקה את הטקסט אחרי האנימציה
      if (!forceShowStockMessage && lastStockMessage) {
        if (clearMessageTimerRef.current) {
          window.clearTimeout(clearMessageTimerRef.current);
          clearMessageTimerRef.current = null;
        }
        clearMessageTimerRef.current = window.setTimeout(() => {
          setLastStockMessage(null);
          clearMessageTimerRef.current = null;
        }, STOCK_PILL_TRANSITION);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateError, forceShowStockMessage]);

  // פונקציה לטיפול בהסרת פריט
  const handleRemove = async () => {
    if (!item._id) return;
    setIsRemoving(true);
    try {
      await onRemove(item._id);
    } catch (error) {
      setIsRemoving(false);
    }
  };

  // חישוב מחיר סה"כ לפריט
  const totalPrice = item.price * item.quantity;
  
  // בדיקה האם המוצר אזל מהמלאי
  const availableStock = (item as any).availableStock ?? 0;
  const isOutOfStock = availableStock === 0;
  
  // בדיקה האם הכמות בעגלה גדולה מהמלאי הזמין (צריך התאמה)
  const needsQuantityAdjustment = !isOutOfStock && item.quantity > availableStock;

  return (
    <div
      className={`${styles.cartItem} ${isRemoving ? styles.removing : ''} ${isOutOfStock ? styles.outOfStock : ''} ${needsQuantityAdjustment ? styles.needsAdjustment : ''} ${!item.isSelected ? styles.notSelected : ''}`}
      style={{ direction: 'ltr' }}
    >
      {/* Phase 4.1: Checkbox לבחירת פריט לרכישה */}
      {/* Phase 5.0: Checkbox מנוטרל אם המוצר אזל מהמלאי */}
      {showSelection && (
        <div className={styles.selectionCheckbox}>
          <input
            type="checkbox"
            id={`select-item-${item._id}`}
            checked={item.isSelected && !isOutOfStock}
            onChange={() => !isOutOfStock && item._id && onToggleSelection?.(item._id)}
            disabled={isOutOfStock}
            className={`${styles.checkbox} ${isOutOfStock ? styles.checkboxDisabled : ''}`}
            aria-label={`${isOutOfStock ? 'לא זמין - ' : ''}בחר ${item.name} לרכישה`}
          />
          <label htmlFor={`select-item-${item._id}`} className={styles.checkboxLabel}>
            <Icon name="Check" size={14} className={styles.checkIcon} />
          </label>
        </div>
      )}
      
      {/* תמונת המוצר */}
      <div className={styles.imageContainer}>
        <img
          src={item.image || '/ismoke-placeholder.png'}
          alt={item.name}
          className={styles.image}
          loading="lazy"
        />
      </div>

      {/* מחיר ליחידה */}
      <div className={styles.price}>
        <span className={styles.priceLabel}>מחיר ליחידה:</span>
        <span className={styles.priceValue}>₪{item.price.toFixed(2)}</span>
      </div>

      {/* פרטי המוצר */}
      <div className={styles.details}>
        {/* שם המוצר */}
        <h3 className={styles.name}>{item.name}</h3>

        {/* Phase 3.4: הצגת attributes של SKU (צבע/מידה) */}
        {item.variant && (item.variant.color || item.variant.size) && (
          <div className={styles.variant}>
            {item.variant.color && (
              (() => {
                const variantColor = item.variant?.color || '';
                const isHex = isHexColor(variantColor.startsWith('#') ? variantColor : `#${variantColor}`);
                const displayColor = isHex ? getColorNameHebrew(variantColor) : variantColor;
                const swatchColor = isHex ? (variantColor.startsWith('#') ? variantColor : `#${variantColor}`) : '';
                return (
                  <span className={styles.variantItem}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: swatchColor || 'transparent' }}
                      title={displayColor || variantColor}
                      aria-hidden={false}
                    />
                    צבע: <strong>{displayColor || variantColor}</strong>
                  </span>
                );
              })()
            )}
            {item.variant.size && (
              <span className={styles.variantItem}>
                מידה: <strong>{item.variant.size}</strong>
              </span>
            )}
          </div>
        )}

        {/* הודעה על צורך בהתאמת כמות - כשיש פחות מלאי מהכמות בעגלה */}
        {needsQuantityAdjustment && (
          <div className={styles.quantityAdjustmentBanner}>
            <Icon name="AlertTriangle" size={16} className={styles.adjustmentIcon} />
            <span>
              במלאי יש רק <strong>{availableStock}</strong> יחידות (ביקשת {item.quantity})
            </span>
            <button
              type="button"
              className={styles.adjustButton}
              onClick={() => handleQuantityChange(availableStock)}
              disabled={isRemoving}
            >
              עדכן ל-{availableStock}
            </button>
          </div>
        )}

        {/* ...existing code... */}

        {/* בורר כמות או הודעת "אזל מהמלאי" - רק במובייל */}
        <div className={styles.quantityMobile}>
          {isOutOfStock ? (
            /* הודעת אזל מהמלאי עם כפתור התראה */
            <div className={styles.outOfStockBanner}>
              <div className={styles.outOfStockMessage}>
                <Icon name="AlertCircle" size={18} className={styles.outOfStockIcon} />
                <span>אזל מהמלאי</span>
              </div>
              <StockAlertButton
                productId={item.productId}
                sku={item.sku || ''}
                productName={item.name}
                userEmail={userEmail}
                variant="minimal"
              />
            </div>
          ) : (
            <div className={styles.quantityWrapper}>
              <QuantitySelector
                value={pendingQuantity ?? item.quantity}
                min={1}
                max={availableStock || 99}
                onChange={handleQuantityChange}
                onOverMax={showStockPill}
                disabled={isRemoving}
                size="small"
              />
              {/* הודעת מלאי קלה וברורה מוצהרת אך ממוקמת באבסולוט כך שלא מזיזה תוכן */}
              <div
                className={`${styles.stockPill} ${pillVisible ? styles.stockPillVisible : ''}`}
                role="alert"
                aria-hidden={!pillVisible}
              >
                {/* נשתמש בטקסט ששמרנו כדי להנעים אנימציות בעת הסרה */}
                {stockMessage ? (
                  <>
                    <Icon name="AlertTriangle" size={14} className={styles.pillIcon} />
                    <span>{stockMessage}</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* בורר כמות או הודעת "אזל מהמלאי" - דסקטופ */}
      {isOutOfStock ? (
        <div className={styles.quantityDesktop}>
          <div className={styles.outOfStockBanner}>
            <div className={styles.outOfStockMessage}>
              <Icon name="AlertCircle" size={18} className={styles.outOfStockIcon} />
              <span>אזל מהמלאי</span>
            </div>
            <StockAlertButton
              productId={item.productId}
              sku={item.sku || ''}
              productName={item.name}
              userEmail={userEmail}
              variant="minimal"
            />
          </div>
        </div>
      ) : (
        <div className={styles.quantityDesktop}>
          <div className={styles.quantityWrapper}>
            <QuantitySelector
              value={pendingQuantity ?? item.quantity}
              min={1}
              max={availableStock || 99}
              onChange={handleQuantityChange}
              onOverMax={showStockPill}
              disabled={isRemoving}
              size="medium"
            />
            {/* הודעת מלאי קלה וברורה מוצהרת אך ממוקמת באבסולוט כך שלא מזיזה תוכן */}
            <div
              className={`${styles.stockPill} ${pillVisible ? styles.stockPillVisible : ''}`}
              role="alert"
              aria-hidden={!pillVisible}
            >
              {stockMessage ? (
                <>
                  <Icon name="AlertTriangle" size={14} className={styles.pillIcon} />
                  <span>{stockMessage}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* מחיר סה"כ */}
      <div className={styles.totalPrice}>
        <span className={styles.totalLabel}>סה"כ:</span>
        <span className={styles.totalValue}>₪{totalPrice.toFixed(2)}</span>
      </div>

      {/* כפתור הסרה */}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isUpdating || isRemoving}
          aria-label={`הסר ${item.name} מהסל`}
        >
          {isRemoving ? (
            <span className={styles.loadingSpinner}>⏳</span>
          ) : (
            <Icon name="Trash2" size={20} className={styles.removeIcon} />
          )}
        </Button>
      </div>

      {/* ספינר צף בצד הכרטיס מתחת לתמונה */}
      {(isUpdating || pendingQuantity !== null) && (
        <span className={styles.inlineSpinner} aria-hidden="true" title="מעדכן..."></span>
      )}
    </div>
  );
};

export default CartItem;
