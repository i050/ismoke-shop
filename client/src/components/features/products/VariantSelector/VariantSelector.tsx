// ייבוא ספריית React הבסיסית
import React from 'react';

// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './VariantSelector.module.css';
import { Button } from '@ui';

// ייבוא הטיפוס Sku מהקובץ Product.ts
import type { Sku } from '../../../../types/Product';
// Phase 1.4: ייבוא פונקציית עזר לטיפול בתמונות
import { getImageUrl } from '../../../../utils/imageUtils';
// ייבוא פונקציות המרת צבעים
import { getColorNameHebrew } from '../../../../utils/colorUtils';

// הגדרת הממשק של הקומפוננטה
interface VariantSelectorProps {
  skus: Sku[];                          // רשימת כל ה-SKUs הזמינים
  selectedSku: string | null;           // קוד SKU הנבחר כרגע
  onSkuChange: (sku: string) => void;   // פונקציה שתופעל כשבוחרים SKU חדש
  showColorPreview?: boolean;           // האם להציג תצוגה ויזואלית של הצבע
  compactMode?: boolean;                // מצב קומפקטי - מציג רק עיגול צבע קטן
}

// הגדרת קומפוננטת VariantSelector
const VariantSelector: React.FC<VariantSelectorProps> = ({
  skus,
  selectedSku,
  onSkuChange,
  showColorPreview = true,
  compactMode = false
}) => {
  
  // פונקציה להחזרת קוד צבע CSS מטקסט צבע (תומכת בצבעים מורכבים)
  const getColorCode = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'שחור': '#1a1a1a',
      'כחול': '#007bff', 
      'אדום': '#dc3545',
      'ירוק': '#28a745',
      'צהוב': '#ffc107',
      'סגול': '#6f42c1',
      'כתום': '#fd7e14',
      'ורוד': '#e83e8c',
      'חום': '#795548',
      'אפור': '#6c757d',
      'לבן': '#f8f9fa',
      'זהב': '#ffd700',
      'כסף': '#c0c0c0'
    };
    
    // אם הצבע קיים כמו שהוא במיפוי, החזר אותו
    if (colorMap[colorName]) {
      return colorMap[colorName];
    }
    
    // אם הצבע מכיל מקף (צבע מורכב), קח את הצבע הראשון
    if (colorName.includes('-')) {
      const firstColor = colorName.split('-')[0];
      if (colorMap[firstColor]) {
        return colorMap[firstColor];
      }
    }
    
    // אם הצבע מכיל רווח (צבע מורכב), קח את הצבע הראשון
    if (colorName.includes(' ')) {
      const firstColor = colorName.split(' ')[0];
      if (colorMap[firstColor]) {
        return colorMap[firstColor];
      }
    }
    
    // אם לא מצאנו התאמה, החזר את השם כמו שהוא (אולי זה קוד צבע)
    return colorName;
  };

  // פונקציה עזר להמרת hex ל-rgba לשימוש ב-hover/active רקע עם שקיפות
  const hexToRgba = (hex: string, alpha = 1): string => {
    if (!hex) return `rgba(0,0,0,0)`;
    // אם כבר מקבל rgba או rgb - החזר כפי שהוא (משאיר את המשתמש לשלוט)
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    // הסרת # אם קיים
    const clean = hex.replace('#', '').trim();
    // קבלת ערכים
    let r = 0,
      g = 0,
      b = 0;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    } else {
      // fallback - ניסיון לפרש צבע מילולי יהפוך לאפור שקוף
      return `rgba(0,0,0,${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // פונקציה לקבלת קוד צבע HEX מ-SKU
  const getSkuColor = (sku: Sku): string => {
    // נסה קודם color ישירות (פורמט שרת - שדה שטוח)
    if ((sku as any).color) {
      return (sku as any).color;
    }
    // נסה attributes.color (פורמט טופס ישן - backward compatibility)
    if (sku.attributes?.color) {
      return sku.attributes.color;
    }
    // fallback - נסה לחלץ צבע מתוך שם ה-SKU (למוצרים ישנים)
    if (sku.name) {
      // אם השם מכיל " - ", קח רק את החלק אחרי המקף האחרון
      const parts = sku.name.split(' - ');
      if (parts.length > 1) {
        return parts[parts.length - 1]; // החזר את החלק האחרון (הצבע)
      }
    }
    // אין צבע זמין
    return '';
  };

  // פונקציה לקבלת שם תצוגה של צבע בעברית
  const getColorDisplayName = (colorHex: string): string => {
    if (!colorHex) return '';
    // אם זה קוד HEX, המר לשם בעברית
    if (colorHex.startsWith('#')) {
      return getColorNameHebrew(colorHex);
    }
    // אם זה כבר שם טקסט, החזר אותו כמו שהוא
    return colorHex;
  };

  // אם אין SKUs זמינים, לא נציג כלום
  if (!skus || skus.length <= 1) {
    return null;
  }

  // מציאת ה-SKU הנבחר
  const selectedSkuData = skus.find(s => s.sku === selectedSku);

  return (
    <div className={styles.variantSection}>
      {/* <h3 className={styles.variantTitle}>צבע:</h3> */}
      <div className={styles.variantOptions}>
        {skus.map((skuItem, index) => {
          // קבלת שם הצבע מה-SKU
          const colorName = getSkuColor(skuItem);
          const colorCode = getColorCode(colorName);
          const isSelected = skuItem.sku === selectedSku;
          
            return (
            <Button
                key={`${skuItem.sku}-${index}`}
                // תמיד נשתמש ב-ghost כדי למנוע מהכפתור לקבל את סגנון ה-primary המנוגד לעיצוב הווריאנט
                variant={'ghost'}
              size="sm"
              className={`${styles.variantButton} ${
                isSelected ? styles.variantActive : ''
              } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
              onClick={() => onSkuChange(skuItem.sku)}
                // הגדרת משתני CSS דינמיים: צבע הווריאנט (hex/named) וגם rgba לשימוש ברקע/active
                style={{
                  ['--variant-color' as any]: colorCode,
                  ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                }}
              title={`בחר צבע ${colorName}`}
            >
              {/* תצוגת צבע ויזואלית אם מבוקש */}
              {showColorPreview && !compactMode && (
                // אלמנט ריק שמשמש כעמוד Accent; הצבע מוגדר במשתנה CSS --variant-color
                <div 
                  className={styles.colorPreview}
                />
              )}
              
              {/* אם מצב קומפקטי, לא מציגים תמונה או טקסט */}
              {!compactMode && (
                <>
                  {/* אם יש תמונה ל-SKU, נציג אותה */}
                  {skuItem.images && skuItem.images.length > 0 ? (
                    <img 
                      src={getImageUrl(skuItem.images[0])} 
                      alt={`${getColorDisplayName(colorName) || colorName} variant`}
                      className={styles.variantImage}
                    />
                  ) : (
                    // אם אין תמונה ואין שם תצוגה, נציג רק את ריבוע הצבע (colorPreview כבר מוצג)
                    getColorDisplayName(colorName) && (
                      <span className={styles.variantColorName}>{getColorDisplayName(colorName)}</span>
                    )
                  )}
                </>
              )}
            </Button>
          );
        })}
      </div>
      
      {/* הצגת שם הצבע הנבחר - הסרה לקומפקטיות */}
      {/* {selectedSkuData && getColorDisplayName(getSkuColor(selectedSkuData)) && (
        <div 
          className={styles.selectedVariantInfo}
          style={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // Inline style נחוץ כאן כי הצבע משתנה דינמית לפי הווריאנט הנבחר
            ['--variant-color' as any]: getColorCode(getSkuColor(selectedSkuData)),
          }}
        >
          <span className={styles.selectedColorLabel}> נבחר: </span>
          <span className={styles.selectedColorName}>
            {getColorDisplayName(getSkuColor(selectedSkuData))}
          </span>
        </div>
      )} */}
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default VariantSelector;
