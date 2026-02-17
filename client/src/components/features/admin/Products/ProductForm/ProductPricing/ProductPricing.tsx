// Product Pricing Component
// מטרת הקומפוננטה: טיפול במחירי המוצר עם חישוב אוטומטי של אחוז הנחה

import React, { useCallback, useMemo } from 'react';
import { Input } from '../../../../../ui/Input';
import { calculateDiscountPercentage } from '../../../../../../schemas/productFormSchema';
import styles from './ProductPricing.module.css';

/**
 * Props של קומפוננטת ProductPricing
 */
interface ProductPricingProps {
  values: {
    basePrice: number | null;
    compareAtPrice: number | null;
  };
  errors?: {
    basePrice?: string;
    compareAtPrice?: string;
  };
  onChange: (field: 'basePrice' | 'compareAtPrice', value: number | null) => void;
  disabled?: boolean;
}

/**
 * קומפוננטת ProductPricing
 * מציגה שדות מחיר בסיס ומחיר להשוואה עם חישוב אוטומטי של אחוז הנחה
 * כוללת preview ויזואלי של ההנחה
 */
const ProductPricing: React.FC<ProductPricingProps> = ({
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  // חישוב אחוז הנחה בזמן אמת
  const discountPercentage = useMemo(() => {
    if (!values.basePrice || !values.compareAtPrice) {
      return null;
    }
    return calculateDiscountPercentage(values.basePrice, values.compareAtPrice);
  }, [values.basePrice, values.compareAtPrice]);

  // טיפול בשינוי מחיר בסיס
  const handleBasePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // אם השדה ריק
      if (value === '') {
        onChange('basePrice', null);
        return;
      }

      // המרה למספר
      const numValue = parseFloat(value);
      
      // בדיקת תקינות
      if (!isNaN(numValue) && numValue >= 0) {
        onChange('basePrice', numValue);
      }
    },
    [onChange]
  );

  // טיפול בשינוי מחיר להשוואה
  const handleCompareAtPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // אם השדה ריק
      if (value === '') {
        onChange('compareAtPrice', null);
        return;
      }

      // המרה למספר
      const numValue = parseFloat(value);
      
      // בדיקת תקינות
      if (!isNaN(numValue) && numValue >= 0) {
        onChange('compareAtPrice', numValue);
      }
    },
    [onChange]
  );

  // חישוב סטטוס ההנחה
  const discountStatus = useMemo(() => {
    if (!values.basePrice || !values.compareAtPrice) {
      return null;
    }

    if (values.compareAtPrice <= values.basePrice) {
      return {
        type: 'error' as const,
        message: 'מחיר להשוואה חייב להיות גבוה ממחיר הבסיס',
      };
    }

    if (discountPercentage && discountPercentage > 0) {
      return {
        type: 'success' as const,
        message: `חיסכון של ${discountPercentage}%`,
      };
    }

    return null;
  }, [values.basePrice, values.compareAtPrice, discountPercentage]);

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>תמחור</h3>
        <p className={styles.subtitle}>הגדר את מחירי המוצר והצג הנחות</p>
      </div>

      {/* שדות מחיר */}
      <div className={styles.priceFields}>
        {/* מחיר בסיס */}
        <div className={styles.formGroup}>
          <Input
            label="מחיר בסיס"
            type="number"
            value={values.basePrice?.toString() || ''}
            onChange={handleBasePriceChange}
            error={!!errors?.basePrice}
            helperText={errors?.basePrice?.message || (!values.basePrice || values.basePrice === 0 ? 'חייב להיות מספר חיובי (מחיר המוצר ללקוח)' : undefined)}
            disabled={disabled}
            required
            placeholder="0.00"
          />
        </div>

        {/* מחיר להשוואה */}
        <div className={styles.formGroup}>
          <Input
            label="מחיר לפני הנחה (אופציונלי)"
            type="number"
            value={values.compareAtPrice?.toString() || ''}
            onChange={handleCompareAtPriceChange}
            error={!!errors?.compareAtPrice}
            helperText={
              errors?.compareAtPrice ||
              'המחיר המקורי לפני הנחה - להצגת חיסכון'
            }
            disabled={disabled}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Preview של ההנחה */}
      {discountStatus && (
        <div
          className={`${styles.discountPreview} ${
            discountStatus.type === 'error'
              ? styles.discountPreviewError
              : styles.discountPreviewSuccess
          }`}
        >
          <div className={styles.discountIcon}>
            {discountStatus.type === 'error' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            )}
          </div>
          <span className={styles.discountMessage}>{discountStatus.message}</span>
        </div>
      )}

      {/* תצוגה חזותית של המחירים */}
      {values.basePrice && values.basePrice > 0 && (
        <div className={styles.priceDisplay}>
          <div className={styles.priceDisplayHeader}>תצוגה מקדימה</div>
          <div className={styles.priceDisplayBody}>
            {values.compareAtPrice && values.compareAtPrice > values.basePrice && (
              <div className={styles.comparePrice}>
                <span className={styles.comparePriceLabel}>לפני:</span>
                <span className={styles.comparePriceValue}>
                  ₪{values.compareAtPrice.toFixed(2)}
                </span>
              </div>
            )}
            <div className={styles.currentPrice}>
              <span className={styles.currentPriceLabel}>מחיר נוכחי:</span>
              <span className={styles.currentPriceValue}>
                ₪{values.basePrice.toFixed(2)}
              </span>
            </div>
            {discountPercentage && discountPercentage > 0 && (
              <div className={styles.savingsBadge}>
                <span className={styles.savingsText}>
                  חסכון של {discountPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* טיפים */}
      {/* <div className={styles.tips}>
        <div className={styles.tipsHeader}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>טיפים לתמחור</span>
        </div>
        <ul className={styles.tipsList}>
          <li>מחיר בסיס הוא המחיר שהלקוח ישלם בפועל</li>
          <li>מחיר להשוואה משמש להצגת הנחה (למשל "היה: 100₪, עכשיו: 80₪")</li>
          <li>מחיר להשוואה חייב להיות גבוה ממחיר הבסיס כדי להציג חיסכון</li>
          <li>השאר את מחיר ההשוואה ריק אם אין הנחה</li>
        </ul>
      </div> */}
    </div>
  );
};

export default ProductPricing;
