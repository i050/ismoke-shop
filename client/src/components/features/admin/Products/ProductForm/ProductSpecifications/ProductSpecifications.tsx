// ProductSpecifications - ניהול מפרט טכני למוצר
// מטרת הקומפוננטה: מאפשרת למנהל להוסיף, לערוך ולמחוק מאפייני מפרט טכני בפורמט key-value

import React, { useCallback } from 'react';
import { Input, Button, Icon } from '@/components/ui';
import styles from './ProductSpecifications.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface Specification {
  key: string;
  value: string;
}

interface ProductSpecificationsProps {
  /** רשימת המפרט הטכני הנוכחית */
  specifications: Specification[];
  /** פונקציה לעדכון רשימת המפרט */
  onChange: (specifications: Specification[]) => void;
  /** האם הטופס במצב שמירה/loading */
  disabled?: boolean;
  /** שגיאות validation */
  errors?: {
    specifications?: Array<{ key?: string; value?: string }>;
  };
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({
  specifications,
  onChange,
  disabled = false,
  errors = {},
}) => {
  // 🔍 DEBUG: בדיקת specifications שמתקבלים ונשלחים
  console.log('📋 [ProductSpecifications] specifications:', specifications);
  
  // הוספת מאפיין חדש
  const handleAddSpecification = useCallback(() => {
    const newSpecs = [...specifications, { key: '', value: '' }];
    console.log('📋 [ProductSpecifications] Adding new spec, calling onChange with:', newSpecs);
    onChange(newSpecs);
  }, [specifications, onChange]);

  // עדכון מאפיין קיים
  const handleUpdateSpecification = useCallback(
    (index: number, field: 'key' | 'value', newValue: string) => {
      const updated = [...specifications];
      updated[index] = { ...updated[index], [field]: newValue };
      console.log('📋 [ProductSpecifications] Updating spec, calling onChange with:', updated);
      onChange(updated);
    },
    [specifications, onChange]
  );

  // מחיקת מאפיין
  const handleRemoveSpecification = useCallback(
    (index: number) => {
      const updated = specifications.filter((_, i) => i !== index);
      onChange(updated);
    },
    [specifications, onChange]
  );

  // הזזת מאפיין למעלה
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...specifications];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      onChange(updated);
    },
    [specifications, onChange]
  );

  // הזזת מאפיין למטה
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === specifications.length - 1) return;
      const updated = [...specifications];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      onChange(updated);
    },
    [specifications, onChange]
  );

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>מפרט טכני</h3>
        <p className={styles.subtitle}>
          הוסף מאפיינים טכניים למוצר (לא חובה). לדוגמה: קיבולת סוללה, חומר, משקל וכו'
        </p>
      </div>

      {/* רשימת המאפיינים */}
      <div className={styles.specificationsList}>
        {specifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="FileText" size={32} className={styles.emptyIcon} />
            <p className={styles.emptyText}>אין מאפייני מפרט טכני</p>
            <p className={styles.emptySubtext}>לחץ על "הוסף מאפיין" כדי להתחיל</p>
          </div>
        ) : (
          specifications.map((spec, index) => {
            const specErrors = errors.specifications?.[index];
            return (
              <div key={index} className={styles.specificationRow}>
                {/* כפתורי הזזה */}
                <div className={styles.reorderButtons}>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => handleMoveUp(index)}
                    disabled={disabled || index === 0}
                    aria-label="הזז למעלה"
                  >
                    <Icon name="ChevronUp" size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => handleMoveDown(index)}
                    disabled={disabled || index === specifications.length - 1}
                    aria-label="הזז למטה"
                  >
                    <Icon name="ChevronDown" size={16} />
                  </button>
                </div>

                {/* שדה מפתח */}
                <div className={styles.inputWrapper}>
                  <Input
                    id={`spec-key-${index}`}
                    name={`spec-key-${index}`}
                    label="שם המאפיין"
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleUpdateSpecification(index, 'key', e.target.value)}
                    placeholder="לדוגמה: קיבולת סוללה"
                    disabled={disabled}
                    error={!!specErrors?.key}
                    helperText={specErrors?.key}
                    size="medium"
                  />
                </div>

                {/* שדה ערך */}
                <div className={styles.inputWrapper}>
                  <Input
                    id={`spec-value-${index}`}
                    name={`spec-value-${index}`}
                    label="ערך"
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleUpdateSpecification(index, 'value', e.target.value)}
                    placeholder="לדוגמה: 1500mAh"
                    disabled={disabled}
                    error={!!specErrors?.value}
                    helperText={specErrors?.value}
                    size="medium"
                  />
                </div>

                {/* כפתור מחיקה */}
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveSpecification(index)}
                  disabled={disabled}
                  aria-label="מחק מאפיין"
                >
                  <Icon name="Trash2" size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* כפתור הוספה */}
      <div className={styles.addButtonWrapper}>
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Icon name="Plus" size={18} />}
          onClick={handleAddSpecification}
          disabled={disabled || specifications.length >= 50}
        >
          הוסף מאפיין
        </Button>
        {specifications.length >= 50 && (
          <span className={styles.limitWarning}>
            הגעת למקסימום 50 מאפיינים
          </span>
        )}
      </div>

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipIcon}>💡</div>
        <div className={styles.tipContent}>
          <strong>טיפים למפרט טכני איכותי:</strong>
          <ul>
            <li>השתמש בשמות ברורים וקצרים למאפיינים</li>
            <li>ציין יחידות מידה (ג'ראם, מ"מ, mAh וכו')</li>
            <li>סדר את המאפיינים לפי חשיבות</li>
            <li>הימנע מכפילויות עם התיאור הכללי</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductSpecifications;
