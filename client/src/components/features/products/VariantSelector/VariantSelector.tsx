// ייבוא ספריית React הבסיסית
import React, { useState, useMemo } from 'react';

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
  secondaryVariantAttribute?: string | null; // 🆕 מפתח המאפיין המשני (size/resistance/nicotine)
}

// 🆕 טיפוס לקבוצת צבע עם תת-וריאנטים
interface ColorGroup {
  color: string;           // שם הצבע
  colorHex?: string;       // קוד צבע HEX (אם יש)
  skus: Sku[];            // כל ה-SKUs של הצבע הזה
  variants: Array<{        // תת-וריאנטים (resistance/size וכו')
    value: string;
    sku: string;
  }>;
}

// הגדרת קומפוננטת VariantSelector
const VariantSelector: React.FC<VariantSelectorProps> = ({
  skus,
  selectedSku,
  onSkuChange,
  showColorPreview = true,
  compactMode = false,
  secondaryVariantAttribute = null
}) => {
  
  // 🆕 State לצבע הנבחר (שלב 1)
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
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

  // 🆕 קיבוץ SKUs לפי צבעים
  const colorGroups = useMemo<ColorGroup[]>(() => {
    const groups: { [color: string]: ColorGroup } = {};
    
    for (const sku of skus) {
      const color = getSkuColor(sku);
      if (!color) continue;
      
      if (!groups[color]) {
        groups[color] = {
          color,
          colorHex: color.startsWith('#') ? color : undefined,
          skus: [],
          variants: []
        };
      }
      
      groups[color].skus.push(sku);
      
      // אם יש תת-וריאנט, הוסף אותו לרשימה
      if (secondaryVariantAttribute && sku.attributes?.[secondaryVariantAttribute]) {
        groups[color].variants.push({
          value: sku.attributes[secondaryVariantAttribute]!,
          sku: sku.sku
        });
      }
    }
    
    return Object.values(groups);
  }, [skus, secondaryVariantAttribute]);

  // 🆕 אתחול selectedColor לפי SKU הנבחר
  React.useEffect(() => {
    if (selectedSku) {
      const currentSku = skus.find(s => s.sku === selectedSku);
      if (currentSku) {
        const color = getSkuColor(currentSku);
        setSelectedColor(color);
      }
    }
  }, [selectedSku, skus]);

  // אם אין SKUs זמינים, לא נציג כלום
  if (!skus || skus.length === 0) {
    return null;
  }

  // 🔍 **קביעת מצב התצוגה:**
  // מצב פשוט רק אם:
  // 1. אין secondaryVariantAttribute (מוצר ישן)
  // 2. יש רק SKU אחד בסה"כ
  // אם יש secondaryVariantAttribute - תמיד מצב היררכי (גם עם צבע אחד!)
  const useSimpleMode = !secondaryVariantAttribute || skus.length === 1;

  // **תצוגה פשוטה (מצב ישן - תאימות לאחור)**
  if (useSimpleMode) {
    return (
      <div className={styles.variantSection}>
        <div className={styles.variantOptions}>
          {skus.map((skuItem, index) => {
            const colorName = getSkuColor(skuItem);
            const colorCode = getColorCode(colorName);
            const isSelected = skuItem.sku === selectedSku;
            
            return (
              <Button
                key={`${skuItem.sku}-${index}`}
                variant={'ghost'}
                size="sm"
                className={`${styles.variantButton} ${
                  isSelected ? styles.variantActive : ''
                } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
                onClick={() => onSkuChange(skuItem.sku)}
                style={{
                  ['--variant-color' as any]: colorCode,
                  ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                }}
                title={`בחר צבע ${colorName}`}
              >
                {showColorPreview && !compactMode && (
                  <div className={styles.colorPreview} />
                )}
                
                {!compactMode && (
                  <>
                    {skuItem.images && skuItem.images.length > 0 ? (
                      <img 
                        src={getImageUrl(skuItem.images[0])} 
                        alt={`${getColorDisplayName(colorName) || colorName} variant`}
                        className={styles.variantImage}
                      />
                    ) : (
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
      </div>
    );
  }

  // 🆕 **תצוגה היררכית (דו-שלבית)**
  
  // קבוצת הצבע הנבחרת
  const selectedColorGroup = selectedColor 
    ? colorGroups.find(g => g.color === selectedColor) 
    : null;

  return (
    <div className={styles.variantSection}>
      {/* שלב 1: בחירת צבע */}
      <h3 className={styles.variantTitle}>צבע:</h3>
      <div className={styles.variantOptions}>
        {colorGroups.map((group, index) => {
          const colorCode = getColorCode(group.color);
          const isSelected = group.color === selectedColor;
          
          return (
            <Button
              key={`color-${group.color}-${index}`}
              variant={'ghost'}
              size="sm"
              className={`${styles.variantButton} ${
                isSelected ? styles.variantActive : ''
              } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
              onClick={() => {
                setSelectedColor(group.color);
                // בחירת SKU ראשון של הצבע (אוטומטית)
                if (group.skus.length > 0) {
                  onSkuChange(group.skus[0].sku);
                }
              }}
              style={{
                ['--variant-color' as any]: colorCode,
                ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
              }}
              title={`בחר צבע ${group.color}`}
            >
              {showColorPreview && !compactMode && (
                <div className={styles.colorPreview} />
              )}
              
              {!compactMode && (
                <>
                  {group.skus[0].images && group.skus[0].images.length > 0 ? (
                    <img 
                      src={getImageUrl(group.skus[0].images[0])} 
                      alt={`${getColorDisplayName(group.color) || group.color} variant`}
                      className={styles.variantImage}
                    />
                  ) : (
                    getColorDisplayName(group.color) && (
                      <span className={styles.variantColorName}>{getColorDisplayName(group.color)}</span>
                    )
                  )}
                </>
              )}
            </Button>
          );
        })}
      </div>

      {/* שלב 2: בחירת תת-וריאנט (אם נבחר צבע ויש תת-וריאנטים) */}
      {selectedColorGroup && selectedColorGroup.variants.length > 1 && (
        <div className={styles.secondaryVariantSection}>
          <h4 className={styles.secondaryVariantTitle}>
            {secondaryVariantAttribute === 'size' && 'מידה:'}
            {secondaryVariantAttribute === 'htngdvt_slylym' && 'התנגדות:'}
            {secondaryVariantAttribute === 'nicotine' && 'ניקוטין:'}
            {!['size', 'htngdvt_slylym', 'nicotine'].includes(secondaryVariantAttribute || '') && 'בחר:'}
          </h4>
          <div className={styles.secondaryVariantOptions}>
            {selectedColorGroup.variants.map((variant, index) => {
              const isSelected = variant.sku === selectedSku;
              
              return (
                <button
                  key={`variant-${variant.value}-${index}`}
                  className={`${styles.secondaryVariantButton} ${
                    isSelected ? styles.secondaryVariantActive : ''
                  }`}
                  onClick={() => onSkuChange(variant.sku)}
                  title={`בחר ${variant.value}`}
                >
                  {variant.value}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
