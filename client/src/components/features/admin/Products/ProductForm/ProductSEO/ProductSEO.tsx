/**
 * ProductSEO Component
 * מטרת הקומפוננטה: ניהול SEO של המוצר - כותרת, תיאור, slug ותצוגה מקדימה בגוגל
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Input } from '../../../../../ui/Input';
import styles from './ProductSEO.module.css';
import { transliterate } from '../../../../../../utils/translationService';


// ==========================================
// טיפוסים
// ==========================================

export interface ProductSEOValues {
  /** כותרת SEO - מה שמופיע בכרטיסיית הדפדפן ובתוצאות חיפוש */
  seoTitle: string;
  /** תיאור SEO - מה שמופיע מתחת לכותרת בגוגל */
  seoDescription: string;
  /** כתובת URL ידידותית (slug) */
  slug: string;
}

interface ProductSEOProps {
  /** כותרת SEO */
  seoTitle?: string;
  /** תיאור SEO */
  seoDescription?: string;
  /** כתובת URL ידידותית (slug) */
  slug?: string;
  /** שגיאות validation */
  errors?: {
    seoTitle?: string;
    seoDescription?: string;
    slug?: string;
  };
  /** פונקציה לשינוי ערכים */
  onChange: (field: keyof ProductSEOValues, value: string) => void;
  /** שם המוצר - לאכלוס אוטומטי */
  productName?: string;
  /** תיאור המוצר - לאכלוס אוטומטי */
  productDescription?: string;
  /** כתובת בסיס של החנות */
  storeUrl?: string;
  /** האם הטופס במצב loading */
  disabled?: boolean;
}

// ==========================================
// פונקציות עזר
// ==========================================

/**
 * המרת טקסט ל-slug ידידותי ל-URL
 * תומך בתעתיק אוטומטי של עברית לאנגלית (transliteration)
 * פורמט: lowercase, kebab-case, ASCII בלבד
 */
const generateSlug = (text: string): string => {
  if (!text) return '';
  // שלב 1: תעתיק עברית→אנגלית (transliteration)
  const transliteratedText = transliterate(text).replace(/_/g, '-');
  // שלב 2: ניקוי וסטנדרטיזציה
  return transliteratedText
    .trim()
    .toLowerCase()
    // החלפת רווחים במקפים
    .replace(/\s+/g, '-')
    // הסרת תווים מיוחדים (משאיר רק אנגלית, מספרים ומקפים)
    .replace(/[^a-z0-9-]/g, '')
    // הסרת מקפים כפולים
    .replace(/-+/g, '-')
    // הסרת מקפים בהתחלה ובסוף
    .replace(/^-|-$/g, '')
    // הגבלת אורך
    .substring(0, 100);
};

