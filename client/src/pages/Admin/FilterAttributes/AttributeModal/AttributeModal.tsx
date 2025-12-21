import React, { useState, useEffect } from 'react';
import type { FilterAttribute } from '../../../../services/filterAttributeService';
import { FilterAttributeService } from '../../../../services/filterAttributeService';
import { Button, Icon, Input } from '../../../../components/ui';
import Modal from '../../../../components/ui/Modal';
import { useToast } from '../../../../hooks/useToast';
import styles from './AttributeModal.module.css';

/**
 * Props של קומפוננטת AttributeModal
 */
interface AttributeModalProps {
  attribute: FilterAttribute | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * ערך בודד במאפיין (טקסט/מספר)
 */
interface AttributeValue {
  value: string;
  displayName: string;
}

/**
 * AttributeModal - מודל ליצירה ועריכה של מאפייני סינון
 * כולל תמיכה בשלושה סוגי מאפיינים: טקסט, צבע, מספר
 */
const AttributeModal: React.FC<AttributeModalProps> = ({
  attribute,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<'text' | 'color' | 'number'>('text');
  const [icon, setIcon] = useState('');
  const [showInFilter, setShowInFilter] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [values, setValues] = useState<AttributeValue[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // Effects - טעינת נתונים במצב עריכה
  // ============================================================================
  
  useEffect(() => {
    if (attribute) {
      setName(attribute.name);
      setKey(attribute.key);
      setValueType(attribute.valueType);
      setIcon(attribute.icon || '');
      setShowInFilter(attribute.showInFilter);
      setIsRequired(attribute.isRequired);
      setSortOrder(attribute.sortOrder);
      
      if (attribute.values) {
        setValues(
          attribute.values.map((val) =>
            typeof val === 'string'
              ? { value: val, displayName: val }
              : val
          )
        );
      }
    }
  }, [attribute]);

  /**
   * 🎨 הוספת צבעי רקע דינמית לאלמנטי צבע במאפיין צבע
   * פתרון לבעיית inline styles
   */
  useEffect(() => {
    document.querySelectorAll(`.${styles.colorDot}[data-color]`).forEach((dot) => {
      const colorValue = (dot as HTMLElement).getAttribute('data-color');
      if (colorValue) {
        (dot as HTMLElement).style.backgroundColor = colorValue;
      }
    });
  }, [attribute]);

  // ============================================================================
  // State - סטטוס שמירה
  // ============================================================================
  
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // Validation - ולידציה לפני שמירה
  // ============================================================================
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'שם המאפיין הוא שדה חובה';
    }

    if (!key.trim()) {
      newErrors.key = 'מזהה המאפיין הוא שדה חובה';
    } else if (!/^[a-z_]+$/.test(key)) {
      newErrors.key = 'מזהה חייב להכיל רק אותיות אנגליות קטנות וקו תחתון';
    }

    if (valueType === 'text' && values.length === 0) {
      newErrors.values = 'מאפיין טקסט צריך לפחות ערך אחד';
    }

    // הערה: מאפייני צבע נתמכים במלואם - ניתן לצפות בהם אבל לא לערוך
    // ערכים מורכבים (colorFamilies) נוצרים דרך seed/script

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // Handlers - טיפול באירועים
  // ============================================================================
  
  /**
   * שמירת המאפיין (יצירה או עדכון)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: Partial<FilterAttribute> = {
      name,
      key,
      valueType,
      icon: icon || undefined,
      showInFilter,
      isRequired,
      sortOrder,
      values: values.length > 0 ? values : undefined,
    };

    console.log('📤 Sending data:', JSON.stringify(data, null, 2));
    console.log('📤 values type:', typeof values, Array.isArray(values));

    setIsSaving(true);

    try {
      if (attribute) {
        await FilterAttributeService.updateAttribute(attribute._id, data);
        showToast('success', 'המאפיין עודכן בהצלחה');
      } else {
        await FilterAttributeService.createAttribute(data);
        showToast('success', 'המאפיין נוצר בהצלחה');
      }
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בשמירת המאפיין';
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * יצירת שם key אוטומטי מהשם העברי
   */
  const handleNameChange = (value: string) => {
    setName(value);
    
    // אם במצב יצירה, נצור key אוטומטית
    if (!attribute) {
      const transliteration: Record<string, string> = {
        צבע: 'color',
        גודל: 'size',
        חומר: 'material',
        מותג: 'brand',
        סגנון: 'style',
      };
      
      const autoKey = transliteration[value] || value
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      
      setKey(autoKey);
    }
  };

  /**
   * הוספת ערך חדש לרשימת הערכים
   */
  const handleAddValue = () => {
    setValues([...values, { value: '', displayName: '' }]);
  };

  /**
   * עדכון ערך ברשימה
   */
  const handleValueChange = (index: number, field: 'value' | 'displayName', newValue: string) => {
    const newValues = [...values];
    newValues[index][field] = newValue;
    setValues(newValues);
  };

  /**
   * מחיקת ערך מהרשימה
   */
  const handleRemoveValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={attribute ? 'עריכת מאפיין סינון' : 'יצירת מאפיין סינון חדש'}
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* הודעת שגיאה כללית */}
        {errors.general && (
          <div className={styles.errorBanner}>
            <Icon name="AlertCircle" size={20} />
            <span>{errors.general}</span>
          </div>
        )}

        {/* שדות בסיסיים */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>מידע בסיסי</h3>
          
          <div className={styles.field}>
            <label className={styles.label}>
              שם המאפיין בעברית <span className={styles.required}>*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="לדוגמה: צבע, גודל, חומר"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              מזהה (באנגלית) <span className={styles.required}>*</span>
            </label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              placeholder="color, size, material"
              disabled={!!attribute}
            />
            {errors.key && <span className={styles.error}>{errors.key}</span>}
            {attribute && (
              <span className={styles.hint}>
                לא ניתן לשנות מזהה של מאפיין קיים
              </span>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>סוג ערך</label>
              <select
                value={valueType}
                onChange={(e) => setValueType(e.target.value as any)}
                className={styles.select}
                disabled={!!attribute}
                aria-label="סוג ערך המאפיין"
              >
                <option value="text">טקסט</option>
                <option value="number">מספרי</option>
                <option value="color">צבעים (לא זמין)</option>
              </select>
            </div>

            {/* <div className={styles.field}>
              <label className={styles.label}>אייקון (אמוג'י)</label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 10))}
                placeholder="🎨"
              />
            </div> */}
          </div>
        </div>

        {/* הגדרות תצוגה */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>הגדרות תצוגה</h3>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={showInFilter}
                onChange={(e) => setShowInFilter(e.target.checked)}
              />
              <span>הצג בפאנל הסינון</span>
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              <span>שדה נדרש (יציג אזהרה)</span>
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>סדר תצוגה</label>
            <Input
              type="number"
              value={String(sortOrder)}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
            <span className={styles.hint}>
              סדר הופעת המאפיין בפאנל הסינון (0 = ראשון)
            </span>
          </div>
        </div>

        {/* ערכים אפשריים (רק לטקסט/מספר) */}
        {valueType !== 'color' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>ערכים אפשריים</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddValue}
                icon={<Icon name="Plus" size={16} />}
              >
                הוסף ערך
              </Button>
            </div>

            {errors.values && (
              <span className={styles.error}>{errors.values}</span>
            )}

            <div className={styles.valuesList}>
              {values.map((val, index) => (
                <div key={index} className={styles.valueRow}>
                  <Input
                    value={val.value}
                    onChange={(e) => handleValueChange(index, 'value', e.target.value)}
                    placeholder="ערך (למשל: red)"
                  />
                  <Input
                    value={val.displayName}
                    onChange={(e) => handleValueChange(index, 'displayName', e.target.value)}
                    placeholder="שם תצוגה (למשל: אדום)"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(index)}
                    className={styles.removeButton}
                    aria-label="הסר ערך"
                  >
                    <Icon name="X" size={18} />
                  </button>
                </div>
              ))}

              {values.length === 0 && (
                <div className={styles.emptyState}>
                  <Icon name="Package" size={32} />
                  <p>לא הוגדרו ערכים עדיין</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🎨 משפחות צבעים (read-only) - רק למאפייני צבע קיימים */}
        {valueType === 'color' && attribute?.colorFamilies && attribute.colorFamilies.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🎨 משפחות צבעים ({attribute.colorFamilies.length})</h3>
            <div className={styles.colorFamiliesReadOnly}>
              {attribute.colorFamilies.map((family) => (
                <div key={family.family} className={styles.colorFamilyCard}>
                  <div className={styles.familyHeader}>
                    <strong>{family.displayName}</strong>
                    <span className={styles.badge}>{family.variants.length} גוונים</span>
                  </div>
                  <div className={styles.variantsPreview}>
                    {family.variants.slice(0, 5).map((variant) => (
                      <div
                        key={variant.hex}
                        className={styles.colorDot}
                        data-color={variant.hex}
                        title={`${variant.name} (${variant.hex})`}
                      />
                    ))}
                    {family.variants.length > 5 && (
                      <span className={styles.moreIndicator}>+{family.variants.length - 5}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.hint}>
              💡 משפחות צבעים נוצרו דרך seed script ולא ניתנות לעריכה ישירה במודאל זה
            </div>
          </div>
        )}

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
            disabled={isSaving}
          >
            {attribute ? 'עדכן מאפיין' : 'צור מאפיין'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AttributeModal;
