// ייבוא ספריית React הבסיסית
import React, { useEffect, useState, useMemo } from 'react';

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
  cardMode?: boolean;                   // 🆕 מצב כרטיס - מרווחים מינימליים לשימוש בכרטיסיית מוצר
  secondaryVariantAttribute?: string | null; // 🆕 מפתח המאפיין המשני (size/resistance/nicotine)
  secondaryOnly?: boolean;              // 🆕 מצב להצגת רק תת-וריאנט (בלי כפתורי צבע)
  hideSecondaryVariants?: boolean;      // 🆕 הסתרת תת-וריאנטים (לשימוש בכרטיסייה)
  showSecondaryColorsInCompact?: boolean; // 🎯 הצג כפתורי צבע של ציר משני גם במצב compact (כרטיסייה)
  maxColors?: number;                   // 🆕 מספר מקסימלי של כפתורי צבעים להצגה (שאר יוצגו כ-+X)
  colorFamilyImages?: { [colorFamily: string]: any[] }; // 🆕 תמונות משפחות צבעים (fallback)
  colorImages?: { [color: string]: any[] }; // 🆕 תמונות לפי צבע ספציפי (עדיפות)
  useDropdownForSecondary?: boolean;    // 🎯 האם להציג תת-וריאנטים כ-dropdown (במקום כפתורים)
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

const COLOR_METADATA_ATTRIBUTE_KEYS = new Set([
  'צבעhex',
  'צבעfamily',
  'colorhex',
  'colorfamily',
]);

const hasNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const hasColorAttributeValue = (sku: Sku): boolean => {
  const attributes = (sku as any).attributes;
  return Boolean(attributes?.['צבע'] || attributes?.color);
};

const hasMeaningfulSecondaryAxisData = (sku: Sku): boolean => {
  const skuAny = sku as any;

  if (hasNonEmptyString(skuAny.subVariantName)) {
    return true;
  }

  const primaryValue = (
    (hasNonEmptyString(skuAny.variantName) && skuAny.variantName) ||
    (hasNonEmptyString(sku.name) && sku.name) ||
    ''
  ).trim();

  return Object.entries(skuAny.attributes || {}).some(([key, value]) => {
    if (!hasNonEmptyString(value)) {
      return false;
    }

    if (COLOR_METADATA_ATTRIBUTE_KEYS.has(key.toLowerCase())) {
      return false;
    }

    return !primaryValue || value.trim() !== primaryValue;
  });
};

