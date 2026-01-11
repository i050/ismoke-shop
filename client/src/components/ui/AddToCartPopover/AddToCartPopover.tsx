// קומפוננטת AddToCartPopover - Popover לבחירת כמות לפני הוספה לעגלה
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@ui';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import styles from './AddToCartPopover.module.css';

interface AddToCartPopoverProps {
  /** כפתור ה-trigger (הכפתור שפותח את ה-Popover) */
  children: React.ReactNode;
  /** המלאי הזמין למוצר/SKU */
  availableStock: number;
  /** פונקציה שתקרא כאשר לוחצים "הוסף לסל" עם הכמות שנבחרה */
  onAddToCart: (quantity: number) => void;
  /** האם הפופאובר מושבת (למשל אם אין מלאי) */
  disabled?: boolean;
  /** שם המוצר - להצגה בפופאובר */
  productName?: string;
}

/**
 * קומפוננטת AddToCartPopover
 * מציגה Popover עם בחירת כמות כשלוחצים על כפתור "הוסף לסל"
 * 
 * UX Flow:
 * 1. משתמש לוחץ על "הוסף לסל"
 * 2. נפתח Popover עם quantity selector (ברירת מחדל: 1)
 * 3. משתמש בוחר כמות
 * 4. לוחץ "הוסף" והפופאובר נסגר
 */
const AddToCartPopover = ({
  children,
  availableStock,
  onAddToCart,
  disabled = false,
  productName = 'מוצר זה'
}: AddToCartPopoverProps) => {
  // state לניהול הכמות שנבחרה
  const [quantity, setQuantity] = useState(1);
  
  // state לניהול פתיחה/סגירה של הפופאובר
  const [isOpen, setIsOpen] = useState(false);

  // פונקציה לטיפול בהוספה לסל
  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= availableStock) {
      onAddToCart(quantity);
      setIsOpen(false); // סגירת הפופאובר
      setQuantity(1); // איפוס הכמות לברירת המחדל
    }
  };

  // פונקציה שנקראת כשהמשתמש מנסה לעבור את המלאי
  const handleOverMax = (max?: number) => {
    // כאן אפשר להוסיף הודעה או אנימציה
    console.log(`מלאי זמין: ${max} יחידות בלבד`);
  };

  // פונקציה לעצירת propagation - משמשת לכל interaction עם הPopover
  const stopEventPropagation = (e: React.MouseEvent | React.ChangeEvent<any>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // אם אין מלאי כלל - לא להציג את הפופאובר
  if (availableStock === 0 || disabled) {
    return <>{children}</>;
  }

  return (
    <div onClick={stopEventPropagation} onKeyDown={(e) => e.stopPropagation()}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        
        <PopoverContent 
          className={styles.popoverContent}
          align="center"
          side="top"
          sideOffset={8}
        >
          <div className={styles.container} onClick={stopEventPropagation}>
            {/* כותרת */}
            <div className={styles.header}>
              <h3 className={styles.title}>בחר כמות</h3>
              {productName && (
                <p className={styles.productName}>{productName}</p>
              )}
            </div>

            {/* בורר כמות */}
            <div className={styles.quantitySection}>
              <QuantitySelector
                value={quantity}
                min={1}
                max={availableStock}
                onChange={setQuantity}
                onOverMax={handleOverMax}
                size="medium"
              />
              <p className={styles.stockInfo}>
                {availableStock} יחידות זמינות במלאי
              </p>
            </div>

            {/* כפתורי פעולה */}
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="md"
                onClick={(e) => {
                  stopEventPropagation(e);
                  handleAddToCart();
                }}
                className={styles.addButton}
              >
                הוסף {quantity > 1 ? `${quantity} יחידות` : ''} לסל
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stopEventPropagation(e);
                  setIsOpen(false);
                }}
                className={styles.cancelButton}
              >
                ביטול
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AddToCartPopover;
