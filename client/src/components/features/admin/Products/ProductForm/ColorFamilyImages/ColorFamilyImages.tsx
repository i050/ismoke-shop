// Color Family Images Component
// מטרת הקומפוננטה: ניהול תמונות לפי צבע ספציפי + fallback למשפחות צבע
// 🆕 עדכון: תמיכה ב-colorImages (צבע ספציפי) בנוסף ל-colorFamilyImages (משפחה)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ImageGalleryManager, Icon, type ImageObject } from '@ui';
import { FilterAttributeService } from '../../../../../../services/filterAttributeService';
import { getColorHex } from '../../../../../../utils/colorConstants';
import styles from './ColorFamilyImages.module.css';

// 🆕 טייפ מקומי עם צבע ייצוגי
interface ColorFamilyWithHex {
  family: string;
  displayName: string;
  representativeHex: string;
}

// 🆕 טייפ לצבע ספציפי מה-SKU
interface SpecificColor {
  color: string;        // שם הצבע (למשל: "כחול נייבי")
  colorHex: string;     // קוד HEX
  colorFamily: string;  // המשפחה (למשל: "blue")
}

// 🔄 Fallback - רשימת משפחות צבעים בסיסית במקרה שהשרת לא זמין
const FALLBACK_COLOR_FAMILIES: ColorFamilyWithHex[] = [
  { family: 'black', displayName: 'שחור', representativeHex: '#000000' },
  { family: 'white', displayName: 'לבן', representativeHex: '#FFFFFF' },
  { family: 'red', displayName: 'אדום', representativeHex: '#EF4444' },
  { family: 'blue', displayName: 'כחול', representativeHex: '#3B82F6' },
  { family: 'green', displayName: 'ירוק', representativeHex: '#22C55E' },
  { family: 'yellow', displayName: 'צהוב', representativeHex: '#EAB308' },
  { family: 'orange', displayName: 'כתום', representativeHex: '#F97316' },
  { family: 'purple', displayName: 'סגול', representativeHex: '#A855F7' },
  { family: 'pink', displayName: 'ורוד', representativeHex: '#EC4899' },
  { family: 'gray', displayName: 'אפור', representativeHex: '#6B7280' },
  { family: 'brown', displayName: 'חום', representativeHex: '#78350F' },
];

/**
 * Props של קומפוננטת ColorFamilyImages
 */
interface ColorFamilyImagesProps {
  /** מפת תמונות לפי משפחת צבע (fallback) */
  value: { [family: string]: ImageObject[] };
  /** callback לעדכון תמונות משפחה */
  onChange: (images: { [family: string]: ImageObject[] }) => void;
  /** 🆕 מפת תמונות לפי צבע ספציפי (עדיפות) */
  colorImagesValue?: { [color: string]: ImageObject[] };
  /** 🆕 callback לעדכון תמונות צבע ספציפי */
  onColorImagesChange?: (images: { [color: string]: ImageObject[] }) => void;
  /** פונקציית העלאה (אופציונלי) */
  onUpload?: (files: File[]) => Promise<ImageObject[]>;
  /** מספר תמונות מקסימלי לכל צבע */
  maxImagesPerFamily?: number;
  /** האם הקומפוננטה מוקפאת */
  disabled?: boolean;
  /** רשימת משפחות צבע שיש להציג (רק אלו שבשימוש במוצר) */
  activeFamilies?: string[];
  /** 🆕 צבעים שנבחרו בזרימת הוריאנטים (גם לפני יצירת SKUs) */
  draftColors?: Array<{ color: string; colorHex?: string; colorFamily?: string }>;
  /** 🆕 נתוני SKUs לשליפת מידע על צבעים */
  skus?: Array<{ color?: string | null; colorHex?: string | null; colorFamily?: string | null }>;
}

/**
 * קומפוננטת ColorFamilyImages
 * מאפשרת העלאת תמונות לכל צבע ספציפי (עדיפות) או משפחת צבע (fallback)
 */
