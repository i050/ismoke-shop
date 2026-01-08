/**
 * SizeRow Component
 * =================
 * שורת מידה בודדת בתוך פאנל צבע
 * מציגה: שם מידה, מלאי, מחיר, סטטוס, כפתור מחיקה
 * עריכה inline של מלאי ומחיר
 */

import React, { useCallback } from 'react';
import type { ColorSizeEntry } from '../utils/skuGrouping';
import styles from './SizeRow.module.css';

// ============================================================================
// Props Interface
// ============================================================================

interface SizeRowProps {
  /** נתוני המידה */
  size: ColorSizeEntry;
  /** אינדקס המידה בקבוצה */
  index: number;
  /** callback לעדכון שדה */
  onUpdate: (field: keyof ColorSizeEntry, value: any) => void;
  /** callback למחיקה */
  onDelete: () => void;
  /** האם מושבת */
  disabled?: boolean;
  /** מחיר בסיס (להצגה אם אין מחיר ספציפי) */
  basePrice?: number;
  /** 🆕 הסתר את עמודת המידה (למקרה ללא ציר משני) */
  hideSize?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const SizeRow: React.FC<SizeRowProps> = ({
  size,
  index,
  onUpdate,
  onDelete,
  disabled = false,
  basePrice = 0,
  hideSize = false,
}) => {
  // Handler לשינוי מלאי
  const handleStockChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onUpdate('stockQuantity', isNaN(value) ? 0 : Math.max(0, value));
  }, [onUpdate]);

  // Handler לשינוי מחיר
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onUpdate('price', null); // ריק = שימוש ב-basePrice
    } else {
      const numValue = parseFloat(value);
      onUpdate('price', isNaN(numValue) ? null : Math.max(0, numValue));
    }
  }, [onUpdate]);

  // Handler לשינוי סטטוס
  const handleActiveToggle = useCallback(() => {
    onUpdate('isActive', !size.isActive);
  }, [size.isActive, onUpdate]);

  // מחיר להצגה - ספציפי או basePrice
  const isUsingBasePrice = size.price === null || size.price === undefined;

  return (
    <tr className={`${styles.row} ${!size.isActive ? styles.inactive : ''}`}>
      {/* מידה - מוסתר אם hideSize */}
      {!hideSize && (
        <td className={styles.sizeCell}>
          <span className={styles.sizeLabel}>{size.size || `#${index + 1}`}</span>
        </td>
      )}

      {/* קוד SKU */}
      <td className={styles.skuCell}>
        <code className={styles.skuCode}>{size.sku}</code>
      </td>

      {/* מלאי */}
      <td className={styles.stockCell}>
        <input
          type="number"
          className={styles.stockInput}
          value={size.stockQuantity}
          onChange={handleStockChange}
          min={0}
          disabled={disabled}
          aria-label={`מלאי למידה ${size.size}`}
        />
      </td>

      {/* מחיר */}
      <td className={styles.priceCell}>
        <div className={styles.priceWrapper}>
          <input
            type="number"
            className={`${styles.priceInput} ${isUsingBasePrice ? styles.usingBase : ''}`}
            value={size.price ?? ''}
            onChange={handlePriceChange}
            min={0}
            step={0.01}
            placeholder={`₪${basePrice}`}
            disabled={disabled}
            aria-label={`מחיר למידה ${size.size}`}
          />
          {isUsingBasePrice && (
            <span className={styles.basePriceHint} title="משתמש במחיר הבסיס">
              בסיס
            </span>
          )}
        </div>
      </td>

      {/* סטטוס */}
      <td className={styles.statusCell}>
        <button
          type="button"
          className={`${styles.statusButton} ${size.isActive ? styles.active : styles.inactive}`}
          onClick={handleActiveToggle}
          disabled={disabled}
          title={size.isActive ? 'לחץ לכיבוי' : 'לחץ להפעלה'}
        >
          {size.isActive ? '✓ פעיל' : '✗ כבוי'}
        </button>
      </td>

      {/* פעולות - מוסתר אם hideSize (ללא ציר משני - מוחקים את הצבע כולו) */}
      {!hideSize && (
        <td className={styles.actionsCell}>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={onDelete}
            disabled={disabled}
            title="מחק מידה"
            aria-label={`מחק מידה ${size.size}`}
          >
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14H7L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  );
};

export default SizeRow;
