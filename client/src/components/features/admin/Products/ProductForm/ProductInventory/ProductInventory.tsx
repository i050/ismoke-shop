// Product Inventory Component
// מטרת הקומפוננטה: ניהול מלאי עבור המוצר - תצוגה וניהול גלובלי
// המלאי האמיתי מנוהל ברמת SKU (טאב וריאנטים)

import React, { useCallback, useMemo, useState } from 'react';
import { Input } from '../../../../../ui/Input';
import { Icon } from '../../../../../ui/Icon';
import Checkbox from '../../../../../ui/Checkbox';
import { useToast } from '@/hooks/useToast';
import styles from './ProductInventory.module.css';
import {
  calculateTotalStock,
  getSkuStockInfo,
  getInventorySummary,
  type SkuStockInfo,
} from '@utils/inventoryUtils';

/**
 * Props של קומפוננטת ProductInventory
 */
interface ProductInventoryProps {
  values: {
    trackInventory: boolean;
    lowStockThreshold?: number | null;
  };
  /** ערך סף ברירת מחדל מהגדרות החנות - משמש לתצוגה כאשר אין ערך מותאם */
  globalLowStockThreshold?: number;
  skus?: any[]; // רשימת SKUs לתצוגת מלאי מפורטת (משותף עם מבנה הטופס המלא)
  errors?: {
    lowStockThreshold?: string;
  };
  /**
   * onChange משמש לעדכון שדות טופס כלליים כמו trackInventory, lowStockThreshold,
   * וגם לשדה המשוקף stockQuantity (סה"כ מלאי) כאשר יש שינויים ב-SKUs
   */
  onChange: (
    field: 'trackInventory' | 'lowStockThreshold' | 'stockQuantity',
    value: boolean | number | null
  ) => void;
  /**
   * הקריאה שנקראת כאשר יש שינוי בערכים של SKUs (למשל שינוי stockQuantity עבור SKU נתון)
   * הקומפוננטה הורה אמורה לעדכן את ה-form state (למשל באמצעות setValueWithDirty('skus', updatedSkus))
   */
  onSkusChange?: (skus: any[]) => void;
  disabled?: boolean;
  /** מזהה מוצר קיים - אם לא קיים (create mode) לא תתאפשר שמירת SKUs לשרת */
  productId?: string | null;
}

/**
 * קומפוננטת ProductInventory
 * מציגה מצב מלאי כללי ומפורט לפי SKUs
 * עריכת מלאי בפועל נעשית בטאב וריאנטים (SKUs)
 */