const ColorFamilyImages: React.FC<ColorFamilyImagesProps> = ({
  value = {},
  onChange,
  colorImagesValue = {},
  onColorImagesChange,
  onUpload,
  maxImagesPerFamily = 10,
  disabled = false,
  activeFamilies,
  draftColors = [],
  skus = [],
}) => {
  // State למשפחות צבע מהשרת (עם hex ייצוגי)
  const [colorFamilies, setColorFamilies] = useState<ColorFamilyWithHex[]>(FALLBACK_COLOR_FAMILIES);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  
  // State לאקורדיון פתוח
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  
  // 🆕 מצב תצוגה: 'colors' (צבעים ספציפיים) או 'families' (משפחות)
  const [viewMode, setViewMode] = useState<'colors' | 'families'>('colors');

  /**
   * טעינת משפחות צבע מהשרת
   */
  useEffect(() => {
    const loadColorFamilies = async () => {
      if (loadingFamilies) return;
      setLoadingFamilies(true);
      
      try {
        const families = await FilterAttributeService.getAllColorFamilies();
        if (families && families.length > 0) {
          // המרה מ-ColorFamily ל-ColorFamilyWithHex
          const familiesWithHex: ColorFamilyWithHex[] = families.map(f => ({
            family: f.family,
            displayName: f.displayName,
            // לוקח את ה-hex של הגרסה הראשונה כצבע ייצוגי
            representativeHex: f.variants[0]?.hex || '#888888',
          }));
          setColorFamilies(familiesWithHex);
        }
      } catch (error) {
        console.warn('Failed to load color families, using fallback:', error);
        // Keep using FALLBACK_COLOR_FAMILIES
      } finally {
        setLoadingFamilies(false);
      }
    };

    loadColorFamilies();
  }, []);

  /**
   * רשימת צבעים ספציפיים להצגה:
   * 1) SKUs (אם כבר נוצרו) - גם כציר ראשי (color) וגם כציר משני (attributes['צבע'] / subVariantName)
   * 2) draftColors מהזרימה (לפני יצירת SKUs)
   * 3) מפתחות שיש להם כבר תמונות ב-colorImagesValue
   * 
   * 🔑 שימוש ב-hex כמפתח ייחודי למניעת כפילויות
   */
  const specificColors = useMemo((): SpecificColor[] => {
    // � DEBUG: בדיקה מה מגיע לקומפוננטה
    console.log('🎨 ColorFamilyImages - Building specificColors:', {
      skusCount: skus.length,
      draftColorsCount: draftColors.length,
      colorImagesKeys: Object.keys(colorImagesValue),
      firstSku: skus[0]
    });
    
    // �🔑 שימוש ב-hex כמפתח ייחודי (למניעת כפילויות אנגלית/עברית)
    const colorMap = new Map<string, SpecificColor>();

    // 🔍 לולאה על כל ה-SKUs - חיפוש צבע גם בציר ראשי וגם בציר משני
    for (const sku of skus) {
      // מקרה 1: צבע כציר ראשי (color, colorHex, colorFamily)
      if (sku.color && sku.colorHex) {
        if (!sku.colorHex.startsWith('#')) {
          console.log('❌ SKU with invalid colorHex (case 1):', sku.colorHex, 'color:', sku.color);
          continue;
        }
        const hexKey = sku.colorHex.toLowerCase(); // 🔑 hex כמפתח
        if (!colorMap.has(hexKey)) {
          colorMap.set(hexKey, {
            color: sku.color,
            colorHex: sku.colorHex,
            colorFamily: sku.colorFamily || 'other',
          });
        }
      }
      
      // 🆕 מקרה 2: צבע כציר משני - בדיקה ב-attributes['צבע']
      const skuAttributes = (sku as any).attributes;
      if (skuAttributes && skuAttributes['צבע']) {
        const colorHex = skuAttributes['צבעHex'] || (sku as any).colorHex;
        if (colorHex) {
          if (!colorHex.startsWith('#')) {
            console.log('❌ SKU with invalid colorHex (case 2):', colorHex, 'color:', skuAttributes['צבע']);
            continue;
          }
          const hexKey = colorHex.toLowerCase(); // 🔑 hex כמפתח
          if (!colorMap.has(hexKey)) {
            colorMap.set(hexKey, {
              color: skuAttributes['צבע'],
              colorHex: colorHex,
              colorFamily: skuAttributes['צבעFamily'] || (sku as any).colorFamily || 'other',
            });
          }
        }
      }
      
      // 🆕 מקרה 3: צבע כ-subVariantName (אם יש colorHex)
      const subVariant = (sku as any).subVariantName;
      const skuColorHex = (sku as any).colorHex;
      if (subVariant && skuColorHex) {
        if (!skuColorHex.startsWith('#')) {
          console.log('❌ SKU with invalid colorHex (case 3):', skuColorHex, 'subVariant:', subVariant);
          continue;
        }
        const hexKey = skuColorHex.toLowerCase(); // 🔑 hex כמפתח
        if (!colorMap.has(hexKey)) {
          colorMap.set(hexKey, {
            color: subVariant,
            colorHex: skuColorHex,
            colorFamily: (sku as any).colorFamily || 'other',
          });
        }
      }
    }

    // הוספת צבעים מ-draftColors
    for (const draft of draftColors) {
      if (!draft?.color || !draft?.colorHex) continue;
      if (!draft.colorHex.startsWith('#')) {
        console.log('❌ Draft with invalid colorHex:', draft.colorHex, 'color:', draft.color);
        continue;
      }
      const hexKey = draft.colorHex.toLowerCase(); // 🔑 hex כמפתח
      if (!colorMap.has(hexKey)) {
        colorMap.set(hexKey, {
          color: draft.color,
          colorHex: draft.colorHex,
          colorFamily: draft.colorFamily || 'other',
        });
      }
    }

    // הוספת צבעים שכבר יש להם תמונות (רק אם לא כבר קיימים)
    // 🔧 FIX: חיפוש hex של הצבע במקום ליצור כפילות
    for (const colorName in colorImagesValue) {
      // 🔍 ניסיון למצוא את ה-hex של הצבע
      const colorHex = getColorHex(colorName);
      
      // ✅ VALIDATION: רק hex תקין - אם אין, פשוט מדלג (ללא ברירת מחדל!)
      if (!colorHex || !colorHex.startsWith('#')) {
        console.log('⚠️ Skipping color without valid hex:', colorName);
        continue;
      }
      
      const hexKey = colorHex.toLowerCase();
      
      // אם כבר קיים צבע עם אותו hex - מדלג (למנוע כפילות)
      if (colorMap.has(hexKey)) {
        continue;
      }
      
      // אם לא קיים, מוסיף עם ה-hex שמצאנו
      colorMap.set(hexKey, {
        color: colorName,
        colorHex: colorHex,
        colorFamily: 'other', // ברירת מחדל כי אין מידע על משפחה
      });
    }

    const result = Array.from(colorMap.values());
    
    // 🔍 DEBUG: בדיקת כפילויות
    console.log('🎨 specificColors count:', result.length);
    console.log('🎨 specificColors hexes:', result.map(c => c.colorHex));
    console.log('🎨 specificColors names:', result.map(c => c.color));
    
    return result;
  }, [skus, draftColors, colorImagesValue]);

  /**
   * סינון משפחות - אם יש activeFamilies, הצג רק אותן
   */
  const displayedFamilies = useMemo(() => {
    if (activeFamilies && activeFamilies.length > 0) {
      return colorFamilies.filter(f => activeFamilies.includes(f.family));
    }
    return colorFamilies;
  }, [activeFamilies, colorFamilies]);

  /**
   * מספר תמונות לצבע ספציפי
   */
  const getColorImageCount = (color: string): number => {
    return colorImagesValue[color]?.length || 0;
  };

  /**
   * מספר תמונות למשפחה
   */
  const getFamilyImageCount = (family: string): number => {
    return value[family]?.length || 0;
  };

  /**
   * 🆕 עדכון תמונות לצבע ספציפי
   */
  const handleColorImagesChange = useCallback((color: string, images: ImageObject[]) => {
    if (!onColorImagesChange) return;
    
    const newValue = { ...colorImagesValue };
    
    if (images.length === 0) {
      delete newValue[color];
    } else {
      newValue[color] = images;
    }
    
    onColorImagesChange(newValue);
  }, [colorImagesValue, onColorImagesChange]);

  /**
   * עדכון תמונות למשפחה ספציפית
   */
  const handleFamilyImagesChange = useCallback((family: string, images: ImageObject[]) => {
    const newValue = { ...value };
    
    if (images.length === 0) {
      delete newValue[family];
    } else {
      newValue[family] = images;
    }
    
    onChange(newValue);
  }, [value, onChange]);

  /**
   * Toggle אקורדיון
   */
  const toggleExpanded = (key: string) => {
    setExpandedColor(prev => prev === key ? null : key);
  };

  /**
   * 🆕 טיפול בלחיצה על צבע - אם יש תמונות, אפשרות להסיר
   */
  const handleColorClick = useCallback((colorName: string, hasImages: boolean) => {
    // אם אין תמונות - פשוט פותח/סוגר
    if (!hasImages) {
      toggleExpanded(colorName);
      return;
    }
    
    // אם יש תמונות - בודק אם הצבע פתוח
    if (expandedColor === colorName) {
      // אם פתוח - סוגר
      toggleExpanded(colorName);
    } else {
      // אם סגור - פותח
      toggleExpanded(colorName);
    }
  }, [expandedColor]);

  /**
   * 🆕 הסרת כל התמונות של צבע ספציפי
   */
  const handleRemoveColorImages = useCallback((colorName: string) => {
    if (!onColorImagesChange) return;
    
    const newValue = { ...colorImagesValue };
    delete newValue[colorName];
    onColorImagesChange(newValue);
    
    // סגירת האקורדיון לאחר מחיקה
    setExpandedColor(null);
  }, [colorImagesValue, onColorImagesChange]);

  // אם אין צבעים או משפחות פעילות להציג
  if (specificColors.length === 0 && displayedFamilies.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Icon name="Image" size={48} className={styles.emptyIcon} />
          <p>אין צבעים פעילים להצגה.</p>
          <p className={styles.emptyHint}>הוסף וריאנטים עם צבעים כדי להציג כאן תמונות לפי צבע.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Icon name="Palette" size={20} />
          תמונות לפי צבע
        </h3>
        <p className={styles.subtitle}>
          העלה תמונות לכל צבע. התמונות יופיעו בכפתורי בחירת הצבע.
        </p>
        
        {/* 🆕 טאבים לבחירת מצב תצוגה */}
        {/* 🔒 מוסתר זמנית - טאב משפחות צבע */}
        {false && (
        <div className={styles.viewModeToggle}>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'colors' ? styles.active : ''}`}
            onClick={() => setViewMode('colors')}
          >
            <Icon name="Palette" size={16} />
            צבעים ספציפיים ({specificColors.length})
          </button>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'families' ? styles.active : ''}`}
            onClick={() => setViewMode('families')}
          >
            <Icon name="Folder" size={16} />
            משפחות צבע ({displayedFamilies.length})
          </button>
        </div>
        )}
      </div>

      {/* 🆕 תצוגת צבעים ספציפיים */}
      {viewMode === 'colors' && (
        <div className={styles.familiesList}>
          {specificColors.length === 0 ? (
            <div className={styles.emptyStateInline}>
              <p>אין צבעים ספציפיים. הוסף וריאנטים עם צבעים כדי להציג כאן תמונות לפי צבע.</p>
            </div>
          ) : (
            specificColors.map((colorInfo) => {
              const imageCount = getColorImageCount(colorInfo.color);
              const hasImages = imageCount > 0;
              const isExpanded = expandedColor === colorInfo.color;
              
              return (
                <div key={colorInfo.colorHex} className={styles.familyItem}>
                  {/* כותרת הצבע - לחיצה פותחת/סוגרת */}
                  <button
                    type="button"
                    className={`${styles.familyHeader} ${isExpanded ? styles.expanded : ''} ${hasImages ? styles.hasImages : ''}`}
                    onClick={() => handleColorClick(colorInfo.color, hasImages)}
                    disabled={disabled}
                  >
                    {/* עיגול צבע */}
                    <span
                      className={styles.colorCircle}
                      style={{ backgroundColor: colorInfo.colorHex }}
                    >
                      {/* 🆕 סימון ✓ אם יש תמונות */}
                      {hasImages && (
                        <Icon 
                          name="Check" 
                          size={14} 
                          className={styles.checkIcon}
                        />
                      )}
                    </span>

                    {/* שם הצבע */}
                    <span className={styles.familyName}>{colorInfo.color}</span>

                    {/* מספר תמונות */}
                    <span className={`${styles.imageCount} ${hasImages ? styles.active : ''}`}>
                      {hasImages ? `${imageCount} תמונות` : 'לחץ להוספת תמונות'}
                    </span>

                    {/* 🆕 כפתור מחיקה מהירה (אם יש תמונות) */}
                    {hasImages && (
                      <button
                        type="button"
                        className={styles.quickDeleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`האם למחוק את ${imageCount} התמונות של ${colorInfo.color}?`)) {
                            handleRemoveColorImages(colorInfo.color);
                          }
                        }}
                        title={`מחק ${imageCount} תמונות`}
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    )}

                    {/* אייקון פתיחה/סגירה */}
                    <Icon
                      name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                      size={20}
                      className={styles.chevron}
                    />
                  </button>

                  {/* תוכן הצבע (נפתח באקורדיון) */}
                  {isExpanded && (
                    <div className={styles.familyContent}>
                      <ImageGalleryManager
                        mode="inline"
                        images={colorImagesValue[colorInfo.color] || []}
                        onChange={(images) => handleColorImagesChange(colorInfo.color, images)}
                        onUpload={onUpload}
                        maxImages={maxImagesPerFamily}
                        deleteMode="immediate"
                        allowReorder={true}
                        showPrimaryBadge={true}
                        showProgress={true}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* תצוגת משפחות צבע (fallback) */}
      {/* 🔒 מוסתר זמנית - תצוגת משפחות צבע */}
      {false && viewMode === 'families' && (
        <div className={styles.familiesList}>
          {displayedFamilies.map((family) => {
            const imageCount = getFamilyImageCount(family.family);
            const familyKey = `family-${family.family}`;
            const isExpanded = expandedColor === familyKey;

            return (
              <div key={family.family} className={styles.familyItem}>
                <button
                  type="button"
                  className={`${styles.familyHeader} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => toggleExpanded(familyKey)}
                  disabled={disabled}
                >
                  <span
                    className={styles.colorCircle}
                    style={{ backgroundColor: family.representativeHex }}
                  />

                  <span className={styles.familyName}>{family.displayName}</span>

                  <span className={styles.fallbackBadge}>fallback</span>

                  <span className={styles.imageCount}>
                    {imageCount > 0 ? `${imageCount} תמונות` : 'אין תמונות'}
                  </span>

                  <Icon
                    name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                    size={20}
                    className={styles.chevron}
                  />
                </button>

                {isExpanded && (
                  <div className={styles.familyContent}>
                    <p className={styles.fallbackNote}>
                      תמונות אלו ישמשו כ־fallback אם אין תמונות לצבע ספציפי.
                    </p>
                    <ImageGalleryManager
                      mode="inline"
                      images={value[family.family] || []}
                      onChange={(images) => handleFamilyImagesChange(family.family, images)}
                      onUpload={onUpload}
                      maxImages={maxImagesPerFamily}
                      deleteMode="immediate"
                      allowReorder={true}
                      showPrimaryBadge={true}
                      showProgress={true}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ColorFamilyImages;

