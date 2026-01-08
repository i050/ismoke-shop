/**
 * AddVariantDialog Component
 * ==========================
 * דיאלוג להוספת ערך חדש לתת-וריאנט (ניקוטין/התנגדות/מידה)
 * עם select מרשימה של הערכים הזמינים
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '../../../../../../ui/Icon';
import styles from './AddVariantDialog.module.css';

interface AddVariantDialogProps {
  isOpen: boolean;
  variantName: string; // "מידה", "ניקוטין", "התנגדות"
  colorName: string;
  availableValues: string[]; // ערכים זמינים שעדיין לא נבחרו
  onConfirm: (selectedValue: string) => void;
  onCancel: () => void;
}

const AddVariantDialog: React.FC<AddVariantDialogProps> = ({
  isOpen,
  variantName,
  colorName,
  availableValues,
  onConfirm,
  onCancel,
}) => {
  const [selectedValue, setSelectedValue] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedValue('');
      setCustomValue('');
      setUseCustom(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const valueToAdd = useCustom ? customValue.trim() : selectedValue;
    if (valueToAdd) {
      onConfirm(valueToAdd);
    }
  };

  const canConfirm = useCustom ? customValue.trim().length > 0 : selectedValue.length > 0;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Icon name="Plus" size={20} />
            הוספת {variantName}
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="סגור"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            הוסף {variantName} לצבע <strong>{colorName}</strong>
          </p>

          {availableValues.length > 0 ? (
            <>
              {/* בחירה מהרשימה */}
              <div className={styles.field}>
                <label className={styles.label}>
                  <input
                    type="radio"
                    checked={!useCustom}
                    onChange={() => setUseCustom(false)}
                  />
                  בחר מהרשימה:
                </label>
                <select
                  className={styles.select}
                  value={selectedValue}
                  onChange={(e) => {
                    setSelectedValue(e.target.value);
                    setUseCustom(false);
                  }}
                  disabled={useCustom}
                >
                  <option value="">-- בחר {variantName} --</option>
                  {availableValues.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* או ערך מותאם */}
              <div className={styles.field}>
                <label className={styles.label}>
                  <input
                    type="radio"
                    checked={useCustom}
                    onChange={() => setUseCustom(true)}
                  />
                  או הקלד ערך מותאם:
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={customValue}
                  onChange={(e) => {
                    setCustomValue(e.target.value);
                    setUseCustom(true);
                  }}
                  onFocus={() => setUseCustom(true)}
                  placeholder={`לדוגמה: 0.5%, 1.2Ω וכו'`}
                  disabled={!useCustom}
                />
              </div>
            </>
          ) : (
            /* אין ערכים זמינים - רק קלט חופשי */
            <div className={styles.field}>
              <label className={styles.label}>
                הקלד {variantName}:
              </label>
              <input
                type="text"
                className={styles.input}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={`לדוגמה: 0.5%, 1.2Ω, XL וכו'`}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <Icon name="Plus" size={16} />
            הוסף {variantName}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVariantDialog;
