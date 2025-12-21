// ProductBasicInfo - מידע בסיסי על המוצר
// מטרת הקומפוננטה: טופס למילוי מידע בסיסי (שם, תיאור, מותג)

import React, { useState, useCallback } from 'react';
import { Input } from '../../../../../ui/Input/Input';
import styles from './ProductBasicInfo.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface ProductBasicInfoProps {
  /** ערכי השדות הנוכחיים */
  values: {
    name: string;
    description: string;
    brand: string | null;
  };
  /** שגיאות validation לפי שם שדה */
  errors?: {
    name?: string;
    description?: string;
    brand?: string;
  };
  /** פונקציה שמופעלת כשמשנים ערך בשדה */
  onChange: (field: 'name' | 'description' | 'brand', value: string) => void;
  /** האם הטופס במצב שמירה/loading */
  disabled?: boolean;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({
  values,
  errors = {},
  onChange,
  disabled = false,
}) => {
  // מעקב אחרי כמות תווים בתיאור
  const [descriptionLength, setDescriptionLength] = useState(
    values.description?.length || 0
  );

  // טיפול בשינוי שם המוצר
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('name', e.target.value);
    },
    [onChange]
  );

  // טיפול בשינוי תיאור המוצר
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setDescriptionLength(newValue.length);
      onChange('description', newValue);
    },
    [onChange]
  );

  // טיפול בשינוי מותג
  const handleBrandChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('brand', e.target.value);
    },
    [onChange]
  );

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>מידע בסיסי</h3>
        <p className={styles.subtitle}>
          הגדר את השם, התיאור והמותג של המוצר
        </p>
      </div>

      {/* שדות הטופס */}
      <div className={styles.form}>
        {/* שם המוצר */}
        <div className={styles.formGroup}>
          <Input
            id="product-name"
            name="name"
            label="שם המוצר"
            type="text"
            value={values.name}
            onChange={handleNameChange}
            placeholder="למשל: ASPIRE NEXI PRO KIT"
            disabled={disabled}
            required
            error={!!errors.name}
            helperText={errors.name?.message || (!values.name ? 'מינימום 3 תווים, מקסימום 200 תווים' : undefined)}
            size="large"
          />
        </div>

        {/* תיאור המוצר */}
        <div className={styles.formGroup}>
          <label htmlFor="product-description" className={styles.label}>
            תיאור המוצר
            <span className={styles.required}>*</span>
          </label>
          
          <textarea
            id="product-description"
            name="description"
            value={values.description}
            onChange={handleDescriptionChange}
            placeholder="תאר את המוצר בפירוט - תכונות, יתרונות, שימושים..."
            disabled={disabled}
            required
            className={`${styles.textarea} ${errors.description ? styles.error : ''} ${disabled ? styles.disabled : ''}`}
            rows={6}
            maxLength={5000}
          />
          
          {/* מונה תווים */}
          <div className={styles.textareaFooter}>
            <div className={styles.charCounter}>
              <span className={descriptionLength < 10 ? styles.warning : descriptionLength > 4500 ? styles.danger : ''}>
                {descriptionLength}
              </span>
              <span className={styles.charCounterSeparator}>/</span>
              <span>5000</span>
            </div>
            
            {/* הודעת שגיאה או עזרה */}
            {errors.description ? (
              <div className={styles.errorText}>
                {errors.description}
              </div>
            ) : (
              <div className={styles.helperText}>
                מינימום 10 תווים, מומלץ 100-500 תווים לתיאור איכותי
              </div>
            )}
          </div>
        </div>

        {/* מותג */}
        <div className={styles.formGroup}>
          <Input
            id="product-brand"
            name="brand"
            label="מותג"
            type="text"
            value={values.brand || ''}
            onChange={handleBrandChange}
            placeholder="למשל: ASPIRE, SMOK, VAPORESSO"
            disabled={disabled}
            error={!!errors.brand}
            helperText={errors.brand || 'אופציונלי - השאר ריק אם המוצר ללא מותג'}
            size="medium"
          />
        </div>
      </div>

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipIcon}>💡</div>
        <div className={styles.tipContent}>
          <strong>טיפים לכתיבת תיאור איכותי:</strong>
          <ul>
            <li>פרט על התכונות והיתרונות המרכזיים</li>
            <li>ציין למי המוצר מיועד</li>
            <li>הוסף מידע טכני רלוונטי</li>
            <li>השתמש בשפה ברורה ומקצועית</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductBasicInfo;
