import React from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './ProductFormActions.module.css';

/**
 * ProductFormActions Props
 * תכונות לסרגל הפעולות של טופס המוצר
 */
export interface ProductFormActionsProps {
  /** מצב הטופס: יצירה או עריכה */
  mode: 'create' | 'edit';
  
  /** האם הטופס בתהליך שליחה */
  isSubmitting: boolean;
  
  /** האם יש שינויים שלא נשמרו */
  isDirty: boolean;
  
  /** האם הטופס עובר validation */
  isValid?: boolean;
  
  /** שגיאות validation לתצוגה ליד כפתור השמירה */
  validationErrors?: {
    name?: string;
    basePrice?: string;
    categoryId?: string;
    skus?: string;
  };
  
  /** פונקציה לשמירה כטיוטה */
  onSaveDraft?: () => void;
  
  /** פונקציה לפתיחת תצוגה מקדימה */
  onPreview?: () => void;
  
  /** פונקציה לפרסום המוצר */
  onPublish?: () => void;
  
  /** פונקציה לשמירת הטופס (fallback אם אין 3 כפתורים) */
  onSave: () => void;
  
  /** פונקציה לביטול השינויים */
  onCancel: () => void;
  
  /** פונקציה למחיקת המוצר (רק במצב עריכה) */
  onDelete?: () => void;
  
  /** פונקציה לשכפול המוצר (רק במצב עריכה) */
  onDuplicate?: () => void;
  
  /** סטטוס המוצר הנוכחי */
  productStatus?: 'draft' | 'published' | 'archived';
}

/**
 * ProductFormActions Component
 * קומפוננטת פעולות טופס מוצר עם סרגל כפתורים sticky
 * 
 * תכונות:
 * - כפתורי פעולה: שמירה, ביטול, מחיקה, שכפול
 * - אזהרה על שינויים שלא נשמרו
 * - Layout sticky בתחתית הטופס
 * - תמיכה ב-Loading state
 * - הצגה מותאמת לפי מצב (create/edit)
 */