const ProductInventory: React.FC<ProductInventoryProps> = ({
  values,
  globalLowStockThreshold = 5,
  skus = [],
  errors,
  onChange,
  onSkusChange,
  disabled = false,
  productId = null,
}) => {
  const { showToast } = useToast();

  // מצב שמירה לשרת
  const [isSaving, setIsSaving] = useState(false);

  // פונקציה לשמירת SKUs בשרת
  const handleSaveSkus = useCallback(async () => {
    if (!productId || typeof onSkusChange !== 'function') return;

    try {
      setIsSaving(true);
      const { default: productManagementService } = await import('@/services/productManagementService');

      const result: any = await productManagementService.saveProductSkus(productId, skus);

      if (result && (result as any).skus) {
        // העברת ה-SKUs כפי שחזרו מהשרת ישירות להורה (שכבת ה-form מצפה לשדות המלאים)
        onSkusChange((result as any).skus);
      }

      const newTotal = (result && (result as any).skus)
        ? (result as any).skus.reduce((acc: number, cur: any) => acc + (cur.stockQuantity || 0), 0)
        : skus.reduce((acc, cur) => acc + (cur.stockQuantity || 0), 0);

      onChange('stockQuantity', newTotal);
      showToast('success', 'SKUs נשמרו בהצלחה');
    } catch (err) {
      console.error('שגיאה בשמירת SKUs:', err);
      showToast('error', 'שגיאה בשמירת SKUs. אנא נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  }, [productId, skus, onSkusChange, onChange]);

  // חישוב סה"כ מלאי
  const totalStock = useMemo(() => {
    return calculateTotalStock(skus);
  }, [skus]);

  // חישוב רף אזהרה - משתמש בערך הגלובלי כברירת מחדל
  const threshold = useMemo(() => {
    return values.lowStockThreshold ?? globalLowStockThreshold;
  }, [values.lowStockThreshold, globalLowStockThreshold]);

  // קבלת מידע מפורט על כל SKU
  const skuStockInfo = useMemo(() => {
    return getSkuStockInfo(skus, threshold);
  }, [skus, threshold]);

  // קבלת סיכום מלאי
  const inventorySummary = useMemo(() => {
    return getInventorySummary(skus, threshold);
  }, [skus, threshold]);

  // טיפול בשינוי רף אזהרה
  const handleLowStockThresholdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // אם השדה ריק
      if (value === '') {
        onChange('lowStockThreshold', null);
        return;
      }

      // המרה למספר שלם
      const numValue = parseInt(value, 10);

      // בדיקת תקינות
      if (!isNaN(numValue) && numValue >= 0) {
        onChange('lowStockThreshold', numValue);
      }
    },
    [onChange]
  );

  // טיפול בשינוי checkbox של מעקב מלאי
  const handleTrackInventoryChange = useCallback(
    (checked: boolean) => {
      onChange('trackInventory', checked);
    },
    [onChange]
  );

  return (
    <div className={styles.container}>

      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>ניהול מלאי</h3>
        <p className={styles.subtitle}>
          תצוגה והגדרות מלאי כלליות. עריכת מלאי בפועל מתבצעת בטאב וריאנטים
        </p>
      </div>

      {/* Checkbox עקוב אחרי מלאי */}
      <div className={styles.trackInventorySection}>
        <Checkbox
          checked={values.trackInventory}
          onChange={handleTrackInventoryChange}
          label="עקוב אחרי מלאי"
          helperText="כאשר מופעל, המערכת תעקוב אחרי כמויות המלאי ותזהיר כשהמלאי נמוך"
          disabled={disabled}
        />
      </div>

      {/* תצוגת מלאי - מוצגת רק אם מעקב מלאי מופעל */}
      {values.trackInventory && (
        <>
          {/* סה"כ מלאי */}
          <div className={styles.totalStockCard}>
            <div className={styles.totalStockHeader}>
              <span className={styles.totalStockIcon}><Icon name="BarChart3" size={20} /></span>
              <h4 className={styles.totalStockTitle}>סה"כ מלאי</h4>
            </div>
            <div className={styles.totalStockValue}>{totalStock} יחידות</div>
            <div className={styles.totalStockSubtitle}>
              (סכום כל הוריאנטים)
            </div>
          </div>

          {/* פירוט לפי וריאנטים */}
          {skus.length > 0 && (
            <div className={styles.skusBreakdown}>
              <h4 className={styles.breakdownTitle}><Icon name="Package" size={18} /> פירוט לפי וריאנטים:</h4>
              <div className={styles.skusList}>
                {skuStockInfo.map((skuInfo: SkuStockInfo) => (
                  <div
                    key={skuInfo.sku}
                    className={`${styles.skuItem} ${styles[`skuItem${skuInfo.statusColor.charAt(0).toUpperCase() + skuInfo.statusColor.slice(1)}`]}`}
                  >
                    <div className={styles.skuName}>• {skuInfo.name}</div>
                    <div className={styles.skuStock}>
                      {/* אם יש callback לשינוי SKUs - הצג שדה עריכה */}
                      {typeof onSkusChange === 'function' ? (
                        <Input
                          type="number"
                          value={String(skuInfo.stockQuantity)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseInt(raw, 10) || 0;

                            // בנה מערך SKUs מעודכן ושגר לאב
                            const updatedSkus = skus.map(s =>
                              s.sku === skuInfo.sku ? { ...s, stockQuantity: Math.max(0, num) } : s
                            );

                            // עדכון דרך callback לשכבת ההורה
                            if (onSkusChange) onSkusChange(updatedSkus);

                            // עדכן גם את סך המלאי בטופס דרך onChange
                            const newTotal = updatedSkus.reduce((acc, cur) => acc + (cur.stockQuantity || 0), 0);
                            onChange('stockQuantity', newTotal);
                          }}
                          aria-label={`מלאי עבור ${skuInfo.name}`}
                          disabled={disabled}
                        />
                      ) : (
                        <>{skuInfo.stockQuantity} יחידות</>
                      )}
                    </div>
                    <div className={styles.skuStatus}>
                      <span className={styles.skuStatusIcon}>
                        {skuInfo.statusIcon}
                      </span>
                      <span className={styles.skuStatusLabel}>
                        {skuInfo.statusLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* רף אזהרה */}
          <div className={styles.thresholdSection}>
            <Input
              label="רף עתודה למלאי נמוך"
              type="number"
              value={values.lowStockThreshold != null ? values.lowStockThreshold.toString() : ''}
              onChange={handleLowStockThresholdChange}
              error={!!errors?.lowStockThreshold}
              helperText={
                errors?.lowStockThreshold ||
                `השאר ריק כדי להשתמש בהגדרה הגלובלית (${globalLowStockThreshold})`
              }
              disabled={disabled}
              placeholder={`ברירת המחדל ${globalLowStockThreshold}`}
            />
          </div>

          {/* סיכום מצב מלאי */}
          {skus.length > 0 && (inventorySummary.lowStock > 0 || inventorySummary.outOfStock > 0) && (
            <div className={styles.inventorySummary}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryIcon}><Icon name="AlertTriangle" size={18} /></span>
                <h4 className={styles.summaryTitle}>סיכום:</h4>
              </div>
              <ul className={styles.summaryList}>
                {inventorySummary.lowStock > 0 && (
                  <li className={styles.summaryItemWarning}>
                    • {inventorySummary.lowStock} וריאנט{inventorySummary.lowStock > 1 ? 'ים' : ''} במלאי נמוך
                  </li>
                )}
                {inventorySummary.outOfStock > 0 && (
                  <li className={styles.summaryItemError}>
                    • {inventorySummary.outOfStock} וריאנט{inventorySummary.outOfStock > 1 ? 'ים' : ''} אזל{inventorySummary.outOfStock > 1 ? 'ו' : ''}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* שמירה לשרת הוסרה: עריכות SKUs נשמרות מקומית ב-RHF ונשלחות לשרת כאשר המשתמש לוחץ 'שמור מוצר' */}
        </>
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
          <span>טיפים לניהול מלאי</span>
        </div>
        <ul className={styles.tipsList}>
          <li>המלאי מנוהל ברמת כל וריאנט (SKU) בנפרד בטאב "וריאנטים"</li>
          <li>סה"כ המלאי מחושב אוטומטית מכל הוריאנטים</li>
          <li>רף אזהרה מומלץ: 10-15% מהמלאי הממוצע</li>
          <li>ניתן לכבות מעקב מלאי למוצרים דיגיטליים או שירותים</li>
          <li>אזהרות מוצגות אוטומטית כשוריאנט מגיע לרף או אוזל</li>
        </ul>
      </div> */}
    </div>
  );
};

export default ProductInventory;
