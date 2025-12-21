import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import styles from './ColorSelect.module.css';
import { Button } from '../Button';
import { AVAILABLE_COLORS } from '@/utils/colorConstants';
import { getColorName } from '@/utils/colorConstants';

/**
 * הגדרת הטיפוסים - מה ה-ColorSelect יכול לקבל כ-props
 */
export interface ColorSelectProps {
  value?: string;                                         // הערך הנוכחי (HEX) - אופציונלי
  onChange?: (color: string) => void;                     // פונקציה שרצה בשינוי - אופציונלי
  disabled?: boolean;                                     // האם השדה מושבת - אופציונלי
  required?: boolean;                                     // האם השדה חובה - אופציונלי
  label?: string;                                         // תווית לשדה - אופציונלי
  placeholder?: string;                                   // טקסט עזר - אופציונלי
  error?: boolean;                                        // האם יש שגיאה - אופציונלי
  helperText?: string;                                    // טקסט עזר נוסף - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
  id?: string;                                           // מזהה לשדה - אופציונלי
  name?: string;                                         // שם השדה - אופציונלי
  presets?: Array<{ hex: string; name: string }>;        // צבעים מותאמים אישית (אם לא מועבר - משתמש ב-AVAILABLE_COLORS)
  showCustomPicker?: boolean;                            // האם להציג אופציה לבחירה חופשית עם HexColorPicker
  showConfirmButtons?: boolean;                          // האם להציג כפתורי אישור/ביטול ב-picker (ברירת מחדל: true)
  allowCustomHex?: boolean;                              // האם לאפשר הקלדת hex ידנית (ברירת מחדל: false)
  ariaLabel?: string;                                    // תווית נגישות
}

/**
 * קומפוננטת ColorSelect - רשימה נפתחת מותאמת אישית לבחירת צבע
 * כולל קו צבעוני בצד ימין של כל אופציה + אופציה לבוחר צבעים מתקדם (HexColorPicker)
 */
