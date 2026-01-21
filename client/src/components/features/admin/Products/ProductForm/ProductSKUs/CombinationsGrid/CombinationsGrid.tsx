/**
 * CombinationsGrid Component
 * קומפוננטה לבחירת שילובי וריאנטים בטבלה דו-ממדית
 * 
 * שימושים:
 * - בחירת אילו שילובים של צבע+מידה קיימים במלאי
 * - מתאים ל-2 צירים: מציג טבלה דו-ממדית
 * - מתאים ל-3+ צירים: מציג רשימת checkboxes
 * 
 * לדוגמה: חולצה עם 3 צבעים × 4 מידות = 12 שילובים אפשריים
 * המנהל בוחר רק את השילובים שבאמת קיימים
 */

import React, { useCallback, useMemo } from 'react';
import { Icon } from '../../../../../../ui/Icon';
import styles from './CombinationsGrid.module.css';

/**
 * ערך בציר (צבע או מידה)
 */
export interface AxisValue {
  value: string;           // ערך הזיהוי
  displayName: string;     // שם תצוגה
  hex?: string;            // קוד HEX לצבעים
}

/**
 * שילוב נבחר
 */
export interface Combination {
  primary: string;         // ערך ציר ראשי (צבע)
  secondary: string;       // ערך ציר משני (מידה)
}

/**
 * Props של הקומפוננטה
 */
export interface CombinationsGridProps {
  /** ערכי ציר ראשי (צבעים) */
  primaryValues: AxisValue[];
  
  /** ערכי ציר משני (מידות) - אופציונלי! */
  secondaryValues?: AxisValue[];
  
  /** תווית ציר ראשי */
  primaryLabel: string;
  
  /** תווית ציר משני */
  secondaryLabel?: string;
  
  /** שילובים נבחרים */
  selectedCombinations: Combination[];
  
  /** callback לשינוי שילובים */
  onChange: (combinations: Combination[]) => void;
  
  /** האם disabled */
  disabled?: boolean;
  
  /** האם להציג צבעים בכותרות */
  showColors?: boolean;
}

/**
 * קומפוננטת CombinationsGrid
 * טבלה דו-ממדית לבחירת שילובים
 */
