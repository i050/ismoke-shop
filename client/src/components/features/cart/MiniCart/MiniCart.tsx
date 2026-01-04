// MiniCart - מגירה הזזה עם סיכום סל הקניות
// מציגה את הפריטים האחרונים בסל וכפתורי פעולה
// Phase 4.1: תמיכה בבחירה סלקטיבית של פריטים לרכישה

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import {
  closeMiniCart,
  selectCartItemsCount,
  removeItemFromCart,
  updateItemQuantityOptimistic,
  clearTransientError,
  // Phase 4.1: actions ו-selectors לבחירה סלקטיבית
  toggleItemSelection,
  selectSelectedItemsCount,
  selectSelectedSubtotal,
  selectHasSelectedItems,
} from '../../../../store/slices/cartSlice';
import CartItem from '../CartItem';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import styles from './MiniCart.module.css';

/**
 * קומפוננטת MiniCart
 * מגירה הזזה המציגה סיכום מהיר של סל הקניות
 * Phase 4.1: תומך בבחירה סלקטיבית של פריטים לרכישה
 */
const MiniCart = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // נתונים מה-store
  const isOpen = useAppSelector((state) => state.cart.isMiniCartOpen);
  const cart = useAppSelector((state) => state.cart.cart);
  const items = cart?.items || [];
  const updatingIds = useAppSelector((state) => state.cart.updatingItemIds || []);
  const updatingErrors = useAppSelector((state) => state.cart.updatingItemErrors || {});
  const transientErrors = useAppSelector((state) => state.cart.transientErrors || []);
  const itemsCount = useAppSelector(selectCartItemsCount);
  
  // Phase 4.1: נתונים לפריטים נבחרים
  const selectedItemsCount = useAppSelector(selectSelectedItemsCount);
  const selectedSubtotal = useAppSelector(selectSelectedSubtotal);
  const hasSelectedItems = useAppSelector(selectHasSelectedItems);

  // סגירת המגירה בלחיצה על Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        dispatch(closeMiniCart());
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, dispatch]);

  // נעילת גלילה כשהמגירה פתוחה
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // פונקציה לסגירת המגירה
  const handleClose = () => {
    dispatch(closeMiniCart());
  };

  // פונקציה למעבר לעמוד הסל המלא
  const handleViewCart = () => {
    dispatch(closeMiniCart());
    navigate('/cart');
  };

  // פונקציה למעבר לתשלום
  const handleCheckout = () => {
    dispatch(closeMiniCart());
    navigate('/checkout');
  };

  // פונקציה לעדכון כמות פריט
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    // משתמש ב-optimistic thunk לעדכון מהיר וחלק ל-UX
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

  // אם לא פתוח - לא מציג כלום
  if (!isOpen) return null;

  // בדיקה אם הסל ריק
  const isEmpty = items.length === 0;

  return (
    <>
      {/* רקע כהה */}
      <div
        className={styles.overlay}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* המגירה */}
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="miniCartTitle"
      >
        {/* כותרת */}
        <div className={styles.header}>
          <h2 id="miniCartTitle" className={styles.title}>
            סל הקניות שלי
            {!isEmpty && (
              <span className={styles.itemCount}>({itemsCount} פריטים)</span>
            )}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="סגור סל קניות"
            icon={<Icon name="X" size={20} />}
          />
        </div>

        {/* תוכן */}
        <div className={styles.content} data-scroll-container="mini-cart">
          {/* הצגת שגיאות קצרות טווח (לדוגמה: חוסר במלאי או rate-limit) */}
          {transientErrors.length > 0 && (
            <div className={styles.transientErrors}>
              {transientErrors.map(err => (
                <div key={err.id} className={styles.transientError}>
                  <span className={styles.transientErrorText}>{err.message}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className={styles.transientDismiss}
                    onClick={() => dispatch(clearTransientError(err.id))}
                    aria-label="הסרת הודעה"
                    icon={<Icon name="X" size={14} />}
                  />
                </div>
              ))}
            </div>
          )}
          {isEmpty ? (
            // סל ריק
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Icon name="ShoppingCart" size={48} /></div>
              <p className={styles.emptyText}>הסל שלך ריק</p>
              <p className={styles.emptySubtext}>
                הוסף מוצרים כדי להתחיל לקנות
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleClose}
                className={styles.continueShoppingButton}
              >
                המשך לקנות
              </Button>
            </div>
          ) : (
            // רשימת פריטים
            <div className={styles.itemsList}>
              {items.map((item) => (
                <CartItem
                  key={item._id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  onToggleSelection={handleToggleSelection}
                  isUpdating={!!item._id && updatingIds.includes(item._id)}
                  updateError={item._id ? updatingErrors[item._id] || null : null}
                  compact={true} 
                />
              ))}
            </div>
          )}
        </div>

        {/* תחתית עם סיכום ופעולות */}
        {!isEmpty && (
          <div className={styles.footer}>
            {/* Phase 4.1: סיכום מחיר - מבוסס על פריטים נבחרים בלבד */}
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  סה"כ ביניים ({selectedItemsCount} פריטים):
                </span>
                <span className={styles.summaryValue}>
                  ₪{selectedSubtotal.toFixed(2)}
                </span>
              </div>
              {!hasSelectedItems && (
                <p className={styles.noSelectionNote}>
                  בחר לפחות פריט אחד לתשלום
                </p>
              )}
              {hasSelectedItems && (
                <p className={styles.summaryNote}>
                  משלוח ומיסים יחושבו בתשלום
                </p>
              )}
            </div>

            {/* כפתורי פעולה */}
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckout}
                disabled={!hasSelectedItems}
                className={styles.checkoutButton}
              >
                {hasSelectedItems 
                  ? `המשך לתשלום (${selectedItemsCount})`
                  : 'בחר פריטים'}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleViewCart}
                className={styles.viewCartButton}
              >
                צפה בסל המלא
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MiniCart;
