import React, { useState, useRef, useEffect } from 'react';
import type { Product, Sku } from '../../../../../../types';
import Checkbox from '../../../../../ui/Checkbox';
import { Button } from '../../../../../ui/Button';
import { Icon } from '../../../../../ui/Icon';
import { getColorNameHebrew } from '../../../../../../utils/colorUtils';
import styles from './ProductRow.module.css';
import { ProductService } from '../../../../../../services/productService'; // Prefetch optimization on hover

/**
 * ProductRow - שורת מוצר בטבלת ניהול מוצרים
 * Phase 4.4: MVP Table Row
 * Phase 4.7.5: עדכון onSelect ללא selected parameter
 * Phase 7: הוספת כפתור שחזור למוצרים לא פעילים
 * Phase 7.1: הוספת חלונית פירוט מלאי לפי SKU
 */

interface ProductRowProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  // Phase 7: פח אשפה - callback לשחזור מוצר
  onRestore?: (productId: string) => void;
  // Phase 7.2: מחיקה לצמיתות - פעולה בלתי הפיכה
  onPermanentlyDelete?: (productId: string) => void;
  // Phase 7: האם אנחנו בתצוגת מוצרים נמחקים
  isDeletedView?: boolean;
  /** סף מלאי נמוך גלובלי מהגדרות החנות */
  globalLowStockThreshold?: number;
}