// הגדרת קומפוננטת VariantSelector
const VariantSelector: React.FC<VariantSelectorProps> = ({
  skus,
  selectedSku,
  onSkuChange,
  showColorPreview = true,
  compactMode = false,
  cardMode = false,
  secondaryVariantAttribute = null,
  secondaryOnly = false,
  hideSecondaryVariants = false,
  showSecondaryColorsInCompact = false, // 🎯 ברירת מחדל: לא מציגים ציר משני ב-compact
  maxColors = compactMode ? 2 : undefined, // ברירת מחדל חכמה: 2 ב-compactMode
  colorFamilyImages = {}, // 🆕 תמונות משפחות צבעים (fallback)
  colorImages = {}, // 🆕 תמונות לפי צבע ספציפי (עדיפות)
  useDropdownForSecondary = false, // 🎯 ברירת מחדל: כפתורים (תאימות לאחור)
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
      'כסף': '#c0c0c0',
      // צבעים ספציפיים
      'Crimson': '#DC143C',
      'ארגמן': '#DC143C',
      'Scarlet': '#FF2400',
      'שני': '#FF2400',
      'Amber': '#FFBF00',
      'ענבר': '#FFBF00',
      'Burnt Orange': '#CC5500',
      'כתום שרוף': '#CC5500'
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
    // נסה attributes['צבע'] או attributes.color (תמיכה בעברית)
    if (sku.attributes) {
      const skuAny = sku as any;
      if (skuAny.attributes['צבע']) {
        return skuAny.attributes['צבע'];
      }
      if (skuAny.attributes.color) {
        return skuAny.attributes.color;
      }
    }
    // נסה subVariantName אם הציר המשני הוא צבע
    if ((sku as any).subVariantName) {
      return (sku as any).subVariantName;
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
    // נסה attributes['צבע'] או attributes.color (תמיכה בעברית)
    if (sku.attributes) {
      const skuAny = sku as any;
      if (skuAny.attributes['צבע']) {
        return skuAny.attributes['צבע'];
      }
      if (skuAny.attributes.color) {
        return skuAny.attributes.color;
      }
    }
    // נסה subVariantName אם הציר המשני הוא צבע
    if ((sku as any).subVariantName) {
      return (sku as any).subVariantName;
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

  // 🆕 זיהוי אם באמת קיים ציר משני בנתוני ה-SKU.
  // כך מוצר חד-צירי ישן, ששמר בטעות attribute של הציר הראשי,
  // לא יזוהה כמוצר דו-צירי.
  const hasMeaningfulSecondaryAxis = useMemo(() => {
    return skus.some(hasMeaningfulSecondaryAxisData);
  }, [skus]);

  // 🆕 זיהוי מבנה הוריאנטים: האם יש variantName שמשתנה?
  // רק אם יש גם צבע ב-attributes וגם ציר משני אמיתי,
  // נפרש את variantName כציר ראשי נפרד.
  const hasVariantNameAxis = useMemo(() => {
    const hasColorInAttributes = skus.some(hasColorAttributeValue);
    if (!hasColorInAttributes || !hasMeaningfulSecondaryAxis) {
      return false;
    }

    const variantNames = new Set(skus.map(sku => (sku as any).variantName).filter(Boolean));
    return variantNames.size > 1;
  }, [skus, hasMeaningfulSecondaryAxis]);

  // 🆕 קיבוץ SKUs - אם יש variantName קבץ לפיו, אחרת לפי צבע
  const colorGroups = useMemo<ColorGroup[]>(() => {
    const groups: { [color: string]: ColorGroup } = {};
    
    // אם יש variantName שמשתנה, לא נקבץ לפי צבע כאן (הצבע יהיה משני)
    if (hasVariantNameAxis) {
      return [];
    }
    
    for (const sku of skus) {
      // 🎯 קבלת color (צבע ספציפי) לקיבוץ - לא colorFamily!
      const colorValue = (sku as any).color || getSkuColor(sku);
      if (!colorValue) continue;
      
      if (!groups[colorValue]) {
        // השתמש ב-SKU הראשון כנציג של הצבע
        const representativeSku = sku;
        const colorHex = getSkuColor(representativeSku);
        
        groups[colorValue] = {
          color: colorValue, // הצבע הספציפי
          colorHex: colorHex.startsWith('#') ? colorHex : undefined,
          skus: [],
          variants: []
        };
      }
      
      groups[colorValue].skus.push(sku);
      
      // אם יש תת-וריאנט, הוסף אותו לרשימה
      if (secondaryVariantAttribute && sku.attributes?.[secondaryVariantAttribute]) {
        groups[colorValue].variants.push({
          value: sku.attributes[secondaryVariantAttribute]!,
          sku: sku.sku
        });
      }
    }
    
    return Object.values(groups);
  }, [skus, secondaryVariantAttribute, hasVariantNameAxis]);

  // 🆕 אתחול selectedColor לפי SKU הנבחר
  React.useEffect(() => {
    if (selectedSku) {
      const currentSku = skus.find(s => s.sku === selectedSku);
      if (currentSku) {
        // 🎯 שימוש ב-color במקום colorFamily כדי להתאים ל-colorGroups
        const colorValue = (currentSku as any).color || getSkuColor(currentSku);
        setSelectedColor(colorValue);
      }
    }
  }, [selectedSku, skus]);

  // אם אין SKUs זמינים, לא נציג כלום
  if (!skus || skus.length === 0) {
    return null;
  }

  // 🔧 מוצר עם SKU בודד בלבד - לא צריך להציג בורר
  // (אבל אם יש יותר מ-SKU אחד - תמיד צריך להציג בורר)
  if (skus.length === 1) {
    return null;
  }

  // ============================================================================
  // 🆕 הכנה לוריאנטים מותאמים (custom): זיהוי צירים וארגון קבוצות
  // ============================================================================
  const hasCustomSecondaryAxis = hasMeaningfulSecondaryAxis;

  const customVariantGroups = useMemo(() => {
    // קיבוץ לפי variantName (ציר ראשי)
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

  const currentSelectedCustomGroup = useMemo(() => {
    if (!selectedSku) return customVariantGroups[0];
    return customVariantGroups.find(g => g.skus.some(s => s.sku === selectedSku)) || customVariantGroups[0];
  }, [selectedSku, customVariantGroups]);

  const [selectedCustomPrimaryValue, setSelectedCustomPrimaryValue] = useState<string>(
    currentSelectedCustomGroup?.variantName || ''
  );

  useEffect(() => {
    if (currentSelectedCustomGroup) {
      setSelectedCustomPrimaryValue(currentSelectedCustomGroup.variantName);
    }
  }, [currentSelectedCustomGroup]);

  const customSecondaryOptions = useMemo(() => {
    const group = customVariantGroups.find(g => g.variantName === selectedCustomPrimaryValue);
    return group?.skus || [];
  }, [customVariantGroups, selectedCustomPrimaryValue]);

  // 🆕 Phase 4: **תצוגת וריאנטים מותאמים אישית (dropdown)**
  // עבור variantType === 'custom' - מציג dropdown במקום כפתורי צבע
  if (variantType === 'custom') {
    // 🎯 עדכון: אם אחד הצירים הוא צבע, נציג אותו ככפתורים גם ב-custom mode

    const isPrimaryAxisColor = customVariantGroups.length > 1 && customVariantGroups.every(g => {
      if (!g.skus[0]) return false;
      const c = (g.skus[0] as any).color || (g.skus[0] as any).colorHex;
      return Boolean(c);
    }) && new Set(customVariantGroups.map(g => (g.skus[0] as any).color || (g.skus[0] as any).colorHex)).size === customVariantGroups.length;

    const isSecondaryAxisColor = customSecondaryOptions.length > 1 && (() => {
      // זיהוי אם ה-attributes מכילים מפתח "צבע" או "color"
      const colors = customSecondaryOptions.map(sku => {
        const skuAny = sku as any;
        // אם יש color/colorHex ישירות - השתמש בהם
        if (skuAny.color || skuAny.colorHex) {
          return skuAny.color || skuAny.colorHex;
        }
        // אחרת בדוק אם יש attribute "צבע" או "color"
        if (skuAny.attributes) {
          return skuAny.attributes['צבע'] || skuAny.attributes['color'];
        }
        return null;
      });
      
      const uniqueColors = new Set(colors.filter(Boolean));
      
      // אם יש לפחות 2 צבעים שונים ולכל SKU יש צבע - הציר הוא צבע
      return uniqueColors.size >= 2 && colors.filter(Boolean).length === customSecondaryOptions.length;
    })();

    // אם יש שני צירים → מציג שני דרופדאונים (או כפתורים אם זה צבע) מדורגים
    if (hasCustomSecondaryAxis) {
      const primaryLabelText = primaryVariantLabel || 'וריאנט';
      const secondaryLabelText = secondaryVariantLabel || 'וריאנט משני';

      const handlePrimaryChange = (primaryValue: string) => {
        setSelectedCustomPrimaryValue(primaryValue);
        // בחר אוטומטית SKU ראשון בקבוצה החדשה
        const newGroup = customVariantGroups.find(g => g.variantName === primaryValue);
        if (newGroup && newGroup.skus.length > 0) {
          onSkuChange(newGroup.skus[0].sku);
        }
      };

      return (
        <div className={`${styles.variantSection} ${cardMode ? styles.cardMode : ''}`}>
          {/* 🎯 אם הציר המשני הוא צבע - נציג אותו ראשון (UX: צבע תמיד ראשון) */}
          {/* במצב compactMode (כרטיסייה) - ללא wrapper שמוסיף מרווחים, כדי שהכפתורים יהיו באותו מיקום כמו צבע ראשי */}
          {isSecondaryAxisColor && customSecondaryOptions.length > 0 && (!hideSecondaryVariants || showSecondaryColorsInCompact) && (
            <div className={compactMode ? undefined : styles.secondaryVariantSection}>
              {!compactMode && <h4 className={styles.secondaryVariantTitle}>{secondaryLabelText}:</h4>}
              <div className={styles.variantOptions}>
                {customSecondaryOptions.slice(0, showAllColors ? customSecondaryOptions.length : (maxColors || customSecondaryOptions.length)).map((sku, idx) => {
                  const colorHex = getSkuColor(sku);
                  const colorName = getSkuColorName(sku);
                  const colorCode = getColorCode(colorHex);
                  const isSelected = sku.sku === selectedSku;
                  // קבלת שם הצבע בעברית מקוד ה-HEX
                  const hebrewColorName = getColorNameHebrew(colorCode);
                  
                  return (
                    <Button
                      key={`custom-secondary-${sku.sku}-${idx}`}
                      variant={'ghost'}
                      size="sm"
                      className={`${styles.variantButton} ${
                        isSelected ? styles.variantActive : ''
                      } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
                      onClick={() => onSkuChange(sku.sku)}
                      style={{
                        ['--variant-color' as any]: colorCode,
                        ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                      }}
                      title={`בחר ${secondaryLabelText} ${hebrewColorName || colorName || colorHex}`}
                    >
                      {showColorPreview && (
                        <div className={styles.colorPreview} />
                      )}
                      
                      {!compactMode && (() => {
                         // 🆕 לוגיקת חיפוש תמונה: colorImages (עדיפות) -> colorFamilyImages (fallback) -> תמונות SKU
                         const skuColorName = (sku as any).color;
                         const skuColorFamily = (sku as any).colorFamily;
                         
                         // ניסיון 1: תמונות לפי צבע ספציפי
                         const specificColorImages = skuColorName && colorImages[skuColorName];
                         // ניסיון 2: תמונות משפחת צבע (fallback)
                         const familyImages = skuColorFamily && colorFamilyImages[skuColorFamily];
                         // ניסיון 3: תמונות ה-SKU עצמו
                         const imageToShow = specificColorImages?.[0] || familyImages?.[0] || sku.images?.[0];
                         
                         return imageToShow ? (
                          <img 
                            src={getImageUrl(imageToShow)} 
                            alt={`${hebrewColorName || colorName || colorHex} variant`}
                            className={styles.variantImage}
                          />
                        ) : (
                          <span className={styles.variantColorName}>{hebrewColorName || colorName || getColorDisplayName(colorHex)}</span>
                        );
                      })()}
                    </Button>
                  );
                })}
                {/* אינדיקטור "+X" לצבעים נוספים - כמו במצב צבע ראשי */}
                {maxColors && customSecondaryOptions.length > maxColors && !showAllColors && (
                  <span 
                    className={styles.moreColorsIndicator} 
                    title={`לחץ להצגת כל ${customSecondaryOptions.length} הצבעים`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllColors(true);
                    }}
                  >
                    +{customSecondaryOptions.length - maxColors}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ציר ראשי: דרופדאון או כפתורי צבע */}
          {/* 🎯 במצב compact: אם הציר הראשי או המשני הוא צבע, לא מציגים דרופדאון (מציגים רק כפתורי צבע) */}
          {!(compactMode && (isSecondaryAxisColor && showSecondaryColorsInCompact || isPrimaryAxisColor)) && (isPrimaryAxisColor ? (
             <div className={styles.variantOptions}>
                {!compactMode && <h3 className={styles.variantTitle}>{primaryLabelText}:</h3>}
                {/* חיתוך לפי maxColors + אינדיקטור +X — זהה לנתיבי הצבע האחרים */}
                {customVariantGroups.slice(0, showAllColors ? customVariantGroups.length : (maxColors || customVariantGroups.length)).map((group, index) => {
                  const representativeSku = group.skus[0];
                  const colorHex = getSkuColor(representativeSku);
                  const colorCode = getColorCode(colorHex);
                  const isSelected = group.variantName === selectedCustomPrimaryValue;

                  return (
                    <Button
                      key={`custom-primary-${group.variantName}-${index}`}
                      variant={'ghost'}
                      size="sm"
                      className={`${styles.variantButton} ${
                        isSelected ? styles.variantActive : ''
                      } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
                      onClick={() => handlePrimaryChange(group.variantName)}
                      style={{
                        ['--variant-color' as any]: colorCode,
                        ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                      }}
                      title={`בחר ${primaryLabelText} ${group.variantName}`}
                    >
                      {showColorPreview && !compactMode && (
                        <div className={styles.colorPreview} />
                      )}
                      
                      {!compactMode && (() => {
                        // 🆕 לוגיקת חיפוש תמונה גם ב-custom: colorImages (עדיפות) -> colorFamilyImages (fallback) -> תמונות SKU
                        const skuColorName = (representativeSku as any).color;
                        const skuColorFamily = (representativeSku as any).colorFamily;
                        
                        // ניסיון 1: תמונות לפי צבע ספציפי
                        const specificColorImages = skuColorName && colorImages[skuColorName];
                        // ניסיון 2: תמונות משפחת צבע (fallback)
                        const familyImages = skuColorFamily && colorFamilyImages[skuColorFamily];
                        // ניסיון 3: תמונות ה-SKU עצמו
                        const imageToShow = specificColorImages?.[0] || familyImages?.[0] || representativeSku.images?.[0];
                        
                        return imageToShow ? (
                          <img 
                            src={getImageUrl(imageToShow)} 
                            alt={`${group.variantName} variant`}
                            className={styles.variantImage}
                          />
                        ) : (
                           <span className={styles.variantColorName}>{group.variantName}</span>
                        );
                      })()}
                    </Button>
                  );
                })}
                {/* אינדיקטור "+X" לצבעים נוספים */}
                {maxColors && customVariantGroups.length > maxColors && !showAllColors && (
                  <span 
                    className={styles.moreColorsIndicator} 
                    title={`לחץ להצגת כל ${customVariantGroups.length} הצבעים`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllColors(true);
                    }}
                  >
                    +{customVariantGroups.length - maxColors}
                  </span>
                )}
             </div>
          ) : !compactMode && (
            <div className={styles.customVariantSelector}>
              <label className={styles.customVariantLabel}>
                {primaryLabelText}:
              </label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.customVariantSelect}
                  value={selectedCustomPrimaryValue}
                  onChange={(e) => handlePrimaryChange(e.target.value)}
                  title={`בחר ${primaryLabelText}`}
                >
                  {customVariantGroups.map(group => (
                    <option key={`primary-${group.variantName}`} value={group.variantName}>
                      {group.variantName}
                    </option>
                  ))}
                </select>
                <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}

          {/* ציר משני: דרופדאון (רק אם הוא לא צבע, כי אז הוצג למעלה) */}
          {/* 🎯 במצב compact: לא מציגים דרופדאון בכלל, רק כפתורי צבע */}
          {customSecondaryOptions.length > 0 && !isSecondaryAxisColor && !compactMode && (
            <div className={styles.customVariantSelector}>
              <label className={styles.customVariantLabel}>
                {secondaryLabelText}:
              </label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.customVariantSelect}
                  value={selectedSku || ''}
                  onChange={(e) => onSkuChange(e.target.value)}
                  title={`בחר ${secondaryLabelText}`}
                >
                  {customSecondaryOptions.map((sku, idx) => {
                    const skuAny = sku as any;
                    let secondaryDisplayValue: string;

                    // עדיפות ל-subVariantName, אחרת attributes, אחרת name
                    if (skuAny.subVariantName) {
                      secondaryDisplayValue = skuAny.subVariantName;
                    } else if (skuAny.attributes && Object.keys(skuAny.attributes).length > 0) {
                      const attributeKey = Object.keys(skuAny.attributes)[0];
                      secondaryDisplayValue = skuAny.attributes[attributeKey];
                    } else {
                      secondaryDisplayValue = skuAny.name || sku.name;
                    }

                    return (
                      <option key={`secondary-${sku.sku}-${idx}`} value={sku.sku}>
                        {secondaryDisplayValue}
                      </option>
                    );
                  })}
                </select>
                <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      );
    }

    // אם יש ציר אחד בלבד → מציג דרופדאון יחיד (התנהגות קודמת)
    return (
      <div className={`${styles.variantSection} ${cardMode ? styles.cardMode : ''}`}>
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

  // 🔍 **זיהוי אוטומטי: האם אחד מהצירים הוא צבע**
  // בדיקה אם לפחות SKU אחד מכיל color/colorHex/colorFamily
  const hasColorVariant = useMemo(() => {
    return skus.some(sku => 
      (sku as any).color || 
      (sku as any).colorHex || 
      (sku as any).colorFamily
    );
  }, [skus]);

  // 🔍 **קביעת מצב התצוגה:**
  // מצב פשוט רק אם יש SKU אחד בסה"כ
  // אם יש יותר מ-SKU אחד - תמיד מצב היררכי (קיבוץ לפי צבע)
  const useSimpleMode = skus.length === 1;

  // **תצוגה פשוטה (מצב ישן - תאימות לאחור)**
  if (useSimpleMode) {
    return (
      <div className={`${styles.variantSection} ${cardMode ? styles.cardMode : ''}`}>
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
                    {(() => {
                      // 🆕 לוגיקת חיפוש תמונה: colorImages (עדיפות) -> colorFamilyImages (fallback) -> תמונות SKU
                      const colorName = skuItem.color;
                      const colorFamily = skuItem.colorFamily;
                      
                      // ניסיון 1: תמונות לפי צבע ספציפי
                      const specificColorImages = colorName && colorImages[colorName];
                      // ניסיון 2: תמונות משפחת צבע (fallback)
                      const familyImages = colorFamily && colorFamilyImages[colorFamily];
                      // ניסיון 3: תמונות ה-SKU עצמו
                      const imageToShow = specificColorImages?.[0] || familyImages?.[0] || skuItem.images?.[0];
                      
                      // 🔍 DEBUG
                      if (colorName) {
                        console.log(`🎨 VariantSelector - SKU ${skuItem.sku}:`, {
                          colorName,
                          colorFamily,
                          specificColorImages: specificColorImages ? `${specificColorImages.length} images` : 'none',
                          familyImages: familyImages ? `${familyImages.length} images` : 'none',
                          skuImages: skuItem.images?.length || 0,
                          imageToShow: imageToShow ? 'found' : 'NOT FOUND'
                        });
                      }
                      
                      return imageToShow ? (
                        <img 
                          src={getImageUrl(imageToShow)} 
                          alt={`${colorName || colorHex} variant`}
                          className={styles.variantImage}
                        />
                      ) : (
                        (colorName || colorHex) && (
                          <span className={styles.variantColorName}>{colorName || getColorDisplayName(colorHex)}</span>
                        )
                      );
                    })()}
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

  // 🔍 בדיקה אם יש תת-וריאנטים להציג
  // מציג dropdown אם:
  // 1. יש קבוצת צבע נבחרת
  // 2. ויש יותר מ-SKU אחד באותה קבוצה (כלומר יש מה לבחור)
  const hasSecondaryVariants = selectedColorGroup && selectedColorGroup.skus.length > 1;

  // 🆕 זיהוי אם הציר המשני הוא צבע
  // בודק אם ה-SKUs בקבוצה הנבחרת שונים בצבע שלהם
  const isSecondaryAxisColor = useMemo(() => {
    if (!selectedColorGroup || selectedColorGroup.skus.length <= 1) return false;
    
    // בדיקה אם לכל SKU בקבוצה יש צבע
    const colors = selectedColorGroup.skus.map(sku => {
      const skuAny = sku as any;
      if (skuAny.color || skuAny.colorHex) {
        return skuAny.color || skuAny.colorHex;
      }
      if (skuAny.attributes) {
        return skuAny.attributes['צבע'] || skuAny.attributes['color'];
      }
      return null;
    });
    const uniqueColors = new Set(colors.filter(Boolean));
    
    // אם יש לפחות 2 צבעים שונים ולכל SKU יש צבע - הציר המשני הוא צבע
    return uniqueColors.size >= 2 && colors.filter(Boolean).length === selectedColorGroup.skus.length;
  }, [selectedColorGroup]);

  // 🆕 זיהוי אוטומטי של שם הוריאנט הראשי
  const getPrimaryVariantLabel = (): string => {
    // קודם כל ננסה להשתמש ב-label שהועבר מהמוצר
    if (primaryVariantLabel) return primaryVariantLabel;
    
    // זיהוי אוטומטי מה-SKUs
    if (skus.length > 0) {
      const firstSku = skus[0] as any;
      
      // אם יש variantName + attributes → הציר הראשי הוא ה-attribute
      if (hasMeaningfulSecondaryAxis && firstSku.variantName && firstSku.attributes && Object.keys(firstSku.attributes).length > 0) {
        const attributeKey = Object.keys(firstSku.attributes)[0];
        // אם המפתח הוא בעברית - נחזיר אותו
        if (/[\u0590-\u05FF]/.test(attributeKey)) {
          return attributeKey; // למשל: "טעם"
        }
        // תרגום שמות באנגלית
        if (attributeKey === 'flavor') return 'טעם';
        if (attributeKey === 'type') return 'סוג';
        return attributeKey;
      }
      
      // אחרת - variantName הוא הציר הראשי
      if (firstSku.variantName) {
        return 'דגם';
      }
    }
    
    return 'בחר';
  };

  // 🆕 תרגום label לפי סוג המאפיין - לציר משני  
  const getSecondaryAttributeLabel = (): string => {
    // קודם כל ננסה להשתמש ב-label שהועבר מהמוצר
    if (secondaryVariantLabel) return secondaryVariantLabel;
    
    // זיהוי אוטומטי מה-SKUs
    if (skus.length > 0) {
      const firstSku = skus[0] as any;
      
      // אם יש variantName + attributes → הציר המשני הוא variantName
      if (hasMeaningfulSecondaryAxis && firstSku.variantName && firstSku.attributes && Object.keys(firstSku.attributes).length > 0) {
        return 'דגם'; // או "התנגדות סלילים" אם זה מוגדר ב-secondaryVariantLabel
      }
    }
    
    return 'בחר';
  };

  // 🎯 **החלטת מצב תצוגה לפי צבע:**
  // אם יש variantName שמשתנה → variantName הוא ראשי, צבע הוא משני
  // אחרת אם יש צבע → צבע הוא ראשי
  const shouldShowColorButtons = hasColorVariant && !hasVariantNameAxis;

  // 🆕 אם אין צבע בכלל → מצב דרופדאונים לשני הצירים
  if (!shouldShowColorButtons && !secondaryOnly) {
    // 🔧 זיהוי חכם של הצירים מבנה ה-SKU:
    // אם יש variantName + attributes → ציר ראשי = attribute value, ציר משני = variantName
    // אחרת → ציר ראשי = variantName
    
    const primaryAxisGroups = useMemo(() => {
      const groups: { [key: string]: { primaryValue: string; skus: Sku[] } } = {};
      
      for (const sku of skus) {
        let primaryValue: string;
        
        // בדיקה אם יש attributes + variantName (מבנה של 2 צירים)
        const skuAny = sku as any;
        if (skuAny.variantName && hasMeaningfulSecondaryAxisData(sku)) {
          // יש שני צירים: variantName הוא הציר הראשי, וה-subVariantName/attributes הם המשניים
          primaryValue = skuAny.variantName;
        } else {
          // אין שני צירים - variantName הוא הראשי או fallback לשם ה-SKU
          primaryValue = skuAny.variantName || sku.name;
        }
        
        if (!groups[primaryValue]) {
          groups[primaryValue] = { primaryValue, skus: [] };
        }
        groups[primaryValue].skus.push(sku);
      }
      
      return Object.values(groups);
    }, [skus]);

    // 🎯 מציאת הקבוצה הנבחרת לפי ה-SKU הנבחר
    const currentSelectedGroup = useMemo(() => {
      if (!selectedSku) return primaryAxisGroups[0];
      return primaryAxisGroups.find(g => g.skus.some(s => s.sku === selectedSku)) || primaryAxisGroups[0];
    }, [selectedSku, primaryAxisGroups]);

    // 🎯 שמירת הציר הראשי הנבחר (לא SKU - רק הערך של הציר)
    const [selectedPrimaryValue, setSelectedPrimaryValue] = useState<string>(
      currentSelectedGroup?.primaryValue || ''
    );

    // 🔄 סנכרון selectedPrimaryValue עם ה-SKU הנבחר
    React.useEffect(() => {
      if (currentSelectedGroup) {
        setSelectedPrimaryValue(currentSelectedGroup.primaryValue);
      }
    }, [currentSelectedGroup]);

    // 📋 רשימת האפשרויות לדרופדאון המשני (מסוננת לפי הציר הראשי)
    const secondaryOptions = useMemo(() => {
      const group = primaryAxisGroups.find(g => g.primaryValue === selectedPrimaryValue);
      return group?.skus || [];
    }, [primaryAxisGroups, selectedPrimaryValue]);

    const hasSecondaryAxisInNonColorMode = useMemo(() => {
      return secondaryOptions.some(hasMeaningfulSecondaryAxisData);
    }, [secondaryOptions]);

    // 🆕 בדיקה אם הציר המשני הוא צבע (לפי נוכחות color/colorHex ב-SKUs)
    const isSecondaryAxisColorInNonColorMode = useMemo(() => {
      if (secondaryOptions.length <= 1) return false;
      
      // בודק אם לכל SKU יש צבע
      const colors = secondaryOptions.map(sku => {
        const skuAny = sku as any;
        if (skuAny.color || skuAny.colorHex) {
          return skuAny.color || skuAny.colorHex;
        }
        if (skuAny.attributes) {
          return skuAny.attributes['צבע'] || skuAny.attributes['color'];
        }
        return null;
      });
      const uniqueColors = new Set(colors.filter(Boolean));
      
      // אם יש לפחות 2 צבעים שונים ולכל SKU יש צבע - הציר הוא צבע
      return uniqueColors.size >= 2 && colors.filter(Boolean).length === secondaryOptions.length;
    }, [secondaryOptions]);

    // 🎯 פונקציה לטיפול בשינוי הציר הראשי
    const handlePrimaryChange = (primaryValue: string) => {
      setSelectedPrimaryValue(primaryValue);
      // בחר אוטומטית את ה-SKU הראשון בקבוצה החדשה
      const newGroup = primaryAxisGroups.find(g => g.primaryValue === primaryValue);
      if (newGroup && newGroup.skus.length > 0) {
        onSkuChange(newGroup.skus[0].sku);
      }
    };

    return (
      <div className={`${styles.variantSection} ${cardMode ? styles.cardMode : ''}`}>
        {/* דרופדאון 1: ציר ראשי - מוסתר בכרטיסייה כשהציר המשני הוא צבע (כדי שכפתורי הצבע יהיו באותו מיקום תמיד) */}
        {!(compactMode && isSecondaryAxisColorInNonColorMode) && (
        <div className={styles.customVariantSelector}>
          <label className={styles.customVariantLabel}>
            {getPrimaryVariantLabel()}:
          </label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.customVariantSelect}
              value={selectedPrimaryValue}
              onChange={(e) => handlePrimaryChange(e.target.value)}
              title={`בחר ${getPrimaryVariantLabel()}`}
            >
              {primaryAxisGroups.map((group, idx) => (
                <option key={`primary-${group.primaryValue}-${idx}`} value={group.primaryValue}>
                  {group.primaryValue}
                </option>
              ))}
            </select>
            <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        )}

        {/* ציר משני: כפתורי צבע או dropdown */}
        {hasSecondaryAxisInNonColorMode && secondaryOptions.length > 0 && (
          isSecondaryAxisColorInNonColorMode ? (
            /* 🎯 אם הציר המשני הוא צבע - הצג כפתורי צבע (עם תמיכה ב-compactMode לכרטיסייה) */
            <div className={compactMode ? undefined : styles.secondaryVariantSection}>
              {!compactMode && <h4 className={styles.secondaryVariantTitle}>צבע:</h4>}
              <div className={styles.variantOptions}>
                {secondaryOptions.slice(0, showAllColors ? secondaryOptions.length : (maxColors || secondaryOptions.length)).map((sku, index) => {
                  const colorHex = getSkuColor(sku);
                  const colorName = getSkuColorName(sku);
                  const colorCode = getColorCode(colorHex);
                  const isSelected = sku.sku === selectedSku;
                  
                  return (
                    <Button
                      key={`noncolor-secondary-color-${sku.sku}-${index}`}
                      variant={'ghost'}
                      size="sm"
                      className={`${styles.variantButton} ${
                        isSelected ? styles.variantActive : ''
                      } ${showColorPreview ? styles.withColorPreview : ''} ${compactMode ? styles.compactMode : ''}`}
                      onClick={() => onSkuChange(sku.sku)}
                      style={{
                        ['--variant-color' as any]: colorCode,
                        ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                      }}
                      title={`בחר צבע ${colorName || colorHex}`}
                    >
                      {showColorPreview && !compactMode && (
                        <div className={styles.colorPreview} />
                      )}
                      
                      {!compactMode && (() => {
                        const skuColorName = sku.color;
                        const skuColorFamily = sku.colorFamily;
                        
                        const specificColorImages = skuColorName && colorImages[skuColorName];
                        const familyImages = skuColorFamily && colorFamilyImages[skuColorFamily];
                        const imageToShow = specificColorImages?.[0] || familyImages?.[0] || sku.images?.[0];
                        
                        return imageToShow ? (
                          <img 
                            src={getImageUrl(imageToShow)} 
                            alt={`${colorName || colorHex} variant`}
                            className={styles.variantImage}
                          />
                        ) : (
                          (colorName || colorHex) && (
                            <span className={styles.variantColorName}>{colorName || getColorDisplayName(colorHex)}</span>
                          )
                        );
                      })()}
                    </Button>
                  );
                })}
                {/* אינדיקטור "+X" לצבעים נוספים - כמו במצב צבע ראשי */}
                {maxColors && secondaryOptions.length > maxColors && !showAllColors && (
                  <span 
                    className={styles.moreColorsIndicator} 
                    title={`לחץ להצגת כל ${secondaryOptions.length} הצבעים`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllColors(true);
                    }}
                  >
                    +{secondaryOptions.length - maxColors}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* 🔽 אם הציר המשני אינו צבע - הצג dropdown */
            <div className={styles.customVariantSelector}>
              <label className={styles.customVariantLabel}>
                {getSecondaryAttributeLabel()}:
              </label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.customVariantSelect}
                  value={selectedSku || ''}
                  onChange={(e) => onSkuChange(e.target.value)}
                  title={`בחר ${getSecondaryAttributeLabel()}`}
                >
                  {secondaryOptions.map((sku, idx) => {
                    const skuAny = sku as any;
                    let secondaryDisplayValue: string;
                    
                    if (skuAny.subVariantName) {
                      secondaryDisplayValue = skuAny.subVariantName;
                    } else if (skuAny.attributes && Object.keys(skuAny.attributes).length > 0) {
                      const attributeKey = Object.keys(skuAny.attributes)[0];
                      secondaryDisplayValue = skuAny.attributes[attributeKey];
                    } else {
                      secondaryDisplayValue = skuAny.name;
                    }
                    
                    return (
                      <option key={`secondary-${sku.sku}-${idx}`} value={sku.sku}>
                        {secondaryDisplayValue}
                      </option>
                    );
                  })}
                </select>
                <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.variantSection} ${cardMode ? styles.cardMode : ''}`}>
      {/* שלב 1: בחירת צבע - רק אם יש צבע ולא במצב secondaryOnly */}
      {shouldShowColorButtons && !secondaryOnly && (
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
                  {(() => {
                    // 🆕 לוגיקת חיפוש תמונה: colorImages (עדיפות) -> colorFamilyImages (fallback) -> תמונות SKU
                    const skuColorName = group.skus[0].color;
                    const colorFamily = group.skus[0].colorFamily;
                    
                    // ניסיון 1: תמונות לפי צבע ספציפי
                    const specificColorImages = skuColorName && colorImages[skuColorName];
                    // ניסיון 2: תמונות משפחת צבע (fallback)
                    const familyImages = colorFamily && colorFamilyImages[colorFamily];
                    // ניסיון 3: תמונות ה-SKU עצמו
                    const imageToShow = specificColorImages?.[0] || familyImages?.[0] || group.skus[0].images?.[0];
                    
                    return imageToShow ? (
                      <img 
                        src={getImageUrl(imageToShow)} 
                        alt={`${colorName || colorHex} variant`}
                        className={styles.variantImage}
                      />
                    ) : (
                      (colorName || colorHex) && (
                        <span className={styles.variantColorName}>{colorName || getColorDisplayName(colorHex)}</span>
                      )
                    );
                  })()}
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
      {/* 🎯 הצג את הציר המשני אם: יש תת-וריאנטים + (לא הוסתר OU הוא צבע ומותר להציג במצב compact) */}
      {hasSecondaryVariants && (!hideSecondaryVariants || (isSecondaryAxisColor && showSecondaryColorsInCompact)) && (
        <div className={styles.secondaryVariantSection}>
          {/* 🎯 אם הציר המשני הוא צבע - הצג כפתורי צבע */}
          {isSecondaryAxisColor ? (
            <>
              <h4 className={styles.secondaryVariantTitle}>{getSecondaryAttributeLabel()}:</h4>
              <div className={styles.variantOptions}>
                {selectedColorGroup!.skus.map((sku, index) => {
                  const colorHex = getSkuColor(sku);
                  const colorName = getSkuColorName(sku);
                  const colorCode = getColorCode(colorHex);
                  const isSelected = sku.sku === selectedSku;
                  // קבלת שם הצבע בעברית מקוד ה-HEX
                  const hebrewColorName = getColorNameHebrew(colorCode);
                  
                  return (
                    <Button
                      key={`secondary-color-${sku.sku}-${index}`}
                      variant={'ghost'}
                      size="sm"
                      className={`${styles.variantButton} ${
                        isSelected ? styles.variantActive : ''
                      } ${showColorPreview ? styles.withColorPreview : ''}`}
                      onClick={() => onSkuChange(sku.sku)}
                      style={{
                        ['--variant-color' as any]: colorCode,
                        ['--variant-color-rgba' as any]: hexToRgba(colorCode, 0.12),
                      }}
                      title={`בחר ${getSecondaryAttributeLabel()} ${hebrewColorName || colorName || colorHex}`}
                    >
                      {showColorPreview && (
                        <div className={styles.colorPreview} />
                      )}
                      
                      {(() => {
                        const skuColorName = sku.color;
                        const colorFamily = sku.colorFamily;
                        
                        const specificColorImages = skuColorName && colorImages[skuColorName];
                        const familyImages = colorFamily && colorFamilyImages[colorFamily];
                        const imageToShow = specificColorImages?.[0] || familyImages?.[0] || sku.images?.[0];
                        
                        return imageToShow ? (
                          <img 
                            src={getImageUrl(imageToShow)} 
                            alt={`${hebrewColorName || colorName || colorHex} variant`}
                            className={styles.variantImage}
                          />
                        ) : (
                          <span className={styles.variantColorName}>{hebrewColorName || colorName || getColorDisplayName(colorHex)}</span>
                        );
                      })()}
                    </Button>
                  );
                })}
              </div>
            </>
          ) : (useDropdownForSecondary || compactMode) ? (
            <div className={styles.compactSecondaryVariant}>
              <label className={styles.compactLabel}>{getSecondaryAttributeLabel()}:</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.compactSelect}
                  value={selectedSku || ''}
                  onChange={(e) => onSkuChange(e.target.value)}
                  title={`בחר ${getSecondaryAttributeLabel()}`}
                >
                  {selectedColorGroup!.skus.map((sku, index) => {
                    const displayValue = secondaryVariantAttribute && sku.attributes?.[secondaryVariantAttribute]
                      ? sku.attributes[secondaryVariantAttribute]
                      : sku.name || sku.sku;
                    return (
                      <option key={`opt-${sku.sku}-${index}`} value={sku.sku}>
                        {displayValue}
                      </option>
                    );
                  })}
                </select>
                <svg className={styles.selectIcon} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ) : (
            /* מצב רגיל - כפתורים (רק אם לא ביקשו dropdown) */
            <>
              <h4 className={styles.secondaryVariantTitle}>{getSecondaryAttributeLabel()}:</h4>
              <div className={styles.secondaryVariantOptions}>
                {selectedColorGroup!.skus.map((sku, index) => {
                  const isSelected = sku.sku === selectedSku;
                  const displayValue = secondaryVariantAttribute && sku.attributes?.[secondaryVariantAttribute]
                    ? sku.attributes[secondaryVariantAttribute]
                    : sku.name || sku.sku;
                  
                  return (
                    <button
                      key={`variant-${sku.sku}-${index}`}
                      className={`${styles.secondaryVariantButton} ${
                        isSelected ? styles.secondaryVariantActive : ''
                      }`}
                      onClick={() => onSkuChange(sku.sku)}
                      title={`בחר ${displayValue}`}
                    >
                      {displayValue}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