const ColorSelect: React.FC<ColorSelectProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  label,
  placeholder = 'בחר צבע',
  error = false,
  helperText,
  className = '',
  id,
  name,
  presets,
  showCustomPicker = false,
  showConfirmButtons = true,
  allowCustomHex = false,
  ariaLabel
}) => {
  // סטייט לניהול מצב הפתיחה של הרשימה
  const [isOpen, setIsOpen] = useState(false);
  // סטייט לניהול מצב פתיחת ה-picker המתקדם
  const [showPicker, setShowPicker] = useState(false);
  // סטייט זמני לצבע שנבחר ב-picker (לפני אישור)
  const [tempColor, setTempColor] = useState<string>(value || '#ffffff');
  // רפרנס לאלמנט הראשי (לזיהוי קליקים מחוץ לקומפוננטה)
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // קביעת רשימת הצבעים (presets מותאמים או ברירת מחדל)
  const colorList = presets || AVAILABLE_COLORS;

  /**
   * מציאת הצבע הנבחר מהרשימה, או יצירת אובייקט זמני אם זה צבע מותאם אישית
   */
  const selectedColor = colorList.find(c => c.hex === value) || 
    (value ? { hex: value, name: getColorName(value) } : null);
  
  /**
   * עדכון הצבע הזמני כשה-value החיצוני משתנה
   */
  useEffect(() => {
    if (value) {
      setTempColor(value);
    }
  }, [value]);

  /**
   * טיפול בבחירת צבע מהרשימה
   */
  const handleSelect = (hex: string) => {
    if (onChange) {
      onChange(hex);
    }
    setIsOpen(false);
  };
  
  /**
   * פתיחת ה-picker המתקדם
   */
  const handleOpenPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setShowPicker(true);
    setTempColor(value || '#ffffff');
  };
  
  /**
   * אישור הצבע שנבחר ב-picker
   */
  const handleConfirmPicker = () => {
    if (onChange) {
      onChange(tempColor);
    }
    setShowPicker(false);
  };
  
  /**
   * ביטול וסגירת ה-picker
   */
  const handleCancelPicker = () => {
    setShowPicker(false);
    setTempColor(value || '#ffffff');
  };

  /**
   * טיפול בלחיצה על הכפתור הראשי (פתיחה/סגירה)
   */
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  /**
   * טיפול בלחיצה על מקש (נגישות - Enter, Escape, Arrow Up/Down)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  /**
   * סגירת הרשימה בלחיצה מחוץ לקומפוננטה
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node) && showPicker) {
        // אם showConfirmButtons=false, סוגרים ישירות
        if (!showConfirmButtons) {
          setShowPicker(false);
        }
      }
    };

    if (isOpen || showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showPicker, showConfirmButtons]);

  return (
    <div className={`${styles.colorSelectContainer} ${className}`} ref={containerRef}>
      {/* תווית השדה - אם קיימת */}
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      {/* כפתור הבחירה הראשי */}
      <div
        className={`${styles.selectButton} ${isOpen ? styles.open : ''} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id}
      >
        {/* הצגת הצבע הנבחר או placeholder */}
        <span className={styles.selectedValue}>
          {selectedColor ? (
            <>
              <span className={styles.colorIndicator} style={{ backgroundColor: selectedColor.hex }} />
              {selectedColor.name}
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        
        {/* אייקון חץ */}
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>▼</span>
      </div>

      {/* רשימת האופציות (נפתחת) */}
      {isOpen && (
        <ul className={styles.optionsList} role="listbox">
          {colorList.map((color) => (
            <li
              key={color.hex}
              className={`${styles.option} ${value === color.hex ? styles.selected : ''}`}
              onClick={() => handleSelect(color.hex)}
              role="option"
              aria-selected={value === color.hex}
            >
              <span className={styles.optionText}>{color.name}</span>
              {/* קו צבעוני בצד ימין */}
              <span
                className={styles.colorBar}
                style={{ backgroundColor: color.hex }}
              />
            </li>
          ))}
          
          {/* אופציה לפתיחת ה-picker המתקדם */}
          {showCustomPicker && (
            <li
              className={`${styles.option} ${styles.customOption}`}
              onClick={handleOpenPicker}
              role="option"
            >
              <span className={styles.optionText}>🎨 בחירה חופשית...</span>
            </li>
          )}
        </ul>
      )}
      
      {/* פופאפ של HexColorPicker */}
      {showPicker && (
        <div className={styles.pickerOverlay} role="dialog" aria-label={ariaLabel || "בוחר צבעים מתקדם"}>
          <div 
            className={styles.pickerPopup} 
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.pickerHeader}>
              <h3>בחירת צבע</h3>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={styles.pickerCloseBtn}
                onClick={handleCancelPicker}
                aria-label="סגור"
              >
                ✕
              </Button>
            </div>
            
            <div className={styles.pickerBody}>
              {/* תצוגת הצבע הנוכחי */}
              <div className={styles.currentColorDisplay}>
                <div 
                  className={styles.colorPreview}
                  style={{ backgroundColor: tempColor }}
                  aria-label={`צבע נבחר: ${getColorName(tempColor)}`}
                />
                <div className={styles.colorInfo}>
                  <span className={styles.colorHex}>{tempColor}</span>
                  <span className={styles.colorNameLabel}>{getColorName(tempColor)}</span>
                </div>
              </div>
              
              {/* הבוחר עצמו */}
              <HexColorPicker 
                color={tempColor} 
                onChange={(newColor) => {
                  setTempColor(newColor);
                  // אם אין כפתורי אישור, עדכן מיידית
                  if (!showConfirmButtons && onChange) {
                    onChange(newColor);
                  }
                }}
              />
              
              {/* שדה הקלדה ידנית (אם מופעל) */}
              {allowCustomHex && (
                <div className={styles.hexInputGroup}>
                  <label htmlFor="hex-input">קוד HEX:</label>
                  <input
                    id="hex-input"
                    type="text"
                    className={styles.hexInput}
                    value={tempColor}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                        setTempColor(newValue);
                      }
                    }}
                    placeholder="#ffffff"
                    maxLength={7}
                  />
                </div>
              )}
            </div>
            
            {/* כפתורי פעולה (אם מופעלים) */}
            {showConfirmButtons && (
              <div className={styles.pickerActions}>
                <Button
                  type="button"
                  variant="ghost"
                  className={`${styles.pickerBtn} ${styles.pickerBtnCancel}`}
                  onClick={handleCancelPicker}
                >
                  ביטול
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className={`${styles.pickerBtn} ${styles.pickerBtnConfirm}`}
                  onClick={handleConfirmPicker}
                >
                  אישור
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* טקסט עזר או הודעת שגיאה */}
      {helperText && (
        <div className={`${styles.helperText} ${error ? styles.errorText : ''}`}>
          {helperText}
        </div>
      )}

      {/* שדה hidden לטפסים (אם יש name) */}
      {name && <input type="hidden" name={name} value={value || ''} />}
    </div>
  );
};

export { ColorSelect };
