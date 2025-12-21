// ProductsTableHeader - כותרת טבלת המוצרים
// מטרת הקומפוננטה: הצגת כפתור הוספת מוצר + מונה סה"כ מוצרים

import React from 'react';
import { Button, Icon } from '../../../../../ui';
import styles from './ProductsTableHeader.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface ProductsTableHeaderProps {
  /** מספר המוצרים הכולל */
  totalCount: number;
  /** פונקציה להפעלה בלחיצה על "הוסף מוצר" */
  onAddProduct: () => void;
  /** האם בטעינה */
  loading?: boolean;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductsTableHeader: React.FC<ProductsTableHeaderProps> = ({
  totalCount,
  onAddProduct,
  loading = false
}) => {
  return (
    <div className={styles.header}>
      {/* אזור ימין - כותרת ומונה */}
      <div className={styles.headerInfo}>
        <h2 className={styles.title}>רשימת מוצרים</h2>
        <span className={styles.counter}>
          {loading ? (
            <>
              <Icon name="Clock" className={styles.spinner} />
              טוען...
            </>
          ) : (
            <>סה"כ {totalCount} מוצרים</>
          )}
        </span>
      </div>

      {/* אזור שמאל - כפתור הוסף */}
      <div className={styles.headerActions}>
        <Button
          variant="primary"
          size="lg"
          onClick={onAddProduct}
          disabled={loading}
        >
          <Icon name="Plus" />
          הוסף מוצר חדש
        </Button>
      </div>
    </div>
  );
};

export default ProductsTableHeader;