const CombinationsGrid: React.FC<CombinationsGridProps> = ({
  primaryValues,
  secondaryValues = [],
  primaryLabel,
  secondaryLabel = '',
  selectedCombinations,
  onChange,
  disabled = false,
  showColors = true,
}) => {

  // זיהוי מצב 1D (רק מאפיין אחד)
  const is1DMode = secondaryValues.length === 0;

  /**
   * בדיקה האם שילוב נבחר
   */
  const isCombinationSelected = useCallback((primary: string, secondary: string): boolean => {
    return selectedCombinations.some(
      c => c.primary === primary && c.secondary === secondary
    );
  }, [selectedCombinations]);

  /**
   * בדיקה האם ערך נבחר במצב 1D
   */
  const is1DValueSelected = useCallback((primary: string): boolean => {
    return selectedCombinations.some(c => c.primary === primary && c.secondary === '');
  }, [selectedCombinations]);

  /**
   * החלפת מצב שילוב (toggle)
   */
  const toggleCombination = useCallback((primary: string, secondary: string) => {
    if (disabled) return;
    
    const isSelected = isCombinationSelected(primary, secondary);
    
    if (isSelected) {
      // הסר את השילוב
      onChange(selectedCombinations.filter(
        c => !(c.primary === primary && c.secondary === secondary)
      ));
    } else {
      // הוסף את השילוב
      onChange([...selectedCombinations, { primary, secondary }]);
    }
  }, [selectedCombinations, onChange, isCombinationSelected, disabled]);

  /**
   * Toggle ערך במצב 1D
   */
  const toggle1DValue = useCallback((primary: string) => {
    if (disabled) return;
    
    const isSelected = is1DValueSelected(primary);
    
    if (isSelected) {
      onChange(selectedCombinations.filter(c => c.primary !== primary));
    } else {
      onChange([...selectedCombinations, { primary, secondary: '' }]);
    }
  }, [selectedCombinations, onChange, is1DValueSelected, disabled]);

  /**
   * בחירת כל השילובים
   */
  const handleSelectAll = useCallback(() => {
    if (disabled) return;
    
    const allCombinations: Combination[] = [];
    
    if (is1DMode) {
      // מצב 1D - רק ערכי ציר ראשי
      primaryValues.forEach(pv => {
        allCombinations.push({ primary: pv.value, secondary: '' });
      });
    } else {
      // מצב 2D - שילובים של שני הצירים
      primaryValues.forEach(pv => {
        secondaryValues.forEach(sv => {
          allCombinations.push({ primary: pv.value, secondary: sv.value });
        });
      });
    }
    
    onChange(allCombinations);
  }, [primaryValues, secondaryValues, onChange, disabled, is1DMode]);

  /**
   * ביטול כל הבחירות
   */
  const handleClearAll = useCallback(() => {
    if (disabled) return;
    onChange([]);
  }, [onChange, disabled]);

  /**
   * בחירת כל השורה (ציר ראשי מסוים)
   */
  const handleSelectRow = useCallback((primaryValue: string) => {
    if (disabled) return;
    
    // בדיקה האם כל השורה נבחרת
    const isRowFullySelected = secondaryValues.every(sv => 
      isCombinationSelected(primaryValue, sv.value)
    );
    
    if (isRowFullySelected) {
      // הסר את כל השורה
      onChange(selectedCombinations.filter(c => c.primary !== primaryValue));
    } else {
      // הוסף את כל השורה
      const existingOthers = selectedCombinations.filter(c => c.primary !== primaryValue);
      const rowCombinations = secondaryValues.map(sv => ({
        primary: primaryValue,
        secondary: sv.value,
      }));
      onChange([...existingOthers, ...rowCombinations]);
    }
  }, [secondaryValues, selectedCombinations, onChange, isCombinationSelected, disabled]);

  /**
   * בחירת כל העמודה (ציר משני מסוים)
   */
  const handleSelectColumn = useCallback((secondaryValue: string) => {
    if (disabled) return;
    
    // בדיקה האם כל העמודה נבחרת
    const isColumnFullySelected = primaryValues.every(pv => 
      isCombinationSelected(pv.value, secondaryValue)
    );
    
    if (isColumnFullySelected) {
      // הסר את כל העמודה
      onChange(selectedCombinations.filter(c => c.secondary !== secondaryValue));
    } else {
      // הוסף את כל העמודה
      const existingOthers = selectedCombinations.filter(c => c.secondary !== secondaryValue);
      const columnCombinations = primaryValues.map(pv => ({
        primary: pv.value,
        secondary: secondaryValue,
      }));
      onChange([...existingOthers, ...columnCombinations]);
    }
  }, [primaryValues, selectedCombinations, onChange, isCombinationSelected, disabled]);

  /**
   * חישוב סטטיסטיקות
   */
  const stats = useMemo(() => {
    const total = is1DMode 
      ? primaryValues.length 
      : primaryValues.length * secondaryValues.length;
    const selected = selectedCombinations.length;
    const percentage = total > 0 ? Math.round((selected / total) * 100) : 0;
    
    return { total, selected, percentage };
  }, [primaryValues.length, secondaryValues.length, selectedCombinations.length, is1DMode]);

  /**
   * בדיקה האם שורה מלאה
   */
  const isRowFullySelected = useCallback((primaryValue: string): boolean => {
    return secondaryValues.every(sv => isCombinationSelected(primaryValue, sv.value));
  }, [secondaryValues, isCombinationSelected]);

  /**
   * בדיקה האם עמודה מלאה
   */
  const isColumnFullySelected = useCallback((secondaryValue: string): boolean => {
    return primaryValues.every(pv => isCombinationSelected(pv.value, secondaryValue));
  }, [primaryValues, isCombinationSelected]);

  /**
   * בדיקה האם שורה חלקית (יש בה לפחות אחד אבל לא כולם)
   */
  const isRowPartiallySelected = useCallback((primaryValue: string): boolean => {
    const selectedInRow = secondaryValues.filter(sv => 
      isCombinationSelected(primaryValue, sv.value)
    ).length;
    return selectedInRow > 0 && selectedInRow < secondaryValues.length;
  }, [secondaryValues, isCombinationSelected]);

  /**
   * בדיקה האם עמודה חלקית
   */
  const isColumnPartiallySelected = useCallback((secondaryValue: string): boolean => {
    const selectedInColumn = primaryValues.filter(pv => 
      isCombinationSelected(pv.value, secondaryValue)
    ).length;
    return selectedInColumn > 0 && selectedInColumn < primaryValues.length;
  }, [primaryValues, isCombinationSelected]);

  // אם אין ערכים בציר הראשי - הצג הודעה
  if (primaryValues.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Icon name="AlertCircle" />
          <span>יש לבחור ערכים למאפיין תחילה</span>
        </div>
      </div>
    );
  }

  // =================== מצב 1D - רשימה של ערכים ===================
  if (is1DMode) {
    return (
      <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
        {/* כותרת וסטטיסטיקות */}
        <div className={styles.header}>
          <h4 className={styles.title}>
            <Icon name="List" />
            <span>בחר וריאנטים זמינים</span>
          </h4>
          
          <div className={styles.stats}>
            <span className={styles.statsText}>
              {stats.selected} / {stats.total} נבחרו ({stats.percentage}%)
            </span>
          </div>
        </div>

        {/* הסבר */}
        <div className={styles.helpText}>
          <Icon name="Info" />
          <span>
            לחץ על ערך כדי לסמן/לבטל אותו כוריאנט זמין.
          </span>
        </div>

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSelectAll}
            disabled={disabled}
          >
            <Icon name="CheckCircle" />
            <span>בחר הכל</span>
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleClearAll}
            disabled={disabled || selectedCombinations.length === 0}
          >
            <Icon name="XCircle" />
            <span>בטל הכל</span>
          </button>
        </div>

        {/* רשימת ערכים 1D */}
        <div className={styles.valuesList1D}>
          {primaryValues.map(pv => {
            const isSelected = is1DValueSelected(pv.value);
            
            return (
              <button
                key={pv.value}
                type="button"
                className={`${styles.valueItem1D} ${isSelected ? styles.selected : ''}`}
                onClick={() => toggle1DValue(pv.value)}
                disabled={disabled}
              >
                {/* נקודת צבע */}
                {showColors && pv.hex && (
                  <span 
                    className={styles.colorDot}
                    style={{ backgroundColor: pv.hex }}
                  />
                )}
                
                {/* אייקון מצב */}
                <span className={styles.valueCheckbox}>
                  {isSelected ? (
                    <Icon name="CheckCircle" />
                  ) : (
                    <span className={styles.emptyCheckbox} />
                  )}
                </span>
                
                <span className={styles.valueName}>{pv.displayName}</span>
              </button>
            );
          })}
        </div>

        {/* סיכום */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{primaryLabel}:</span>
            <span className={styles.summaryValue}>
              {primaryValues.filter(pv => is1DValueSelected(pv.value)).map(pv => pv.displayName).join(', ') || 'לא נבחרו'}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>וריאנטים נבחרו:</span>
            <span className={styles.summaryValue}>
              <strong>{stats.selected}</strong> מתוך {stats.total}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =================== מצב 2D - טבלה דו-ממדית ===================

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* כותרת וסטטיסטיקות */}
      <div className={styles.header}>
        <h4 className={styles.title}>
          <Icon name="Grid3x3" />
          <span>בחר שילובים זמינים</span>
        </h4>
        
        <div className={styles.stats}>
          <span className={styles.statsText}>
            {stats.selected} / {stats.total} שילובים נבחרו ({stats.percentage}%)
          </span>
        </div>
      </div>

      {/* הסבר */}
      <div className={styles.helpText}>
        <Icon name="Info" />
        <span>
          לחץ על תא כדי לסמן/לבטל שילוב. 
          לחץ על כותרת שורה/עמודה לבחירת כולה.
        </span>
      </div>

      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleSelectAll}
          disabled={disabled}
        >
          <Icon name="CheckCircle" />
          <span>בחר הכל</span>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleClearAll}
          disabled={disabled || selectedCombinations.length === 0}
        >
          <Icon name="XCircle" />
          <span>בטל הכל</span>
        </button>
      </div>

      {/* הטבלה */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* תא פינתי */}
              <th className={styles.cornerCell}>
                <span className={styles.axisLabel}>{secondaryLabel}</span>
                <span className={styles.axisLabel}>{primaryLabel}</span>
              </th>
              
              {/* כותרות עמודות (ציר משני) */}
              {secondaryValues.map(sv => {
                const isFullySelected = isColumnFullySelected(sv.value);
                const isPartiallySelected = isColumnPartiallySelected(sv.value);
                
                return (
                  <th 
                    key={sv.value} 
                    className={`${styles.columnHeader} ${isFullySelected ? styles.fullySelected : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.headerButton}
                      onClick={() => handleSelectColumn(sv.value)}
                      disabled={disabled}
                      title={`${isFullySelected ? 'בטל' : 'בחר'} עמודה ${sv.displayName}`}
                    >
                      {/* אייקון מצב */}
                      <span className={styles.headerCheckbox}>
                        {isFullySelected ? (
                          <Icon name="CheckCircle" />
                        ) : isPartiallySelected ? (
                          <Icon name="Minus" />
                        ) : (
                          <span className={styles.emptyCheckbox} />
                        )}
                      </span>
                      <span>{sv.displayName}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody>
            {primaryValues.map(pv => {
              const isRowFull = isRowFullySelected(pv.value);
              const isRowPartial = isRowPartiallySelected(pv.value);
              
              return (
                <tr key={pv.value}>
                  {/* כותרת שורה (ציר ראשי) */}
                  <th 
                    className={`${styles.rowHeader} ${isRowFull ? styles.fullySelected : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.headerButton}
                      onClick={() => handleSelectRow(pv.value)}
                      disabled={disabled}
                      title={`${isRowFull ? 'בטל' : 'בחר'} שורה ${pv.displayName}`}
                    >
                      {/* נקודת צבע */}
                      {showColors && pv.hex && (
                        <span 
                          className={styles.colorDot}
                          style={{ backgroundColor: pv.hex }}
                        />
                      )}
                      
                      {/* אייקון מצב */}
                      <span className={styles.headerCheckbox}>
                        {isRowFull ? (
                          <Icon name="CheckCircle" />
                        ) : isRowPartial ? (
                          <Icon name="Minus" />
                        ) : (
                          <span className={styles.emptyCheckbox} />
                        )}
                      </span>
                      
                      <span>{pv.displayName}</span>
                    </button>
                  </th>
                  
                  {/* תאי שילובים */}
                  {secondaryValues.map(sv => {
                    const isSelected = isCombinationSelected(pv.value, sv.value);
                    
                    return (
                      <td 
                        key={`${pv.value}-${sv.value}`}
                        className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
                      >
                        <button
                          type="button"
                          className={styles.cellButton}
                          onClick={() => toggleCombination(pv.value, sv.value)}
                          disabled={disabled}
                          aria-label={`${pv.displayName} + ${sv.displayName}: ${isSelected ? 'נבחר' : 'לא נבחר'}`}
                        >
                          {isSelected ? (
                            <Icon name="Check" className={styles.checkIcon} />
                          ) : (
                            <span className={styles.emptyCell} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* סיכום */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{primaryLabel}:</span>
          <span className={styles.summaryValue}>
            {primaryValues.map(pv => pv.displayName).join(', ')}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{secondaryLabel}:</span>
          <span className={styles.summaryValue}>
            {secondaryValues.map(sv => sv.displayName).join(', ')}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>שילובים נבחרו:</span>
          <span className={styles.summaryValue}>
            <strong>{stats.selected}</strong> מתוך {stats.total}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CombinationsGrid;
