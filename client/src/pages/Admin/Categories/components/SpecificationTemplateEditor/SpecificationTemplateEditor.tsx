/**
 * SpecificationTemplateEditor - עורך תבנית מפרט טכני לקטגוריה
 * 
 * גרסה פשוטה:
 * - הוספת שדות עם שם בלבד (בלי type/unit/required)
 * - inline input + כפתור הוסף (בלי מודאל פנימי)
 * - צפייה בשדות שנורשו מקטגוריות אב
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, Icon } from '../../../../../components/ui';
import Modal from '../../../../../components/ui/Modal';
import { 
  getSpecificationTemplate, 
  updateSpecificationTemplate,
  type InheritedSpecificationField,
} from '../../../../../services/categoryService';
import type { ISpecificationField } from '../../../../../types/Category';
import styles from './SpecificationTemplateEditor.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface SpecificationTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string | null;
  categoryName: string;
  onSaved?: () => void;
}

// שדה פשוט - רק key (שמשמש גם כ-label)
interface SimpleField {
  _tempId: string;
  key: string;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

export const SpecificationTemplateEditor: React.FC<SpecificationTemplateEditorProps> = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  onSaved,
}) => {
  // מצבים
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // שדות מקומיים (של קטגוריה זו)
  const [localFields, setLocalFields] = useState<SimpleField[]>([]);
  // שדות שנורשו מקטגוריות אב
  const [inheritedFields, setInheritedFields] = useState<InheritedSpecificationField[]>([]);
  
  // שדה חדש להוספה
  const [newFieldName, setNewFieldName] = useState('');

  // יצירת ID זמני ייחודי
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // טעינת התבנית מהשרת
  const loadTemplate = useCallback(async () => {
    if (!categoryId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getSpecificationTemplate(categoryId);
      
      // הפרדה בין שדות מקומיים לשדות שנורשו
      const inherited = data.fields.filter(f => f.isInherited);
      const local = data.fields
        .filter(f => !f.isInherited)
        .map(f => ({ 
          _tempId: generateTempId(), 
          key: f.key 
        }));
      
      setInheritedFields(inherited);
      setLocalFields(local);
    } catch (err) {
      console.error('שגיאה בטעינת תבנית:', err);
      setError('שגיאה בטעינת תבנית המפרט הטכני');
      setInheritedFields([]);
      setLocalFields([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  // טעינה בעת פתיחת המודל
  useEffect(() => {
    if (isOpen && categoryId) {
      loadTemplate();
      setNewFieldName('');
    }
  }, [isOpen, categoryId, loadTemplate]);

  // הוספת שדה חדש
  const handleAddField = () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName) return;
    
    // בדיקה שהשדה לא קיים כבר
    const existingKeys = [
      ...localFields.map(f => f.key),
      ...inheritedFields.map(f => f.key)
    ];
    
    if (existingKeys.includes(trimmedName)) {
      setError('שדה עם שם זה כבר קיים');
      return;
    }
    
    setLocalFields(prev => [...prev, {
      _tempId: generateTempId(),
      key: trimmedName,
    }]);
    
    setNewFieldName('');
    setError(null);
  };

  // מחיקת שדה
  const handleDeleteField = (tempId: string) => {
    setLocalFields(prev => prev.filter(f => f._tempId !== tempId));
  };

  // הזזת שדה למעלה
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLocalFields(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  };

  // הזזת שדה למטה
  const handleMoveDown = (index: number) => {
    if (index === localFields.length - 1) return;
    setLocalFields(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  };

  // שמירת התבנית לשרת
  const handleSave = async () => {
    if (!categoryId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // הכנת הנתונים לשמירה - המרה לפורמט ISpecificationField
      const templateToSave: ISpecificationField[] = localFields.map((field, index) => ({
        key: field.key,
        label: field.key, // התווית = המפתח
        type: 'text' as const,
        sortOrder: index,
      }));
      
      await updateSpecificationTemplate(categoryId, templateToSave);
      
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('שגיאה בשמירת תבנית:', err);
      setError(err.message || 'שגיאה בשמירת התבנית');
    } finally {
      setSaving(false);
    }
  };

  // Enter להוספת שדה
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddField();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`תבנית מפרט טכני - ${categoryName}`}
      size="medium"
    >
      <div className={styles.container}>
        {/* שגיאה */}
        {error && (
          <div className={styles.errorBanner}>
            <Icon name="AlertCircle" size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className={styles.closeError} aria-label="סגור">
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {/* טעינה */}
        {loading ? (
          <div className={styles.loading}>
            <Icon name="Loader2" size={24} className={styles.spinner} />
            <span>טוען תבנית...</span>
          </div>
        ) : (
          <>
            {/* הסבר קצר */}
            <div className={styles.description}>
              <Icon name="Info" size={16} />
              <p>הגדר את שדות המפרט הטכני עבור מוצרים בקטגוריה זו. השדות יוצגו כאפשרויות מילוי בעת עריכת מוצר.</p>
            </div>

            {/* שדות שנורשו מקטגוריות אב */}
            {inheritedFields.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <Icon name="Share2" size={14} />
                  <span>שדות מקטגוריות אב ({inheritedFields.length})</span>
                </div>
                <div className={styles.fieldsList}>
                  {inheritedFields.map((field) => (
                    <div key={field.key} className={`${styles.fieldRow} ${styles.inherited}`}>
                      <span className={styles.fieldName}>{field.key}</span>
                      <span className={styles.inheritedBadge}>
                        מ-{field.inheritedFrom}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* שדות מקומיים */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Icon name="List" size={14} />
                <span>שדות קטגוריה זו ({localFields.length})</span>
              </div>
              
              {localFields.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>אין שדות מוגדרים</p>
                  <p className={styles.emptyHint}>הוסף שדה חדש למטה</p>
                </div>
              ) : (
                <div className={styles.fieldsList}>
                  {localFields.map((field, index) => (
                    <div key={field._tempId} className={styles.fieldRow}>
                      {/* כפתורי הזזה */}
                      <div className={styles.reorderButtons}>
                        <button
                          type="button"
                          className={styles.reorderBtn}
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          aria-label="הזז למעלה"
                        >
                          <Icon name="ChevronUp" size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.reorderBtn}
                          onClick={() => handleMoveDown(index)}
                          disabled={index === localFields.length - 1}
                          aria-label="הזז למטה"
                        >
                          <Icon name="ChevronDown" size={14} />
                        </button>
                      </div>
                      
                      {/* שם השדה */}
                      <span className={styles.fieldName}>{field.key}</span>
                      
                      {/* כפתור מחיקה */}
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteField(field._tempId)}
                        aria-label="מחק שדה"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* הוספת שדה חדש - inline */}
            {/* הוספת שדה חדש - inline */}
            <div className={styles.addFieldRow}>
              <input
                id="new-field-name"
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="שם השדה החדש..."
                disabled={saving || localFields.length >= 30}
                className={styles.addFieldInput}
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleAddField}
                disabled={!newFieldName.trim() || saving || localFields.length >= 30}
                icon={<Icon name="Plus" size={16} />}
              >
                הוסף
              </Button>
            </div>

            {/* אזהרה על מגבלה */}
            {localFields.length >= 30 && (
              <div className={styles.limitWarning}>
                <Icon name="AlertTriangle" size={14} />
                <span>הגעת למקסימום 30 שדות</span>
              </div>
            )}
          </>
        )}

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            ביטול
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={saving || loading}
            icon={saving ? <Icon name="Loader2" size={16} className={styles.spinner} /> : undefined}
          >
            {saving ? 'שומר...' : 'שמור תבנית'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SpecificationTemplateEditor;
