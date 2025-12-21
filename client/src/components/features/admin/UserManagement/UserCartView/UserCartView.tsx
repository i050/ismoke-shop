// רכיב תצוגת סל קניות של משתמש - Admin View
// מטרת הקומפוננטה: מאפשר למנהל לצפות בסל הקניות הנוכחי של לקוח

import React, { useEffect, useState, useCallback } from 'react';
import userManagementService from '../../../../../services/userManagementService';
import type { UserCart, CartItem } from '../../../../../types/UserManagement';
import { 
  ShoppingCart, 
  Package, 
  Tag, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Clock,
  Trash2
} from 'lucide-react';
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import styles from './UserCartView.module.css';

// ==========================================
// טיפוסים מקומיים
// ==========================================

interface UserCartViewProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** מזהה המשתמש */
  userId: string;
  /** שם המשתמש להצגה */
  userName?: string;
}

// ==========================================
// פונקציות עזר
// ==========================================

/**
 * פורמט מחיר בשקלים
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
};

/**
 * פורמט תאריך בעברית
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * תרגום סטטוס סל לעברית
 */
const getStatusLabel = (status: string): { label: string; className: string } => {
  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: 'פעיל', className: 'statusActive' },
    abandoned: { label: 'נטוש', className: 'statusAbandoned' },
    checkedOut: { label: 'הושלם', className: 'statusCheckedOut' },
    merged: { label: 'מוזג', className: 'statusMerged' }
  };
  return statusMap[status] || { label: status, className: '' };
};

// ==========================================
// קומפוננטת פריט בסל
// ==========================================

const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
  // חילוץ תמונה - תמיכה גם ב-populate וגם ב-string
  const productImage = item.image || 
    (typeof item.productId === 'object' && item.productId.images?.[0]) || 
    '';

  return (
    <div className={styles.cartItem}>
      {/* תמונת המוצר */}
      <div className={styles.itemImage}>
        {productImage ? (
          <img src={productImage} alt={item.name} />
        ) : (
          <Package size={24} />
        )}
      </div>

      {/* פרטי המוצר */}
      <div className={styles.itemDetails}>
        <span className={styles.itemName}>{item.name}</span>
        {item.sku && <span className={styles.itemSku}>מק"ט: {item.sku}</span>}
        {item.variant && (
          <span className={styles.itemVariant}>
            {item.variant.color && `צבע: ${item.variant.color}`}
            {item.variant.color && item.variant.size && ' | '}
            {item.variant.size && `מידה: ${item.variant.size}`}
          </span>
        )}
      </div>

      {/* מחיר ליחידה */}
      <div className={styles.itemPrice}>
        <span className={styles.priceLabel}>מחיר</span>
        <span className={styles.priceValue}>{formatPrice(item.price)}</span>
      </div>

      {/* כמות */}
      <div className={styles.itemQuantity}>
        <span className={styles.quantityLabel}>כמות</span>
        <span className={styles.quantityValue}>{item.quantity}</span>
      </div>

      {/* סכום ביניים */}
      <div className={styles.itemSubtotal}>
        <span className={styles.subtotalLabel}>סה"כ</span>
        <span className={styles.subtotalValue}>{formatPrice(item.subtotal)}</span>
      </div>
    </div>
  );
};

// ==========================================
// קומפוננטה ראשית - תצוגת סל קניות
// ==========================================

const UserCartView: React.FC<UserCartViewProps> = ({ isOpen, onClose, userId, userName }) => {
  // מצבים מקומיים
  const [cart, setCart] = useState<UserCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCart, setNoCart] = useState(false);

  // טעינת סל הקניות
  const loadCart = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    setNoCart(false);

    try {
      const response = await userManagementService.getUserCart(userId);
      
      if (response.success && response.data.exists && response.data.cart) {
        setCart(response.data.cart);
      } else {
        setNoCart(true);
        setCart(null);
      }
    } catch (err: any) {
      console.error('Error loading user cart:', err);
      setError(err.message || 'שגיאה בטעינת סל הקניות');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // טעינה כשהמודל נפתח
  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen, loadCart]);

  // ניקוי בסגירה
  const handleClose = () => {
    setCart(null);
    setError(null);
    setNoCart(false);
    onClose();
  };

  // ==========================================
  // רינדור תוכן המודל
  // ==========================================

  const renderContent = () => {
    // מצב טעינה
    if (loading) {
      return (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>טוען סל קניות...</span>
        </div>
      );
    }

    // מצב שגיאה
    if (error) {
      return (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadCart}>
            נסה שוב
          </Button>
        </div>
      );
    }

    // אין סל קניות
    if (noCart || !cart) {
      return (
        <div className={styles.emptyCart}>
          <Trash2 size={48} className={styles.emptyIcon} />
          <h3>אין סל קניות</h3>
          <p>למשתמש {userName || 'זה'} אין סל קניות פעיל כרגע</p>
          <Button variant="outline" size="sm" onClick={loadCart}>
            <RefreshCw size={16} />
            רענן
          </Button>
        </div>
      );
    }

    // תצוגת סל קניות
    const statusInfo = getStatusLabel(cart.status);

    return (
      <>
        {/* כותרת */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <ShoppingCart size={20} />
            <h3>סל קניות</h3>
            <span className={`${styles.status} ${styles[statusInfo.className]}`}>
              {statusInfo.label}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadCart}>
            <RefreshCw size={16} />
          </Button>
        </div>

        {/* מידע כללי */}
        <div className={styles.info}>
          <div className={styles.infoItem}>
            <Package size={16} />
            <span>{cart.itemsCount} פריטים ({cart.totalQuantity} יחידות)</span>
          </div>
          <div className={styles.infoItem}>
            <Clock size={16} />
            <span>עודכן: {formatDate(cart.updatedAt)}</span>
          </div>
        </div>

        {/* רשימת פריטים */}
        <div className={styles.itemsList}>
          {cart.items.map((item, index) => (
            <CartItemRow key={item._id || index} item={item} />
          ))}
        </div>

        {/* סיכום */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>סכום ביניים</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>

          {cart.discount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discount}`}>
              <span>
                <Tag size={14} />
                הנחה
                {cart.coupon && ` (${cart.coupon.code})`}
              </span>
              <span>-{formatPrice(cart.discount)}</span>
            </div>
          )}

          {cart.shippingCost > 0 && (
            <div className={styles.summaryRow}>
              <span>משלוח</span>
              <span>{formatPrice(cart.shippingCost)}</span>
            </div>
          )}

          {cart.tax > 0 && (
            <div className={styles.summaryRow}>
              <span>מע"מ</span>
              <span>{formatPrice(cart.tax)}</span>
            </div>
          )}

          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>סה"כ לתשלום</span>
            <span>{formatPrice(cart.totalPrice)}</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`סל קניות - ${userName || 'לקוח'}`}
      size="large"
    >
      <div className={styles.container}>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default UserCartView;
