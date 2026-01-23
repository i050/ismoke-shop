/**
 * ProductTypeDialog - דיאלוג לבחירת סוג מוצר בעת יצירה
 * 
 * מציג למנהל שתי אפשרויות:
 * 1. מוצר פשוט - ללא וריאנטים (מידות/צבעים)
 * 2. מוצר עם וריאנטים - עם אפשרות לנהל מידות, צבעים ומלאי לכל וריאנט
 * 
 * מטרה: להסתיר את המורכבות הטכנית (SKUs) מהמנהל ולתת לו חוויה פשוטה
 */

import React from 'react';
import { Package, Palette } from 'lucide-react';
import styles from './ProductTypeDialog.module.css';

export type ProductType = 'simple' | 'variants';

interface ProductTypeDialogProps {
  isOpen: boolean;
  onSelect: (type: ProductType) => void;
  onClose: () => void;
}

export const ProductTypeDialog: React.FC<ProductTypeDialogProps> = ({
  isOpen,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.dialog} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-type-title"
      >
        <div className={styles.header}>
          <h2 id="product-type-title" className={styles.title}>
            איזה סוג מוצר להוסיף?
          </h2>
          <p className={styles.subtitle}>
            בחר את סוג המוצר המתאים לך
          </p>
        </div>

        <div className={styles.options}>
          {/* מוצר פשוט */}
          <button
            type="button"
            className={styles.optionCard}
            onClick={() => onSelect('simple')}
          >
            <div className={styles.iconWrapper}>
              <Package size={32} />
            </div>
            <div className={styles.optionContent}>
              <h3 className={styles.optionTitle}>מוצר פשוט</h3>
              <p className={styles.optionDescription}>
                מוצר אחד עם מחיר אחד ומלאי אחד.
                <br />
                לדוגמה: ספר, מוצר דיגיטלי, מוצר יחיד.
              </p>
            </div>
            <span className={styles.selectHint}>לחץ לבחירה</span>
          </button>

          {/* מוצר עם וריאנטים */}
          <button
            type="button"
            className={styles.optionCard}
            onClick={() => onSelect('variants')}
          >
            <div className={styles.iconWrapper}>
              <Palette size={32} />
            </div>
            <div className={styles.optionContent}>
              <h3 className={styles.optionTitle}>מוצר עם גירסאות</h3>
              <p className={styles.optionDescription}>
                מוצר עם מספר אפשרויות כמו צבעים או מידות.
                <br />
                לדוגמה: חולצה במספר צבעים, נעל במספר מידות.
              </p>
            </div>
            <span className={styles.selectHint}>לחץ לבחירה</span>
          </button>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductTypeDialog;