export const ProductFormActions: React.FC<ProductFormActionsProps> = ({
  mode,
  isSubmitting,
  isDirty,
  isValid = true,
  validationErrors = {},
  onSaveDraft,
  onPreview,
  onPublish,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  productStatus = 'draft',
}) => {
  // הכפתור מושבת אם: אין שינויים, או יש שגיאות validation, או בתהליך שליחה
  const isDisabled = !isDirty || !isValid || isSubmitting;
  
  // האם להציג כפתורים מפוצלים (טיוטה/תצוגה/פרסום)
  const showSplitButtons = !!(onSaveDraft || onPreview || onPublish);

  return (
    <div className={styles.container}>
      {/* אזהרה על שינויים שלא נשמרו */}
      {isDirty && !isSubmitting && (
        <div className={styles.warningBanner}>
          <svg
            className={styles.warningIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.warningText}>
            קיימים שינויים שלא נשמרו. אל תשכח לשמור את עבודתך!
          </span>
        </div>
      )}

      {/* הודעות שגיאה validation - מוצגות תמיד אם יש שגיאות */}
      {!isValid && Object.values(validationErrors).some(v => typeof v === 'string' && v) && (
        <div className={styles.validationErrorsBanner}>
          <svg
            className={styles.errorIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className={styles.errorsList}>
            <span className={styles.errorsTitle}>יש לתקן את השגיאות הבאות לפני שמירה:</span>
            <ul className={styles.errorsItems}>
              {typeof validationErrors.name === 'string' && validationErrors.name && (
                <li>❌ שם מוצר: {validationErrors.name}</li>
              )}
              {typeof validationErrors.basePrice === 'string' && validationErrors.basePrice && (
                <li>❌ מחיר בסיס: {validationErrors.basePrice}</li>
              )}
              {typeof validationErrors.categoryId === 'string' && validationErrors.categoryId && (
                <li>❌ קטגוריה: {validationErrors.categoryId}</li>
              )}
              {typeof validationErrors.skus === 'string' && validationErrors.skus && (
                <li>❌ גירסאות (SKUs): {validationErrors.skus}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* סרגל הכפתורים */}
      <div className={styles.actionsBar}>
        {/* כפתורים ראשיים (ימין) */}
        <div className={styles.primaryActions}>
          {showSplitButtons ? (
            <>
              {/* כפתור טיוטה */}
              {onSaveDraft && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onSaveDraft}
                  disabled={!isDirty || isSubmitting}
                  loading={isSubmitting}
                  icon={<Icon name="Save" size={18} />}
                  iconPosition="right"
                  aria-label="שמירה כטיוטה (Ctrl+S)"
                  title="שמירה כטיוטה (Ctrl+S)"
                >
                  טיוטה
                </Button>
              )}
              
              {/* כפתור תצוגה מקדימה */}
              {onPreview && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onPreview}
                  disabled={isSubmitting}
                  icon={<Icon name="Eye" size={18} />}
                  iconPosition="right"
                  aria-label="תצוגה מקדימה"
                >
                  תצוגה מקדימה
                </Button>
              )}
              
              {/* כפתור פרסום */}
              {onPublish && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onPublish}
                  disabled={isDisabled}
                  loading={isSubmitting}
                  elevated
                  icon={<Icon name="Upload" size={18} />}
                  iconPosition="right"
                  aria-label={mode === 'create' ? 'פרסום מוצר חדש' : 'פרסום שינויים'}
                >
                  {productStatus === 'published' ? 'עדכון' : 'פרסום'}
                </Button>
              )}
            </>
          ) : (
            /* כפתור שמירה רגיל (fallback) */
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                console.log('🔵 [ProductFormActions] Save button clicked!', {
                  isDirty,
                  isValid,
                  isSubmitting,
                  disabled: isDisabled
                });
                onSave();
              }}
              disabled={isDisabled}
              loading={isSubmitting}
              elevated
              aria-label={mode === 'create' ? 'יצירת מוצר חדש' : 'שמירת שינויים'}
            >
              {mode === 'create' ? 'יצירת מוצר' : 'שמירת שינויים'}
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="ביטול וחזרה לרשימה"
          >
            ביטול
          </Button>
        </div>

        {/* כפתורים משניים (שמאל) - רק במצב עריכה */}
        {mode === 'edit' && (
          <div className={styles.secondaryActions}>
            {/* {onDuplicate && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onDuplicate}
                disabled={isSubmitting}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 3H3V8M8 17H3V12M17 8V3H12M17 12V17H12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                iconPosition="right"
                aria-label="שכפול מוצר"
              >
                שכפול מוצר
              </Button>
            )} */}

            {onDelete && (
              <Button
                variant="danger"
                size="lg"
                onClick={onDelete}
                disabled={isSubmitting}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 4V2H13V4M3 6H17M15 6V16C15 17.1046 14.1046 18 13 18H7C5.89543 18 5 17.1046 5 16V6M8 9V15M12 9V15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                iconPosition="right"
                aria-label="מחיקת מוצר"
              >
                מחיקת מוצר
              </Button>
            )}
          </div>
        )}
      </div>

      {/* טיפים מקצועיים */}
      <div className={styles.tips}>
        <h4 className={styles.tipsTitle}>💡 טיפים לשמירת מוצר:</h4>
        <ul className={styles.tipsList}>
          <li>וודא שמילאת את כל השדות החובה (סומנו ב-*)</li>
          <li>בדוק שהמחירים והמלאי נכונים לפני השמירה</li>
          <li>העלה תמונות באיכות גבוהה לתצוגה אופטימלית</li>
          <li>
            במצב SKU: וודא שכל הווריאציות מוגדרות עם קודי SKU ייחודיים
          </li>
          <li>השתמש בתיאור מפורט כדי לשפר את חוויית הקנייה</li>
          <li>
            כפתור השמירה יהפוך לזמין רק לאחר ביצוע שינויים
          </li>
        </ul>
      </div>
    </div>
  );
};