/**
 * קיצור טקסט לאורך מקסימלי עם "..."
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductSEO: React.FC<ProductSEOProps> = ({
  seoTitle = '',
  seoDescription = '',
  slug = '',
  errors = {},
  onChange,
  productName = '',
  productDescription = '',
  storeUrl = 'www.mystore.com',
  disabled = false,
}) => {
  // מעקב אחרי כמות תווים
  const titleLength = seoTitle?.length || 0;
  const descriptionLength = seoDescription?.length || 0;

  // האם השדות מולאו אוטומטית או ידנית
  const [autoFilledTitle, setAutoFilledTitle] = useState(!seoTitle);
  const [autoFilledDescription, setAutoFilledDescription] = useState(!seoDescription);
  const [autoFilledSlug, setAutoFilledSlug] = useState(!slug);

  // ===== אכלוס אוטומטי מהמוצר =====
  useEffect(() => {
    // אכלוס כותרת SEO משם המוצר (אם לא מולא ידנית)
    if (autoFilledTitle && productName && seoTitle !== productName) {
      onChange('seoTitle', productName);
    }
  }, [productName, autoFilledTitle, seoTitle, onChange]);

  useEffect(() => {
    // אכלוס תיאור SEO מתיאור המוצר (אם לא מולא ידנית)
    if (autoFilledDescription && productDescription) {
      const shortDesc = truncateText(productDescription.replace(/\n/g, ' '), 160);
      if (seoDescription !== shortDesc) {
        onChange('seoDescription', shortDesc);
      }
    }
  }, [productDescription, autoFilledDescription, seoDescription, onChange]);

  useEffect(() => {
    // אכלוס slug משם המוצר (אם לא מולא ידנית)
    if (autoFilledSlug && productName) {
      const newSlug = generateSlug(productName);
      if (slug !== newSlug) {
        onChange('slug', newSlug);
      }
    }
  }, [productName, autoFilledSlug, slug, onChange]);

  // ===== Handlers =====

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoFilledTitle(false);
    onChange('seoTitle', e.target.value);
  }, [onChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAutoFilledDescription(false);
    onChange('seoDescription', e.target.value);
  }, [onChange]);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoFilledSlug(false);
    // נרמול הקלט ל-slug תקין
    const normalizedSlug = generateSlug(e.target.value);
    onChange('slug', normalizedSlug);
  }, [onChange]);

  // יצירת slug אוטומטי מחדש
  const handleGenerateSlug = useCallback(() => {
    if (productName) {
      onChange('slug', generateSlug(productName));
      setAutoFilledSlug(true);
    }
  }, [productName, onChange]);

  // ===== חישובי תצוגה =====

  // צבע מונה תווים לכותרת (60 מקסימום מומלץ)
  const titleCounterClass = useMemo(() => {
    if (titleLength === 0) return styles.counterEmpty;
    if (titleLength <= 50) return styles.counterGood;
    if (titleLength <= 60) return styles.counterWarning;
    return styles.counterDanger;
  }, [titleLength]);

  // צבע מונה תווים לתיאור (160 מקסימום מומלץ)
  const descriptionCounterClass = useMemo(() => {
    if (descriptionLength === 0) return styles.counterEmpty;
    if (descriptionLength <= 140) return styles.counterGood;
    if (descriptionLength <= 160) return styles.counterWarning;
    return styles.counterDanger;
  }, [descriptionLength]);

  // תצוגה מקדימה של גוגל
  const googlePreview = useMemo(() => {
    const title = seoTitle || productName || 'שם המוצר';
    const description = seoDescription || productDescription || 'תיאור המוצר יופיע כאן...';
    const slugPart = slug || generateSlug(productName) || 'product-name';
    
    return {
      title: truncateText(title, 60),
      description: truncateText(description.replace(/\n/g, ' '), 160),
      url: `${storeUrl}/products/${slugPart}`,
    };
  }, [seoTitle, seoDescription, slug, productName, productDescription, storeUrl]);

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>אופטימיזציה למנועי חיפוש (SEO)</h3>
          <p className={styles.subtitle}>
            הגדר כיצד המוצר יופיע בתוצאות חיפוש של גוגל
          </p>
        </div>
      </div>

      {/* שדות הטופס */}
      <div className={styles.form}>
        {/* כותרת SEO */}
        <div className={styles.formGroup}>
          <label htmlFor="seo-title" className={styles.label}>
            כותרת למנועי חיפוש
          </label>
          <Input
            id="seo-title"
            type="text"
            value={seoTitle || ''}
            onChange={handleTitleChange}
            placeholder="כותרת שתופיע בתוצאות החיפוש"
            disabled={disabled}
            error={!!errors.seoTitle}
          />
          <div className={styles.fieldFooter}>
            <span className={`${styles.charCounter} ${titleCounterClass}`}>
              {titleLength}/60
            </span>
            {errors.seoTitle && (
              <span className={styles.errorText}>{errors.seoTitle}</span>
            )}
            {!errors.seoTitle && (
              <span className={styles.helperText}>
                מומלץ עד 60 תווים לתצוגה מיטבית בגוגל
              </span>
            )}
          </div>
        </div>

        {/* תיאור SEO */}
        <div className={styles.formGroup}>
          <label htmlFor="seo-description" className={styles.label}>
            תיאור למנועי חיפוש
          </label>
          <textarea
            id="seo-description"
            value={seoDescription || ''}
            onChange={handleDescriptionChange}
            placeholder="תיאור קצר שיופיע מתחת לכותרת בגוגל"
            disabled={disabled}
            className={`${styles.textarea} ${errors.seoDescription ? styles.textareaError : ''}`}
            rows={3}
            maxLength={170}
          />
          <div className={styles.fieldFooter}>
            <span className={`${styles.charCounter} ${descriptionCounterClass}`}>
              {descriptionLength}/160
            </span>
            {errors.seoDescription && (
              <span className={styles.errorText}>{errors.seoDescription}</span>
            )}
            {!errors.seoDescription && (
              <span className={styles.helperText}>
                מומלץ עד 160 תווים לתצוגה מלאה בגוגל
              </span>
            )}
          </div>
        </div>

        {/* Slug (כתובת URL) */}
        <div className={styles.formGroup}>
          <label htmlFor="seo-slug" className={styles.label}>
            כתובת URL (Slug)
          </label>
          <div className={styles.slugInput}>
            <span className={styles.slugPrefix}>{storeUrl}/products/</span>
            <Input
              id="seo-slug"
              type="text"
              value={slug || ''}
              onChange={handleSlugChange}
              placeholder="product-name"
              disabled={disabled}
              error={!!errors.slug}
            />
            <button
              type="button"
              className={styles.generateButton}
              onClick={handleGenerateSlug}
              disabled={disabled || !productName}
              title="צור אוטומטית משם המוצר"
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
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
          {errors.slug && (
            <span className={styles.errorText}>{errors.slug}</span>
          )}
          {!errors.slug && (
            <span className={styles.helperText}>
              כתובת ידידותית לשיתוף ולמנועי חיפוש
            </span>
          )}
        </div>
      </div>

      {/* תצוגה מקדימה של גוגל */}
      <div className={styles.googlePreview}>
        <div className={styles.previewHeader}>
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
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>כך המוצר ייראה בגוגל:</span>
        </div>
        <div className={styles.previewCard}>
          <div className={styles.previewUrl}>
            {googlePreview.url}
          </div>
          <div className={styles.previewTitle}>
            {googlePreview.title}
          </div>
          <div className={styles.previewDescription}>
            {googlePreview.description}
          </div>
        </div>
      </div>

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipIcon}>💡</div>
        <div className={styles.tipContent}>
          <strong>טיפים לשיפור SEO:</strong>
          <ul>
            <li>השתמש במילות מפתח רלוונטיות בכותרת ובתיאור</li>
            <li>כתוב כותרת ייחודית ומושכת לכל מוצר</li>
            <li>התיאור צריך לשכנע את הגולש ללחוץ</li>
            <li>ה-slug צריך להיות קצר וברור</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductSEO;