export const ProductRow: React.FC<ProductRowProps> = ({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onRestore,
  onPermanentlyDelete,
  isDeletedView = false,
  globalLowStockThreshold = 5,
}) => {
  // State לחלונית פירוט SKUs
  const [isSkuPopoverOpen, setIsSkuPopoverOpen] = useState(false);
  const skuPopoverRef = useRef<HTMLDivElement>(null);
  const skuButtonRef = useRef<HTMLButtonElement>(null);

  // סגירת הפופאובר בלחיצה מחוץ לו
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSkuPopoverOpen &&
        skuPopoverRef.current &&
        !skuPopoverRef.current.contains(event.target as Node) &&
        skuButtonRef.current &&
        !skuButtonRef.current.contains(event.target as Node)
      ) {
        setIsSkuPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSkuPopoverOpen]);

  // פונקציה לפורמט מחיר בטוח - מונעת שגיאות כאשר המחיר לא מוגדר
  const formatPrice = (price: number | undefined | null): string => {
    if (price == null) return '—';
    const numPrice = Number(price);
    return Number.isFinite(numPrice) ? numPrice.toFixed(2) : '—';
  };

  // תמונה ראשונה או placeholder
  // תומך במבנה חדש (Spaces: thumbnail/medium) ומבנה ישן (Cloudinary: url)
  const mainImage = product.images?.[0]?.thumbnail || product.images?.[0]?.medium || product.images?.[0]?.url || '/ismoke-placeholder.png';

  // רף מלאי נמוך - משתמש בערך המותאם אישית של המוצר או ברירת מחדל גלובלית
  const lowStockThreshold = product.lowStockThreshold ?? globalLowStockThreshold;

  // Phase 7.1: חישוב מצב מלאי - מתחשב במצב הגרוע ביותר מבין כל ה-SKUs
  // אם יש SKU שאזל - אדום, אם יש SKU נמוך - כתום, אחרת - ירוק
  const stockStatus = (() => {
    // אם אין מלאי בכלל - אזל
    if (product.quantityInStock === 0) return 'outOfStock';
    
    // אם יש SKUs - בדוק את המצב הגרוע ביותר
    if (product.skus && product.skus.length > 0) {
      const skuLowThreshold = Math.min(lowStockThreshold, 5);
      let hasLowStock = false;
      
      for (const sku of product.skus) {
        // אם יש SKU שאזל - מחזירים אדום מיד (גובר על הכל)
        if (sku.stockQuantity === 0) {
          return 'outOfStock';
        }
        // אם יש SKU במלאי נמוך - מסמנים (אבל ממשיכים לחפש אזל)
        if (sku.stockQuantity <= skuLowThreshold) {
          hasLowStock = true;
        }
      }
      
      // אם מצאנו מלאי נמוך (ולא מצאנו אזל) - כתום
      if (hasLowStock) return 'lowStock';
    }
    
    // ברירת מחדל לפי הסכום הכולל (למוצרים בלי SKUs)
    if (product.quantityInStock <= lowStockThreshold) return 'lowStock';
    
    return 'inStock';
  })();

  // טקסט מלאי
  const stockText = product.quantityInStock > 0
    ? `${product.quantityInStock} יחידות`
    : 'אזל מהמלאי';

  // האם יש SKUs למוצר
  const hasSkus = product.skus && product.skus.length > 0;

  /**
   * קביעת מצב מלאי של SKU בודד
   */
  const getSkuStockStatus = (sku: Sku): 'inStock' | 'lowStock' | 'outOfStock' => {
    if (sku.stockQuantity === 0) return 'outOfStock';
    // משתמשים ברף של המוצר או ברירת מחדל של 5 ל-SKU בודד
    const skuLowThreshold = Math.min(lowStockThreshold, 5);
    if (sku.stockQuantity <= skuLowThreshold) return 'lowStock';
    return 'inStock';
  };

  /**
   * פורמט שם SKU - מציג צבע (בעברית מ-HEX) ומידה אם יש
   */
  const formatSkuName = (sku: Sku): string => {
    const parts: string[] = [];
    // המרת קוד HEX לשם צבע בעברית
    if (sku.color) parts.push(getColorNameHebrew(sku.color));
    if (sku.attributes?.size) parts.push(sku.attributes.size);
    if (parts.length === 0) return sku.name || sku.sku;
    return parts.join(' / ');
  };

  // תיאור מקוצר (50 תווים)
  const shortDescription = product.description?.length > 50
    ? product.description.substring(0, 50) + '...'
    : product.description || 'אין תיאור';

  return (
    <tr
      className={styles.row}
      onPointerEnter={() => {
        // Prefetch product details when hovering row to speed up edit flow
        ProductService.preFetchProductById(product._id);
      }}
    >
      {/* עמודת Checkbox */}
      {/* <td className={styles.cellCheckbox}>
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(product._id)}
        />
      </td> */}

      {/* עמודת תמונה */}
      <td className={styles.cellImage}>
        <div className={styles.imageWrapper}>
          <img
            src={mainImage}
            alt={product.name}
            className={styles.image}
            loading="lazy"
          />
        </div>
      </td>

      {/* עמודת שם + תיאור */}
      <td className={styles.cellName}>
        <div className={styles.nameWrapper}>
          <span className={styles.productName}>{product.name}</span>
          <span className={styles.productDescription}>{shortDescription}</span>
        </div>
      </td>

      {/* עמודת מחיר */}
      <td className={styles.cellPrice}>
        <span className={styles.price}>₪{formatPrice(product.basePrice)}</span>
      </td>

      {/* עמודת מלאי */}
      <td className={styles.cellStock}>
        <div className={styles.stockWrapper}>
          <span className={`${styles.stockIndicator} ${styles[stockStatus]}`} />
          <span className={styles.stockText}>{stockText}</span>
          
          {/* Phase 7.1: כפתור פתיחת פירוט SKUs */}
          {hasSkus && (
            <div className={styles.skuPopoverContainer}>
              <button
                ref={skuButtonRef}
                className={styles.skuExpandButton}
                onClick={() => setIsSkuPopoverOpen(!isSkuPopoverOpen)}
                title="הצג פירוט מלאי לפי וריאנט"
                aria-expanded={isSkuPopoverOpen}
              >
                <Icon 
                  name={isSkuPopoverOpen ? 'ChevronUp' : 'ChevronDown'} 
                  size={14} 
                />
              </button>
              
              {/* חלונית פירוט SKUs */}
              {isSkuPopoverOpen && (
                <div ref={skuPopoverRef} className={styles.skuPopover}>
                  <div className={styles.skuPopoverHeader}>
                    <span>פירוט מלאי ({product.skus!.length} גירסאות)</span>
                  </div>
                  <ul className={styles.skuList}>
                    {product.skus!.map((sku) => {
                      const skuStatus = getSkuStockStatus(sku);
                      return (
                        <li key={sku._id} className={styles.skuItem}>
                          <span className={styles.skuName}>
                            {formatSkuName(sku)}
                          </span>
                          <span className={`${styles.skuQuantity} ${styles[skuStatus]}`}>
                            {sku.stockQuantity === 0 ? 'אזל' : sku.stockQuantity}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Phase 7: עמודת סטטוס הוסרה - הטאבים מפרידים בין פעילים לנמחקים */}
      {/* <td className={styles.cellStatus}>
        <span className={`${styles.statusBadge} ${product.isActive ? styles.active : styles.inactive}`}>
          {product.isActive ? 'פעיל' : 'לא פעיל'}
        </span>
      </td> */}

      {/* עמודת מכירות */}
      {/* <td className={styles.cellSales}>
        <span className={styles.salesCount}>{product.salesCount || 0}</span>
      </td> */}

      {/* עמודת פעולות */}
      <td className={styles.cellActions}>
        <div className={styles.actions}>
          {/* Phase 7: במצב נמחקים - הצג כפתורי שחזור ומחיקה לצמיתות */}
          {isDeletedView && onRestore ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(product._id)}
                title="שחזר מוצר"
                className={styles.restoreButton}
              >
                <Icon name="RotateCcw" size={16} />
              </Button>
              {/* Phase 7.2: כפתור מחיקה לצמיתות - פעולה בלתי הפיכה */}
              {onPermanentlyDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPermanentlyDelete(product._id)}
                  title="מחק לצמיתות (אין אפשרות לשחזר)"
                  className={styles.deleteButton}
                >
                  <Icon name="Trash2" size={16} />
                </Button>
              )}
            </>
          ) : (
            <>
              {/* כפתורי עריכה ומחיקה רגילים */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(product._id)}
                title="ערוך מוצר"
              >
                <Icon name="Edit" size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(product._id)}
                title="מחק מוצר"
                className={styles.deleteButton}
              >
                <Icon name="Trash2" size={16} />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ProductRow;
