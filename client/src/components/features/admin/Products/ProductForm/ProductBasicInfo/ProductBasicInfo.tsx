// ProductBasicInfo - מידע בסיסי על המוצר
// מטרת הקומפוננטה: טופס למילוי מידע בסיסי (שם, תיאור, מותג)
// כולל: מונה תווים לשם המוצר ו-textarea לתיאור

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Input } from '../../../../../ui/Input/Input';
import { BrandService, type Brand } from '../../../../../../services/brandService';
import { buildProductBrandOptions } from '../productBrandState';
import styles from './ProductBasicInfo.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface ProductBasicInfoProps {
  /** ערכי השדות הנוכחיים */
  values: {
    name: string;
    subtitle?: string; // שם משני אופציונלי
    description: string;
    brand: string | null;
  };
  /** שגיאות validation לפי שם שדה */
  errors?: {
    name?: string;
    subtitle?: string;
    description?: string;
    brand?: string;
  };
  /** פונקציה שמופעלת כשמשנים ערך בשדה */
  onChange: (field: 'name' | 'subtitle' | 'description' | 'brand', value: string) => void;
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
  // מותגים לבחירה
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [brandsLoadError, setBrandsLoadError] = useState(false);

  // טעינת מותגים
  useEffect(() => {
    let ignore = false;

    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        setBrandsLoadError(false);
        const data = await BrandService.getAllBrands();
        if (!ignore) {
          setBrands(data);
        }
      } catch (error) {
        console.error('Failed to load brands:', error);
        if (!ignore) {
          setBrands([]);
          setBrandsLoadError(true);
        }
      } finally {
        if (!ignore) {
          setLoadingBrands(false);
        }
      }
    };

    void fetchBrands();

    return () => {
      ignore = true;
    };
  }, []);

  const brandOptions = useMemo(
    () => buildProductBrandOptions(brands, values.brand),
    [brands, values.brand]
  );

  // מעקב אחרי כמות תווים בשם המוצר
  const nameLength = values.name?.length || 0;
  
  // מעקב אחרי כמות תווים בתיאור
  const descriptionLength = values.description?.length || 0;

  // צבע מונה תווים לשם המוצר
  const nameCounterClass = useMemo(() => {
    if (nameLength === 0) return styles.counterEmpty;
    if (nameLength < 3) return styles.counterDanger;
    if (nameLength <= 150) return styles.counterGood;
    if (nameLength <= 200) return styles.counterWarning;
    return styles.counterDanger;
  }, [nameLength]);

  // טיפול בשינוי שם המוצר
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('name', e.target.value);
    },
    [onChange]
  );

  // טיפול בשינוי שם משני
  const handleSubtitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('subtitle', e.target.value);
    },
    [onChange]
  );

  // טיפול בשינוי תיאור המוצר
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange('description', e.target.value);
    },
    [onChange]
  );

  // טיפול בשינוי מותג
  const handleBrandChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
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
          הגדר את השם והתיאור של המוצר
        </p>
      </div>

      {/* שדות הטופס */}
      <div className={styles.form}>
        {/* שם המוצר - עם מונה תווים */}
        <div className={styles.formGroup}>
          <label htmlFor="product-name" className={styles.label}>
            שם המוצר
            <span className={styles.required}>*</span>
          </label>
          <Input
            id="product-name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleNameChange}
            placeholder="למשל: חולצת טי טקסטורה"
            disabled={disabled}
            required
            error={!!errors.name}
            size="large"
            maxLength={200}
          />
          <div className={styles.fieldFooter}>
            <span className={`${styles.charCounter} ${nameCounterClass}`}>
              {nameLength}/200
            </span>
            {errors.name?.message ? (
              <span className={styles.errorText}>{errors.name.message}</span>
            ) : (
              <span className={styles.helperText}>
                {nameLength < 3 ? 'מינימום 3 תווים' : 'שם ברור ותיאורי של המוצר'}
              </span>
            )}
          </div>
        </div>

        {/* שם משני אופציונלי */}
        <div className={styles.formGroup}>
          <Input
            id="product-subtitle"
            name="subtitle"
            label="שם משני (אופציונלי)"
            type="text"
            value={values.subtitle || ''}
            onChange={handleSubtitleChange}
            placeholder="למשל: הטכנולוגיה המתקדמת ביותר"
            disabled={disabled}
            error={!!errors.subtitle}
            helperText={errors.subtitle?.message || 'יוצג מתחת לשם המוצר בצבע בהיר יותר'}
            size="medium"
          />
        </div>

        {/* תיאור המוצר - textarea פשוט */}
        <div className={styles.formGroup}>
          <label htmlFor="product-description" className={styles.label}>
            תיאור המוצר
            <span className={styles.required}>*</span>
          </label>
          
          <textarea
            id="product-description"
            name="description"
            value={values.description || ''}
            onChange={handleDescriptionChange}
            placeholder="תאר את המוצר בפירוט - תכונות, יתרונות, שימושים...&#10;ירידת שורה תישמר ותוצג בדף המוצר"
            disabled={disabled}
            maxLength={5000}
            rows={6}
            className={`${styles.textarea} ${errors.description ? styles.textareaError : ''}`}
          />
          
          <div className={styles.fieldFooter}>
            <span className={styles.charCounter}>
              {descriptionLength}/5000
            </span>
            {errors.description?.message && (
              <span className={styles.errorText}>
                {errors.description.message}
              </span>
            )}
          </div>
        </div>

        {/* מותג */}
        <div className={styles.formGroup}>
          <label htmlFor="product-brand" className={styles.label}>
            מותג
          </label>
          <select
            id="product-brand"
            name="brand"
            value={values.brand || ''}
            onChange={handleBrandChange}
            disabled={disabled || loadingBrands || brandsLoadError}
            className={`${styles.select} ${errors.brand ? styles.selectError : ''}`}
          >
            <option value="">
              {loadingBrands ? 'טוען מותגים...' : 'ללא מותג'}
            </option>
            {brandOptions.map((brand) => (
              <option key={brand.key} value={brand.value} disabled={brand.disabled}>
                {brand.label}
              </option>
            ))}
          </select>
          {errors.brand && (
            <span className={styles.errorText}>{errors.brand}</span>
          )}
          {brandsLoadError ? (
            <span className={styles.errorText} role="alert">
              לא ניתן לטעון כרגע את רשימת המותגים. המותג הקיים יישמר ללא שינוי.
            </span>
          ) : (
            <span className={styles.helperText}>
              אופציונלי - בחר מותג מהרשימה או השאר ריק
            </span>
          )}
        </div>
      </div>

      {/* טיפים */}
      {/* <div className={styles.tips}>
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
      </div> */}
    </div>
  );
};

export default ProductBasicInfo;
