// קומפוננטת AddToCartPopover - Popover לבחירת כמות ותת-וריאנט לפני הוספה לעגלה
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@ui';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import VariantSelector from '../../features/products/VariantSelector';
import type { Sku, VariantType } from '../../../types/Product';
import styles from './AddToCartPopover.module.css';

interface AddToCartPopoverProps {
  /** כפתור ה-trigger (הכפתור שפותח את ה-Popover) */
  children: React.ReactNode;
  /** המלאי הזמין למוצר/SKU */
  availableStock: number;
  /** פונקציה שתקרא כאשר לוחצים "הוסף לסל" עם הכמות ו-SKU שנבחרו */
  onAddToCart: (quantity: number, sku?: string) => void;
  /** האם הפופאובר מושבת (למשל אם אין מלאי) */
  disabled?: boolean;
  /** שם המוצר - להצגה בפופאובר */
  productName?: string;
  /** 🆕 SKUs זמינים עבור הצבע הנבחר (לבחירת תת-וריאנט) */
  skus?: Sku[];
  /** 🆕 SKU הנבחר כרגע */
  selectedSku?: string | null;
  /** 🆕 פונקציה לשינוי SKU */
  onSkuChange?: (sku: string) => void;
  /** 🆕 שם המאפיין המשני (size/resistance וכו') */
  secondaryVariantAttribute?: string | null;
  /** 🆕 תמונות לפי צבע ספציפי (עדיפות ראשונה) */
  colorImages?: Record<string, string[]>;
  /** 🆕 תמונות לפי משפחת צבע (fallback) */
  colorFamilyImages?: Record<string, string[]>;
  // 🆕 Phase 4: תמיכה בוריאנטים מותאמים אישית
  /** סוג הוריאנט: 'color' | 'custom' | null */
  variantType?: VariantType;
  /** תווית הוריאנט הראשי (לדוגמה: "טעם") */
  primaryVariantLabel?: string;
  /** תווית הוריאנט המשני (לדוגמה: "ניקוטין") */
  secondaryVariantLabel?: string;
}

/**
 * קומפוננטת AddToCartPopover
 * מציגה Popover עם בחירת תת-וריאנט וכמות כשלוחצים על כפתור "הוסף לסל"
 * 
 * UX Flow:
 * 1. משתמש לוחץ על "הוסף לסל" (אחרי שבחר צבע בכרטיסייה)
 * 2. נפתח Popover עם:
 *    - בחירת תת-וריאנט (התנגדות/מידה/ניקוטין)
 *    - quantity selector (ברירת מחדל: 1)
 * 3. משתמש בוחר תת-וריאנט וכמות
 * 4. לוחץ "הוסף" והפופאובר נסגר
 */
const AddToCartPopover = ({
  children,
  availableStock,
  onAddToCart,
  disabled = false,
  productName = 'מוצר זה',
  skus,
  selectedSku,
  onSkuChange,
  secondaryVariantAttribute,
  colorImages = {},
  colorFamilyImages = {},
  // 🆕 Phase 4: תמיכה בוריאנטים מותאמים אישית
  variantType,
  primaryVariantLabel,
  secondaryVariantLabel,
}: AddToCartPopoverProps) => {
  // state לניהול הכמות שנבחרה
  const [quantity, setQuantity] = useState(1);
  
  // state לניהול פתיחה/סגירה של הפופאובר
  const [isOpen, setIsOpen] = useState(false);
  
  // 🆕 state מקומי ל-SKU כדי לאפשר שינוי בתוך הפופאובר
  const [localSelectedSku, setLocalSelectedSku] = useState<string | null>(selectedSku || null);
  
  // 🆕 סנכרון ה-state המקומי עם ה-prop החיצוני
  useEffect(() => {
    if (selectedSku) {
      setLocalSelectedSku(selectedSku);
    }
  }, [selectedSku]);
  
  // 🆕 חישוב מלאי דינמי לפי SKU נבחר
  const currentStock = useMemo(() => {
    if (!skus || !localSelectedSku) return availableStock;
    const skuData = skus.find(s => s.sku === localSelectedSku);
    return skuData?.stockQuantity ?? availableStock;
  }, [skus, localSelectedSku, availableStock]);

  // 🆕 פונקציה לטיפול בשינוי SKU בתוך הפופאובר
  const handleLocalSkuChange = (sku: string) => {
    setLocalSelectedSku(sku);
    // עדכון גם את ה-state החיצוני אם קיים callback
    if (onSkuChange) {
      onSkuChange(sku);
    }
  };
  
  // פונקציה לטיפול בהוספה לסל
  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= currentStock) {
      onAddToCart(quantity, localSelectedSku || undefined);
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
              <h3 className={styles.title}>השלם את הבחירה</h3>
              {productName && (
                <p className={styles.productName}>{productName}</p>
              )}
            </div>

            {/* 🆕 בחירת תת-וריאנט (אם יש SKUs מרובים וזה לא מצב פשוט) */}
            {skus && skus.length > 1 && (
              <div className={styles.variantSection}>
                <VariantSelector
                  skus={skus}
                  selectedSku={localSelectedSku}
                  onSkuChange={handleLocalSkuChange}
                  compactMode={false}
                  secondaryVariantAttribute={secondaryVariantAttribute}
                  showColorPreview={false}
                  secondaryOnly={!!secondaryVariantAttribute}
                  useDropdownForSecondary={true}
                  colorImages={colorImages}
                  colorFamilyImages={colorFamilyImages}
                  // 🆕 Phase 4: העברת props לוריאנטים מותאמים אישית
                  variantType={variantType}
                  primaryVariantLabel={primaryVariantLabel}
                  secondaryVariantLabel={secondaryVariantLabel}
                />
              </div>
            )}

            {/* בורר כמות */}
            <div className={styles.quantitySection}>
              <QuantitySelector
                value={quantity}
                min={1}
                max={currentStock}
                onChange={setQuantity}
                onOverMax={handleOverMax}
                size="medium"
              />
              <p className={styles.stockInfo}>
                {currentStock} יחידות זמינות במלאי
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
