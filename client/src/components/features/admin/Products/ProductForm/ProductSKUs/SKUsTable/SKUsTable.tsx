/**
 * SKUsTable Component
 * מטרת הקומפוננטה: טבלה אמיתית לניהול וריאנטים עם:
 * - צ'קבוקס לכל שורה
 * - עריכה ישירה בתאים
 * - בחירה מרובה ופעולות באלק
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { SKUFormData } from '@/schemas/productFormSchema';
import styles from './SKUsTable.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface SKUsTableProps {
  /** רשימת הווריאנטים */
  skus: SKUFormData[];
  /** פונקציה לשינוי רשימת הווריאנטים */
  onChange: (skus: SKUFormData[]) => void;
  /** מחיר בסיס של המוצר (להצגת ירושה) */
  basePrice: number;
  /** פונקציה להעלאת תמונות */
  onUploadImages?: (files: File[], sku: string) => Promise<any[]>;
  /** האם הטופס במצב loading */
  disabled?: boolean;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const SKUsTable: React.FC<SKUsTableProps> = ({
  skus,
  onChange,
  basePrice,
  onUploadImages: _onUploadImages, // Reserved for future use
  disabled = false,
}) => {
  // מזהים שנבחרו
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // תא בעריכה (אינדקס שורה + שם עמודה)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  
  // ערך זמני בעריכה
  const [editValue, setEditValue] = useState<string>('');
  
  // Ref לשדה הקלט
  const inputRef = useRef<HTMLInputElement>(null);

  // ===== פוקוס אוטומטי בעריכה =====
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // ===== בחירת כל השורות =====
  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === skus.length) {
      // בטל הכל
      setSelectedIndices(new Set());
    } else {
      // בחר הכל
      setSelectedIndices(new Set(skus.map((_, i) => i)));
    }
  }, [skus.length, selectedIndices.size]);

  // ===== בחירת שורה בודדת =====
  const handleSelectRow = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // ===== התחלת עריכת תא =====
  const handleStartEdit = useCallback((row: number, col: string, currentValue: string) => {
    if (disabled) return;
    setEditingCell({ row, col });
    setEditValue(currentValue);
  }, [disabled]);

  // ===== שמירת עריכה =====
  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const updatedSkus = [...skus];
    const sku = { ...updatedSkus[row] };
    
    // עדכון השדה המתאים
    switch (col) {
      case 'sku':
        sku.sku = editValue;
        break;
      case 'stockQuantity':
        sku.stockQuantity = parseInt(editValue) || 0;
        break;
      case 'price':
        // אם ריק או 0 - יורש מחיר בסיס
        const priceNum = parseFloat(editValue);
        sku.price = priceNum > 0 ? priceNum : null;
        break;
      case 'name':
        sku.name = editValue;
        break;
    }
    
    updatedSkus[row] = sku;
    onChange(updatedSkus);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, skus, onChange]);

  // ===== ביטול עריכה =====
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // ===== טיפול בלחיצת Enter/Escape =====
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // ===== מחיקת שורות נבחרות =====
  const handleDeleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    
    const updatedSkus = skus.filter((_, index) => !selectedIndices.has(index));
    onChange(updatedSkus);
    setSelectedIndices(new Set());
  }, [skus, selectedIndices, onChange]);

  // ===== עדכון סטטוס שורות נבחרות =====
  const handleToggleStatusSelected = useCallback((isActive: boolean) => {
    if (selectedIndices.size === 0) return;
    
    const updatedSkus = skus.map((sku, index) => {
      if (selectedIndices.has(index)) {
        return { ...sku, isActive };
      }
      return sku;
    });
    onChange(updatedSkus);
  }, [skus, selectedIndices, onChange]);

  // ===== עדכון מלאי לשורות נבחרות =====
  const [bulkStockValue, setBulkStockValue] = useState<string>('');
  const [showBulkStockInput, setShowBulkStockInput] = useState(false);

  const handleBulkUpdateStock = useCallback(() => {
    if (selectedIndices.size === 0) return;
    
    const stockNum = parseInt(bulkStockValue) || 0;
    const updatedSkus = skus.map((sku, index) => {
      if (selectedIndices.has(index)) {
        return { ...sku, stockQuantity: stockNum };
      }
      return sku;
    });
    onChange(updatedSkus);
    setShowBulkStockInput(false);
    setBulkStockValue('');
  }, [skus, selectedIndices, bulkStockValue, onChange]);

  // ===== Toggle סטטוס בודד =====
  const handleToggleStatus = useCallback((index: number) => {
    const updatedSkus = [...skus];
    updatedSkus[index] = { ...updatedSkus[index], isActive: !updatedSkus[index].isActive };
    onChange(updatedSkus);
  }, [skus, onChange]);

  // ===== מחיקת שורה בודדת =====
  const handleDeleteRow = useCallback((index: number) => {
    const updatedSkus = skus.filter((_, i) => i !== index);
    onChange(updatedSkus);
    // הסר מהנבחרים
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, [skus, onChange]);

  // ===== חישוב מחיר סופי =====
  const getFinalPrice = useCallback((sku: SKUFormData): number => {
    return sku.price ?? basePrice;
  }, [basePrice]);

  // ===== האם כל השורות נבחרו =====
  const isAllSelected = useMemo(() => {
    return skus.length > 0 && selectedIndices.size === skus.length;
  }, [skus.length, selectedIndices.size]);

  // ===== האם יש בחירה חלקית =====
  const isPartiallySelected = useMemo(() => {
    return selectedIndices.size > 0 && selectedIndices.size < skus.length;
  }, [skus.length, selectedIndices.size]);

  // אם אין וריאנטים - הצג הודעה
  if (skus.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon name="Package" size={48} />
        <p>אין גירסאות עדיין</p>
        <span>השתמש בכפתור "הוסף גירסאות" למעלה</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* פס פעולות באלק */}
      {selectedIndices.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.bulkCount}>
            ✓ {selectedIndices.size} גירסאות נבחרו
          </span>
          
          <div className={styles.bulkButtons}>
            {/* עדכון מלאי */}
            {showBulkStockInput ? (
              <div className={styles.bulkInput}>
                <input
                  type="number"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(e.target.value)}
                  placeholder="מלאי חדש"
                  min="0"
                />
                <button onClick={handleBulkUpdateStock}>
                  <Icon name="Check" size={16} />
                </button>
                <button onClick={() => setShowBulkStockInput(false)}>
                  <Icon name="X" size={16} />
                </button>
              </div>
            ) : (
              <button 
                className={styles.bulkButton}
                onClick={() => setShowBulkStockInput(true)}
              >
                <Icon name="Package" size={16} />
                <span>עדכן מלאי</span>
              </button>
            )}
            
            {/* הפעל הכל */}
            <button 
              className={styles.bulkButton}
              onClick={() => handleToggleStatusSelected(true)}
            >
              <Icon name="Eye" size={16} />
              <span>הפעל</span>
            </button>
            
            {/* השבת הכל */}
            <button 
              className={styles.bulkButton}
              onClick={() => handleToggleStatusSelected(false)}
            >
              <Icon name="EyeOff" size={16} />
              <span>השבת</span>
            </button>
            
            {/* מחק נבחרים */}
            <button 
              className={`${styles.bulkButton} ${styles.bulkButtonDanger}`}
              onClick={handleDeleteSelected}
            >
              <Icon name="Trash2" size={16} />
              <span>מחק</span>
            </button>
          </div>
        </div>
      )}

      {/* טבלה */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    disabled={disabled}
                  />
                  <span className={styles.checkmark} />
                </label>
              </th>
              <th>תמונה</th>
              <th>וריאנט</th>
              <th>SKU</th>
              <th>מחיר</th>
              <th>מלאי</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku, index) => (
              <tr 
                key={`${sku.sku}-${index}`}
                className={`
                  ${selectedIndices.has(index) ? styles.selected : ''}
                  ${!sku.isActive ? styles.inactive : ''}
                `}
              >
                {/* צ'קבוקס */}
                <td className={styles.checkboxCell}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(index)}
                      onChange={() => handleSelectRow(index)}
                      disabled={disabled}
                    />
                    <span className={styles.checkmark} />
                  </label>
                </td>

                {/* תמונה */}
                <td className={styles.imageCell}>
                  {sku.images && sku.images.length > 0 ? (
                    <img 
                      src={typeof sku.images[0] === 'string' ? sku.images[0] : (sku.images[0] as any)?.thumbnail || (sku.images[0] as any)?.url}
                      alt={sku.name}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <div className={styles.noImage}>
                      <Icon name="Image" size={20} />
                    </div>
                  )}
                </td>

                {/* וריאנט (צבע + מידה) */}
                <td className={styles.variantCell}>
                  <div className={styles.variantInfo}>
                    {sku.colorHex && (
                      <span 
                        className={styles.colorDot}
                        style={{ backgroundColor: sku.colorHex }}
                      />
                    )}
                    <span>{sku.name || sku.color || 'ללא שם'}</span>
                  </div>
                </td>

                {/* SKU - עריכה בלחיצה */}
                <td 
                  className={styles.editableCell}
                  onClick={() => handleStartEdit(index, 'sku', sku.sku)}
                >
                  {editingCell?.row === index && editingCell?.col === 'sku' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className={styles.cellInput}
                    />
                  ) : (
                    <span className={styles.cellValue}>{sku.sku}</span>
                  )}
                </td>

                {/* מחיר - עריכה בלחיצה */}
                <td 
                  className={styles.editableCell}
                  onClick={() => handleStartEdit(index, 'price', sku.price?.toString() || '')}
                >
                  {editingCell?.row === index && editingCell?.col === 'price' ? (
                    <input
                      ref={inputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className={styles.cellInput}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className={styles.cellValue}>
                      ₪{getFinalPrice(sku).toFixed(2)}
                      {sku.price === null && (
                        <span className={styles.inheritedBadge}>בסיס</span>
                      )}
                    </span>
                  )}
                </td>

                {/* מלאי - עריכה בלחיצה */}
                <td 
                  className={styles.editableCell}
                  onClick={() => handleStartEdit(index, 'stockQuantity', sku.stockQuantity.toString())}
                >
                  {editingCell?.row === index && editingCell?.col === 'stockQuantity' ? (
                    <input
                      ref={inputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className={styles.cellInput}
                      min="0"
                    />
                  ) : (
                    <span className={`${styles.cellValue} ${sku.stockQuantity === 0 ? styles.outOfStock : ''}`}>
                      {sku.stockQuantity}
                    </span>
                  )}
                </td>

                {/* סטטוס */}
                <td className={styles.statusCell}>
                  <button
                    type="button"
                    className={`${styles.statusToggle} ${sku.isActive ? styles.active : styles.inactive}`}
                    onClick={() => handleToggleStatus(index)}
                    disabled={disabled}
                  >
                    {sku.isActive ? 'פעיל' : 'מושבת'}
                  </button>
                </td>

                {/* פעולות */}
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteRow(index)}
                    disabled={disabled}
                    title="מחק וריאנט"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* מונה */}
      <div className={styles.footer}>
        <span>מציג {skus.length} וריאנטים</span>
      </div>
    </div>
  );
};

export default SKUsTable;
