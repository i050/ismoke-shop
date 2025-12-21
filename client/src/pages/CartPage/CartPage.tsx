// CartPage - עמוד סל הקניות המלא
// מציג את כל הפריטים בסל, סיכום מחירים וכפתור מעבר לתשלום
// Phase 4.1: תמיכה בבחירה סלקטיבית של פריטים לרכישה
// Phase 6.0: תמיכה בהנחת סף (Threshold Discount)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchCart,
  updateItemQuantityOptimistic,
  removeItemFromCart,
  clearCart,
  selectCartItemsCount,
  selectCartTotal,
  selectIsFreeShipping,
  selectAmountToFreeShipping,
  // Phase 4.1: actions ו-selectors לבחירה סלקטיבית
  toggleItemSelection,
  selectAllItems,
  deselectAllItems,
  selectSelectedItemsCount,
  selectSelectedSubtotal,
  selectSelectedTotal,
  selectIsAllSelected,
  selectHasSelectedItems,
  selectSelectedIsFreeShipping,
  selectSelectedAmountToFreeShipping,
  type CartItem as CartItemType,
} from '../../store/slices/cartSlice';
import { getPublicSettings, type PublicSettings } from '../../services/settingsService';
import CartItem from '../../components/features/cart/CartItem';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../hooks/useConfirm';
import styles from './CartPage.module.css';

/**
 * קומפוננטת CartPage
 * עמוד סל הקניות המלא עם כל הפריטים וסיכום מחירים
 * Phase 4.1: תומך בבחירה סלקטיבית של פריטים לרכישה
 */
const CartPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // נתונים מה-store
  const cart = useAppSelector((state) => state.cart.cart);
  const items = cart?.items || [];
  const itemsCount = useAppSelector(selectCartItemsCount);
  const total = useAppSelector(selectCartTotal);
  const isFreeShipping = useAppSelector(selectIsFreeShipping);
  const amountToFreeShipping = useAppSelector(selectAmountToFreeShipping);
  const isLoading = useAppSelector((state) => state.cart.isLoading);
  const updatingIds = useAppSelector((state) => state.cart.updatingItemIds || []);
  const updatingErrors = useAppSelector((state) => state.cart.updatingItemErrors || {});
  const transientErrors = useAppSelector((state) => state.cart.transientErrors || []);
  const fatalError = useAppSelector((state) => state.cart.fatalError);

  // Phase 4.1: נתונים לפריטים נבחרים
  const selectedItemsCount = useAppSelector(selectSelectedItemsCount);
  const selectedSubtotal = useAppSelector(selectSelectedSubtotal);
  const selectedTotal = useAppSelector(selectSelectedTotal);
  const isAllSelected = useAppSelector(selectIsAllSelected);
  const hasSelectedItems = useAppSelector(selectHasSelectedItems);
  const selectedIsFreeShipping = useAppSelector(selectSelectedIsFreeShipping);
  const selectedAmountToFreeShipping = useAppSelector(selectSelectedAmountToFreeShipping);

  // בדיקה האם יש פריטים שאזלו מהמלאי
  const outOfStockItems = items.filter((item: CartItemType) => 
    (item as any).availableStock === 0
  );
  const hasOutOfStockItems = outOfStockItems.length > 0;
  
  // בדיקה האם יש פריטים שצריכים התאמת כמות (כמות בעגלה > מלאי זמין)
  const needsAdjustmentItems = items.filter((item: CartItemType) => {
    const availableStock = (item as any).availableStock ?? 0;
    return availableStock > 0 && item.quantity > availableStock;
  });
  const hasAdjustmentNeeded = needsAdjustmentItems.length > 0;

  // Phase 6.0: הגדרות הנחת סף
  const [thresholdDiscount, setThresholdDiscount] = useState<{
    enabled: boolean;
    minimumAmount: number;
    discountPercentage: number;
  } | null>(null);

  // חישוב הנחת סף אם פעילה
  const thresholdDiscountAmount = thresholdDiscount?.enabled && selectedSubtotal >= thresholdDiscount.minimumAmount
    ? (selectedSubtotal * thresholdDiscount.discountPercentage) / 100
    : 0;
  
  // האם זכאי להנחת סף
  const isEligibleForThresholdDiscount = thresholdDiscount?.enabled && selectedSubtotal >= thresholdDiscount.minimumAmount;
  
  // כמה חסר לזכאות להנחת סף
  const amountToThresholdDiscount = thresholdDiscount?.enabled && !isEligibleForThresholdDiscount
    ? thresholdDiscount.minimumAmount - selectedSubtotal
    : 0;

  // סה"כ לתשלום אחרי הנחת סף
  const totalAfterThresholdDiscount = selectedTotal - thresholdDiscountAmount;

  // טעינת הסל והגדרות בעלייה לעמוד
  useEffect(() => {
    dispatch(fetchCart());
    
    // טעינת הגדרות ציבוריות (כולל הנחת סף)
    const loadSettings = async () => {
      try {
        const response = await getPublicSettings();
        if (response.success && response.data.thresholdDiscount) {
          setThresholdDiscount(response.data.thresholdDiscount);
        }
      } catch (err) {
        console.error('Error loading public settings:', err);
      }
    };
    loadSettings();
  }, [dispatch]);

  // פונקציה לעדכון כמות פריט
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    dispatch(updateItemQuantityOptimistic({ itemId, quantity }));
  };

  // פונקציה להסרת פריט
  const handleRemoveItem = (itemId: string) => {
    dispatch(removeItemFromCart(itemId));
  };

  // Phase 4.1: פונקציה להחלפת מצב בחירה של פריט
  const handleToggleSelection = (itemId: string) => {
    dispatch(toggleItemSelection(itemId));
  };

  // Phase 4.1: פונקציה לבחירת/ביטול בחירת כל הפריטים
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      dispatch(deselectAllItems());
    } else {
      dispatch(selectAllItems());
    }
  };

  // פונקציה לניקוי הסל
  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: 'ניקוי סל הקניות',
      message: 'האם אתה בטוח שברצונך לרוקן את הסל?',
      confirmText: 'נקה סל',
      cancelText: 'ביטול',
      danger: true,
    });
    if (confirmed) {
      dispatch(clearCart());
    }
  };

  // פונקציה למעבר לתשלום
  const handleCheckout = () => {
    navigate('/checkout');
  };

  // פונקציה למעבר לעמוד הקניות
  const handleContinueShopping = () => {
    navigate('/products');
  };

  // אם בטעינה
  if (isLoading && !cart) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}><Icon name="Clock" size={24} /></div>
          <p>טוען סל קניות...</p>
        </div>
      </div>
    );
  }

  // אם יש שגיאה פאטלית (5xx) - הצג מסך שגיאה מלא
  if (fatalError && (!cart || !cart.items)) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}><Icon name="AlertTriangle" size={48} /></div>
          <h2>אירעה שגיאה</h2>
          <p>{fatalError.message}</p>
          <Button variant="primary" size="md" onClick={() => dispatch(fetchCart())}>
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  // אם הסל ריק
  if (!cart || items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Icon name="ShoppingCart" size={48} /></div>
          <h2>הסל שלך ריק</h2>
          <p>הוסף מוצרים כדי להתחיל לקנות</p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinueShopping}
            className={styles.continueShoppingButton}
          >
            המשך לקנות
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* הצגת שגיאה קצרה כתובה בראש העמוד במקום לעבור למסך שגיאה מלא */}
      {transientErrors.length > 0 && (
        <div className={styles.transientBanner} role="alert">
          {transientErrors.map(err => (
            <div key={err.id} className={styles.transientItem}>{err.message}</div>
          ))}
        </div>
      )}
      {/* כותרת */}
      <div className={styles.header}>
        <h1 className={styles.title}>סל הקניות שלי</h1>
        <span className={styles.itemsCount}>({itemsCount} פריטים)</span>
      </div>

      {/* תוכן ראשי */}
      <div className={styles.content}>
        {/* פאנל שמאלי - רשימת פריטים */}
        <div className={styles.itemsPanel}>
          {/* Phase 4.1: פס התקדמות למשלוח חינם - מחושב לפי פריטים נבחרים בלבד */}
          {!selectedIsFreeShipping && hasSelectedItems && (
            <div className={styles.freeShippingBar}>
              <div className={styles.freeShippingProgress}>
                <div
                  className={styles.freeShippingFill}
                  style={{
                    width: `${Math.min(
                      (selectedSubtotal / (selectedSubtotal + selectedAmountToFreeShipping)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className={styles.freeShippingText}>
                עוד <strong>₪{selectedAmountToFreeShipping.toFixed(2)}</strong> למשלוח
                חינם! <Icon name="Truck" size={18} />
              </p>
            </div>
          )}
          {selectedIsFreeShipping && hasSelectedItems && (
            <div className={styles.freeShippingAchieved}>
              <span className={styles.freeShippingIcon}><Icon name="CheckCircle2" size={20} /></span>
              זכאי למשלוח חינם!
            </div>
          )}

          {/* Phase 4.1: שורת בחירת כל הפריטים */}
          <div className={styles.selectAllRow}>
            <label className={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className={styles.selectAllCheckbox}
              />
              <span className={styles.selectAllText}>
                {isAllSelected ? 'בטל בחירת הכל' : 'בחר הכל'}
              </span>
            </label>
            <span className={styles.selectedCount}>
              {selectedItemsCount > 0 
                ? `נבחרו ${selectedItemsCount} פריטים`
                : 'לא נבחרו פריטים'}
            </span>
          </div>

          {/* רשימת הפריטים */}
          <div className={styles.itemsList}>
            {items.map((item: CartItemType) => (
              <CartItem
                key={item._id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                onToggleSelection={handleToggleSelection}
                isUpdating={!!item._id && updatingIds.includes(item._id)}
                updateError={item._id ? updatingErrors[item._id] || null : null}
              />
            ))}
          </div>

          {/* כפתור ניקוי הסל */}
          <div className={styles.clearCartSection}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              className={styles.clearCartButton}
            >
              רוקן סל
            </Button>
          </div>
        </div>

        {/* פאנל ימני - סיכום */}
        <div className={styles.summaryPanel}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>סיכום הזמנה</h2>

            {/* Phase 4.1: הודעה על פריטים נבחרים */}
            {!hasSelectedItems && (
              <div className={styles.noSelectionWarning}>
                <Icon name="Info" size={18} />
                <span>בחר לפחות פריט אחד כדי להמשיך לתשלום</span>
              </div>
            )}

            {/* Phase 4.1: פירוט מחירים - מחושב לפי פריטים נבחרים בלבד */}
            <div className={styles.summaryDetails}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>סה"כ ביניים ({selectedItemsCount} פריטים):</span>
                <span className={styles.summaryValue}>
                  ₪{selectedSubtotal.toFixed(2)}
                </span>
              </div>

              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>משלוח:</span>
                <span className={styles.summaryValue}>
                  {selectedIsFreeShipping && hasSelectedItems ? (
                    <span className={styles.freeShippingLabel}><Icon name="Gem" size={16} /> חינם</span>
                  ) : !hasSelectedItems ? (
                    <span>-</span>
                  ) : (
                    `₪${cart.shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>

              {/* Phase 4.2: מע"מ כלול במחיר - לא מציגים בנפרד */}

              {cart.discount > 0 && (
                <div className={`${styles.summaryRow} ${styles.discount}`}>
                  <span className={styles.summaryLabel}>הנחה:</span>
                  <span className={styles.summaryValue}>
                    -₪{cart.discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Phase 6.0: הנחת סף */}
              {thresholdDiscountAmount > 0 && (
                <div className={`${styles.summaryRow} ${styles.thresholdDiscount}`}>
                  <span className={styles.summaryLabel}>
                    <Icon name="Gift" size={16} /> הנחת סף ({thresholdDiscount?.discountPercentage}%):
                  </span>
                  <span className={styles.summaryValue}>
                    -₪{thresholdDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className={styles.summaryDivider} />

              <div className={`${styles.summaryRow} ${styles.total}`}>
                <span className={styles.totalLabel}>סה"כ לתשלום:</span>
                <span className={styles.totalValue}>
                  ₪{totalAfterThresholdDiscount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Phase 6.0: הודעה על זכאות להנחת סף */}
            {thresholdDiscount?.enabled && !isEligibleForThresholdDiscount && hasSelectedItems && amountToThresholdDiscount > 0 && (
              <div className={styles.thresholdDiscountHint}>
                <Icon name="Gift" size={18} />
                <span>
                  עוד <strong>₪{amountToThresholdDiscount.toFixed(2)}</strong> ותקבלו <strong>{thresholdDiscount.discountPercentage}%</strong> הנחה!
                </span>
              </div>
            )}

            {/* הודעה על פריטים שאזלו מהמלאי */}
            {hasOutOfStockItems && (
              <div className={styles.outOfStockWarning}>
                <Icon name="AlertCircle" size={18} />
                <span>
                  יש {outOfStockItems.length} פריט{outOfStockItems.length > 1 ? 'ים' : ''} שאזל{outOfStockItems.length > 1 ? 'ו' : ''} מהמלאי.
                  <br />
                  הסר אותם או הירשם להתראה כדי להמשיך לתשלום.
                </span>
              </div>
            )}
            
            {/* הודעה על פריטים שצריכים התאמת כמות */}
            {hasAdjustmentNeeded && !hasOutOfStockItems && (
              <div className={styles.adjustmentWarning}>
                <Icon name="AlertTriangle" size={18} />
                <span>
                  יש {needsAdjustmentItems.length} פריט{needsAdjustmentItems.length > 1 ? 'ים' : ''} עם כמות גבוהה מהמלאי הזמין.
                  <br />
                  עדכן את הכמויות כדי להמשיך לתשלום.
                </span>
              </div>
            )}

            {/* כפתור מעבר לתשלום - Phase 4.1: מוגבל גם לבדיקת פריטים נבחרים */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading || hasOutOfStockItems || hasAdjustmentNeeded || !hasSelectedItems}
              className={styles.checkoutButton}
            >
              {hasOutOfStockItems ? 'יש פריטים חסרי מלאי' : 
               hasAdjustmentNeeded ? 'יש להתאים כמויות' :
               !hasSelectedItems ? 'בחר פריטים לרכישה' :
               `המשך לתשלום (${selectedItemsCount})`}
            </Button>

            {/* כפתור המשך קניות */}
            <Button
              variant="ghost"
              size="md"
              onClick={handleContinueShopping}
              className={styles.continueShoppingButton}
            >
              המשך לקנות
            </Button>

            {/* הערות */}
            <div className={styles.notes}>
              <p className={styles.noteText}>
                <Icon name="CreditCard" size={16} /> תשלום מאובטח עם הצפנת SSL
              </p>
              <p className={styles.noteText}>
                <Icon name="Package" size={16} /> משלוח תוך 3-5 ימי עסקים
              </p>
              <p className={styles.noteText}>
                <Icon name="Undo" size={16} /> החזרה חינם עד 14 יום
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
