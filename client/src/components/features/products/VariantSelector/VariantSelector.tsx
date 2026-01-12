// ייבוא ספריית React הבסיסית
import React, { useState, useMemo } from 'react';

// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './VariantSelector.module.css';
import { Button } from '@ui';

// ייבוא הטיפוס Sku מהקובץ Product.ts
import type { Sku, VariantType } from '../../../../types/Product';
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
  secondaryOnly?: boolean;              // 🆕 מצב להצגת רק תת-וריאנט (בלי כפתורי צבע)
  hideSecondaryVariants?: boolean;      // 🆕 הסתרת תת-וריאנטים (לשימוש בכרטיסייה)
  maxColors?: number;                   // 🆕 מספר מקסימלי של כפתורי צבעים להצגה (שאר יוצגו כ-+X)
  // 🆕 Phase 4: תמיכה בוריאנטים מותאמים אישית
  variantType?: VariantType;            // סוג הוריאנט: 'color' | 'custom' | null
  primaryVariantLabel?: string;         // תווית הוריאנט הראשי (לדוגמה: "טעם")
  secondaryVariantLabel?: string;       // תווית הוריאנט המשני (לדוגמה: "ניקוטין")
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
  secondaryVariantAttribute = null,
  secondaryOnly = false,
  hideSecondaryVariants = false,
  maxColors = compactMode ? 2 : undefined, // ברירת מחדל חכמה: 2 ב-compactMode
  // 🆕 Phase 4: תמיכה בוריאנטים מותאמים אישית
  variantType = null,
  primaryVariantLabel = 'וריאנט',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  secondaryVariantLabel = '', // TODO: יהיה בשימוש כשנוסיף תת-וריאנטים ל-custom
}) => {
  
  // 🆕 State לצבע הנבחר (שלב 1)
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  // 🆕 State להצגת כל הצבעים (אחרי לחיצה על +X)
  const [showAllColors, setShowAllColors] = useState(false);
  
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
    // 🆕 קודם כל - נסה להשתמש ב-colorHex אם קיים (קוד HEX אמיתי לתצוגה)
    if ((sku as any).colorHex) {
      return (sku as any).colorHex;
    }
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

  // 🆕 פונקציה לקבלת שם הצבע (לא HEX) מ-SKU
  const getSkuColorName = (sku: Sku): string => {
    // נסה לקבל את שם הצבע מה-color (השם המותאם אישית שהמנהל הכניס)
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

  // 🔧 אם אין SKUs עם צבעים (colorGroups ריק) ולא מדובר בוריאנטים מותאמים - אל תציג כלום
  // זה מונע הצגת כפתורי צבע ריקים למוצרים עם SKU דיפולטיבי בלבד
  if (colorGroups.length === 0 && variantType !== 'custom') {
    return null;
  }

  // 🆕 Phase 4: **תצוגת וריאנטים מותאמים אישית (dropdown)**
  // עבור variantType === 'custom' - מציג dropdown במקום כפתורי צבע
  if (variantType === 'custom') {
    // קיבוץ לפי variantName (הוריאנט הראשי)
    const customVariantGroups = useMemo(() => {
      const groups: { [key: string]: { variantName: string; skus: Sku[] } } = {};
      
      for (const sku of skus) {
        const variantName = (sku as any).variantName || sku.name || 'ללא שם';
        
        if (!groups[variantName]) {
          groups[variantName] = { variantName, skus: [] };
        }
        groups[variantName].skus.push(sku);
      }
      
      return Object.values(groups);
    }, [skus]);

    return (
      <div className={styles.variantSection}>
        {/* Dropdown לבחירת וריאנט ראשי */}
        <div className={styles.customVariantSelector}>
          <label className={styles.customVariantLabel}>
            {primaryVariantLabel || 'בחר'}:
          </label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.customVariantSelect}
              value={selectedSku || ''}
              onChange={(e) => onSkuChange(e.target.value)}
              title={`בחר ${primaryVariantLabel || 'וריאנט'}`}
            >
              {customVariantGroups.length === 1 && customVariantGroups[0].skus.length === 1 ? (
                // אם יש רק SKU אחד - הצג אותו ישירות
                <option value={customVariantGroups[0].skus[0].sku}>
                  {customVariantGroups[0].variantName}
                </option>
              ) : (
                // אם יש מספר וריאנטים
                customVariantGroups.map(group => (
                  group.skus.length === 1 ? (
                    // וריאנט עם SKU בודד
                    <option key={group.skus[0].sku} value={group.skus[0].sku}>
                      {group.variantName}
                    </option>
                  ) : (
                    // וריאנט עם תת-וריאנטים (optgroup)
                    <optgroup key={group.variantName} label={group.variantName}>
                      {group.skus.map(sku => (
                        <option key={sku.sku} value={sku.sku}>
                          {group.variantName} - {(sku as any).subVariantName || sku.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                ))
              )}
            </select>
            <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    );
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
            const colorHex = getSkuColor(skuItem); // קוד HEX לתצוגה בכפתור
            const colorName = getSkuColorName(skuItem); // שם הצבע המקורי
            const colorCode = getColorCode(colorHex);
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
                title={`בחר צבע ${colorName || colorHex}`}
              >
                {showColorPreview && !compactMode && (
                  <div className={styles.colorPreview} />
                )}
                
                {!compactMode && (
                  <>
                    {skuItem.images && skuItem.images.length > 0 ? (
                      <img 
                        src={getImageUrl(skuItem.images[0])} 
                        alt={`${colorName || colorHex} variant`}
                        className={styles.variantImage}
                      />
                    ) : (
                      (colorName || colorHex) && (
                        <span className={styles.variantColorName}>{colorName || getColorDisplayName(colorHex)}</span>
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

  // 🆕 בדיקה אם יש תת-וריאנטים להציג
  const hasSecondaryVariants = selectedColorGroup && selectedColorGroup.variants.length > 1;

  // 🆕 תרגום label לפי סוג המאפיין
  const getSecondaryAttributeLabel = (): string => {
    if (!secondaryVariantAttribute) return 'בחר';
    if (secondaryVariantAttribute === 'size') return 'מידה';
    if (secondaryVariantAttribute === 'htngdvt_slylym') return 'התנגדות';
    if (secondaryVariantAttribute === 'nicotine') return 'ניקוטין';
    return 'בחר';
  };

  return (
    <div className={styles.variantSection}>
      {/* שלב 1: בחירת צבע - רק אם לא במצב secondaryOnly */}
      {!secondaryOnly && (
        <>
          {!compactMode && <h3 className={styles.variantTitle}>צבע:</h3>}
          <div className={styles.variantOptions}>
        {colorGroups.slice(0, showAllColors ? colorGroups.length : (maxColors || colorGroups.length)).map((group, index) => {
          const colorHex = getSkuColor(group.skus[0]); // קוד HEX לתצוגה בכפתור
          const colorName = getSkuColorName(group.skus[0]); // שם הצבע המקורי
          const colorCode = getColorCode(colorHex);
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
              title={`בחר צבע ${colorName || colorHex}`}
            >
              {showColorPreview && !compactMode && (
                <div className={styles.colorPreview} />
              )}
              
              {!compactMode && (
                <>
                  {group.skus[0].images && group.skus[0].images.length > 0 ? (
                    <img 
                      src={getImageUrl(group.skus[0].images[0])} 
                      alt={`${colorName || colorHex} variant`}
                      className={styles.variantImage}
                    />
                  ) : (
                    (colorName || colorHex) && (
                      <span className={styles.variantColorName}>{colorName || getColorDisplayName(colorHex)}</span>
                    )
                  )}
                </>
              )}
            </Button>
          );
        })}
        {maxColors && colorGroups.length > maxColors && !showAllColors && (
          <span 
            className={styles.moreColorsIndicator} 
            title={`לחץ להצגת כל ${colorGroups.length} הצבעים`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAllColors(true);
            }}
          >
            +{colorGroups.length - maxColors}
          </span>
        )}
      </div>
        </>
      )}

      {/* שלב 2: בחירת תת-וריאנט */}
      {hasSecondaryVariants && !hideSecondaryVariants && (
        <div className={styles.secondaryVariantSection}>
          {/* 🆕 מצב רגיל - כפתורים */}
          {!compactMode && (
            <>
              <h4 className={styles.secondaryVariantTitle}>{getSecondaryAttributeLabel()}:</h4>
              <div className={styles.secondaryVariantOptions}>
                {selectedColorGroup!.variants.map((variant, index) => {
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
            </>
          )}

          {/* 🆕 מצב קומפקטי - dropdown */}
          {compactMode && (
            <div className={styles.compactSecondaryVariant}>
              <label className={styles.compactLabel}>{getSecondaryAttributeLabel()}:</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.compactSelect}
                  value={selectedSku || ''}
                  onChange={(e) => onSkuChange(e.target.value)}
                  title={`בחר ${getSecondaryAttributeLabel()}`}
                >
                  {selectedColorGroup!.variants.map((variant, index) => (
                    <option key={`opt-${variant.value}-${index}`} value={variant.sku}>
                      {variant.value}
                    </option>
                  ))}
                </select>
                <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
