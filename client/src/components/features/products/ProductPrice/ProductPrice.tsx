import React from 'react';
import type { PricingData } from '../../../../types';
import { Icon } from '../../../ui/Icon';
import styles from './ProductPrice.module.css';

// Props של רכיב המחיר
interface ProductPriceProps {
  pricing?: PricingData;      // נתוני המחיר מהשרת (אופציונלי)
  basePrice?: number;         // מחיר בסיס (אופציונלי)
  variantModifier?: number;   // תוספת מחיר לווריאנט (אופציונלי)
  size?: 'small' | 'medium' | 'large'; // גודל התצוגה
  className?: string;         // CSS class נוסף
}

/**
 * רכיב להצגת מחיר מוצר עם תמיכה במחירים דינמיים
 * מציג מחיר רגיל למשתמש לא מחובר או מחיר מוזל למשתמש עם הנחה
 */
const ProductPrice: React.FC<ProductPriceProps> = ({ 
  pricing, 
  basePrice,
  variantModifier = 0,
  size = 'medium', 
  className = '' 
}) => {
  
  // פורמט מחיר בשקלים עם פסיקים
  const formatPrice = (price: number): string => {
    return `₪${price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // חישוב מחיר סופי - אם יש basePrice מפורש (כולל override), השתמש בו
  const calculateFinalPrice = (): number => {
    // אם יש pricing מהשרת עם הנחה, השתמש בסופי שלו
    if (pricing?.hasDiscount) {
      return pricing.finalPrice;
    }
    // אם יש basePrice מפורש (כולל SKU override)
    if (basePrice !== undefined) {
      return basePrice + variantModifier;
    }
    // אחרת, אם יש pricing מהשרת
    if (pricing) {
      return pricing.finalPrice;
    }
    return variantModifier;
  };

  const finalPrice = calculateFinalPrice();

  // חישוב מחיר מקורי (לפני הנחה)
  const calculateOriginalPrice = (): number => {
    // אם יש pricing מהשרת, השתמש במחיר המקורי שלו
    if (pricing?.originalPrice !== undefined) {
      return pricing.originalPrice;
    }
    if (basePrice !== undefined) {
      return basePrice + variantModifier;
    }
    return finalPrice;
  };

  const originalPrice = calculateOriginalPrice();

  // אם יש נתוני pricing מהשרת ויש הנחה
  if (pricing && pricing.hasDiscount) {
    return (
      <div className={`${styles.priceContainer} ${styles[size]} ${className}`}>
        {/* מחיר סופי מוזל */}
        <span className={styles.discountedPrice}>
          {formatPrice(finalPrice)}
        </span>
        
        {/* מחיר מקורי מחוק */}
        <span className={styles.originalPrice}>
          {formatPrice(originalPrice)}
        </span>
        
        {/* שם קבוצת הלקוח + אחוז הנחה */}
        {pricing.customerGroupName && (
          <span className={styles.groupName}>
            {pricing.customerGroupName} • {pricing.discountPercentage}%
          </span>
        )}
      </div>
    );
  }

  // מחיר רגיל (ללא הנחה)
  return (
    <div className={`${styles.priceContainer} ${styles[size]} ${className}`}>
      <span className={styles.currentPrice}>
        {formatPrice(finalPrice)}
      </span>
    </div>
  );
};

export default ProductPrice;
