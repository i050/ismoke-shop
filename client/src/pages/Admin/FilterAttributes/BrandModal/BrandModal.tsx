/**
 * 🏷️ BrandModal Component
 * 
 * מודאל ליצירה ועריכה של מותג
 * שדה אחד בלבד: שם המותג + סטטוס פעיל
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '../../../../components/ui';
import { BrandService, type Brand } from '../../../../services/brandService';
import { useToast } from '../../../../hooks/useToast';
import styles from './BrandModal.module.css';

interface BrandModalProps {
  /** מותג לעריכה (null = יצירה חדשה) */
  brand: Brand | null;
  /** סגירת המודאל */
  onClose: () => void;
  /** הצלחה - רענון הרשימה */
  onSuccess: () => void;
}

const BrandModal: React.FC<BrandModalProps> = ({ brand, onClose, onSuccess }) => {
  const { showToast } = useToast();
  
  // State
  const [name, setName] = useState(brand?.name || '');
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // מצב עריכה או יצירה
  const isEditMode = !!brand;

  // אתחול ערכים בעת פתיחה
  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setIsActive(brand.isActive);
    } else {
      setName('');
      setIsActive(true);
    }
    setError(null);
  }, [brand]);

  /**
   * וולידציה של השם
   */
  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'שם המותג הוא שדה חובה';
    if (trimmed.length < 2) return 'שם המותג חייב להכיל לפחות 2 תווים';
    if (trimmed.length > 100) return 'שם המותג לא יכול להכיל יותר מ-100 תווים';
    return null;
  };

  /**
   * שמירת המותג
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // וולידציה
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      if (isEditMode && brand) {
        // עדכון
        await BrandService.updateBrand(brand._id, {
          name: name.trim(),
          isActive,
        });
        showToast('success', `מותג "${name}" עודכן בהצלחה`);
      } else {
        // יצירה
        await BrandService.createBrand(name.trim());
        showToast('success', `מותג "${name}" נוצר בהצלחה`);
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('❌ שגיאה בשמירת מותג:', err);
      setError(err.message || 'שגיאה בשמירת המותג');
      showToast('error', err.message || 'שגיאה בשמירת המותג');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * טיפול בשינוי שם
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(null); // ניקוי שגיאה בעת הקלדה
  };

  /**
   * סגירה בלחיצה על הרקע
   */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* כותרת */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <div className={styles.iconWrapper}>
              <Icon name="Award" size={20} />
            </div>
            <h2 className={styles.title}>
              {isEditMode ? 'עריכת מותג' : 'הוספת מותג חדש'}
            </h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSaving}
            aria-label="סגירה"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        
        {/* תוכן */}
        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            {/* שם המותג */}
            <div className={styles.formGroup}>
              <label htmlFor="brand-name" className={styles.label}>
                שם המותג
                <span className={styles.required}>*</span>
              </label>
              <input
                id="brand-name"
                type="text"
                className={`${styles.input} ${error ? styles.hasError : ''}`}
                value={name}
                onChange={handleNameChange}
                placeholder="למשל: ASPIRE, SMOK, VAPORESSO"
                disabled={isSaving}
                autoFocus
                maxLength={100}
              />
              {error && <span className={styles.errorText}>{error}</span>}
              {!error && (
                <span className={styles.helperText}>
                  שם המותג יוצג בדרופדאון בחירת מותג במוצרים
                </span>
              )}
            </div>
            
            {/* סטטוס פעיל (רק במצב עריכה) */}
            {isEditMode && (
              <div className={styles.checkboxGroup}>
                <input
                  id="brand-active"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSaving}
                />
                <label htmlFor="brand-active" className={styles.checkboxLabel}>
                  מותג פעיל (ניתן לבחירה במוצרים)
                </label>
              </div>
            )}
          </div>
          
          {/* כפתורי פעולה */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              ביטול
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <>
                  <Icon name="Clock" size={16} />
                  שומר...
                </>
              ) : (
                <>
                  <Icon name="Check" size={16} />
                  {isEditMode ? 'שמור שינויים' : 'צור מותג'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandModal;
