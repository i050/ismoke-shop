// Product Images Component
// מטרת הקומפוננטה: ניהול תמונות המוצר עם העלאה, מחיקה וסידור מחדש
// משתמש ב-ImageGalleryManager המשותף

import React from 'react';
import ImageGalleryManager, { type ImageObject } from '../../../../../ui/ImageGalleryManager';
import { useToast } from '../../../../../../hooks/useToast';
import styles from './ProductImages.module.css';

// ImageObject מיובא מ-ImageGalleryManager

/**
 * Props של קומפוננטת ProductImages
 */
interface ProductImagesProps {
  images: ImageObject[];
  onChange: (images: ImageObject[]) => void;
  onUpload?: (files: File[]) => Promise<ImageObject[]>;
  maxImages?: number;
  errors?: {
    images?: string;
  };
  /**
   * פונקציה לניווט לטאב הוריאנטים (SKUs)
   */
  onNavigateToVariants?: () => void;
}

/**
 * קומפוננטת ProductImages
 * wrapper דק מעל ImageGalleryManager עם הגדרות ספציפיות למוצר
 */
const ProductImages: React.FC<ProductImagesProps> = ({
  images,
  onChange,
  onUpload,
  maxImages = 10,
  errors,
  onNavigateToVariants,
}) => {
  const { showToast } = useToast();
  
  // ניווט מקצועי לטאב הוריאנטים (SKUs) דרך prop
  const handleNavigateToVariants = () => {
    if (onNavigateToVariants) {
      onNavigateToVariants();
    } else {
      showToast('warning', 'פונקציית ניווט לטאב הוריאנטים לא הועברה לקומפוננטה.');
    }
  };

  return (
    <div className={styles.container}>
      {/* כותרת והסבר מקצועי - תמונות כלליות בלבד */}
      <div className={styles.header}>
        <h3 className={styles.title}>תמונות מוצר</h3>
        <div className={styles.subtitle}>
          {/* הסבר בעברית על מטרת התמונות */}
          <span>
            התמונות כאן הן <strong>תמונות כלליות</strong> של המוצר. אם יש לך תמונה של וריאנט מסוים (SKU), יש להעלות אותה בחלק של
          </span>
          {/* קישור אינטראקטיבי לניווט לטאב הוריאנטים */}
          <button
            type="button"
            className={styles.variantsLink}
            onClick={handleNavigateToVariants}
          >
            וריאנטים
          </button>
        </div>
      </div>

      {/* ImageGalleryManager במצב inline */}
      <div className={styles.uploaderWrapper}>
        <ImageGalleryManager
          mode="inline"
          images={images}
          onChange={onChange}
          onUpload={onUpload}
          maxImages={maxImages}
          deleteMode="immediate"
          allowReorder={true}
          showPrimaryBadge={true}
          showProgress={true}
        />
      </div>

      {/* אינדיקטור תמונה ראשית */}
      {images.length > 0 && (
        <div className={styles.primaryIndicator}>
          <div className={styles.primaryIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <span className={styles.primaryText}>
            התמונה הראשונה תוצג כתמונה ראשית בחנות
          </span>
        </div>
      )}

      {/* מונה תמונות */}
      <div className={styles.counter}>
        <span className={styles.counterCurrent}>{images.length}</span>
        <span className={styles.counterSeparator}>/</span>
        <span className={styles.counterMax}>{maxImages}</span>
        <span className={styles.counterLabel}>תמונות</span>
      </div>

      {/* הודעת שגיאה */}
      {errors?.images && (
        <div className={styles.error}>
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
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>
            {typeof errors.images === 'string' 
              ? errors.images 
              : (errors.images as any)?.message || 'שגיאה בתמונות'}
          </span>
        </div>
      )}

      {/* טיפים */}
      <div className={styles.tips}>
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
          <span>טיפים לתמונות מוצר</span>
        </div>
        <ul className={styles.tipsList}>
          <li>
            <strong>תמונה ראשית:</strong> התמונה הראשונה ברשימה תוצג כתמונה
            ראשית בכל מקום בחנות
          </li>
          <li>
            <strong>סידור:</strong> גרור תמונות כדי לשנות את הסדר שלהן
          </li>
          <li>
            <strong>איכות:</strong> מומלץ להעלות תמונות באיכות גבוהה (800x800
            פיקסלים לפחות)
          </li>
          <li>
            <strong>פורמטים נתמכים:</strong> JPG, PNG, WEBP (עד 5MB לתמונה)
          </li>
          <li>
            <strong>מספר תמונות:</strong> ניתן להעלות עד {maxImages} תמונות
            למוצר
          </li>
          <li>
            <strong>רקע:</strong> השתמש ברקע לבן או שקוף לתוצאות מקצועיות
          </li>
        </ul>
      </div>

      {/* אזהרה - אם אין תמונות */}
      {images.length === 0 && !errors?.images && (
        <div className={styles.warningBox}>
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
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div className={styles.warningContent}>
            <strong>לא נבחרו תמונות</strong>
            <span>מומלץ להוסיף לפחות תמונה אחת כדי להציג את המוצר בחנות</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImages;
