/**
 * EditColorHexModal Component
 * ===========================
 * מודאל לעריכת צבע התצוגה (colorHex) של קבוצת צבע קיימת
 * לא משנה את colorFamily (לסינון) - רק את colorHex (לתצוגה)
 */

import React, { useState, useCallback, useMemo } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Icon } from '../../../../../../ui/Icon';
import styles from './EditColorHexModal.module.css';

// ============================================================================
// Props Interface
// ============================================================================

interface EditColorHexModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** callback לסגירת המודאל */
  onClose: () => void;
  /** callback לשמירת הצבע החדש */
  onSave: (newColorHex: string) => void;
  /** שם הצבע (לתצוגה בלבד) */
  colorName: string;
  /** משפחת הצבע (לתצוגה בלבד - לא ניתן לשינוי כאן) */
  colorFamily?: string;
  /** colorHex הנוכחי */
  currentColorHex?: string;
}

// ============================================================================
// Component
// ============================================================================

const EditColorHexModal: React.FC<EditColorHexModalProps> = ({
  isOpen,
  onClose,
  onSave,
  colorName,
  colorFamily,
  currentColorHex = '#808080',
}) => {
  // State לצבע הנבחר
  const [colorHex, setColorHex] = useState(currentColorHex);

  // Reset כשהמודאל נפתח
  React.useEffect(() => {
    if (isOpen) {
      setColorHex(currentColorHex);
    }
  }, [isOpen, currentColorHex]);

  // וואלידציה - colorHex חייב להיות HEX תקין
  const isValid = useMemo(() => 
    colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex),
    [colorHex]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onSave(colorHex);
    onClose();
  }, [isValid, colorHex, onSave, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="עריכת צבע תצוגה"
      size="small"
    >
      <div className={styles.content}>
        {/* הסבר */}
        <div className={styles.infoBox}>
          <Icon name="Info" size={16} />
          <p>
            שינוי הצבע כאן ישפיע רק על <strong>תצוגת הכפתור</strong> בחזית האתר.
            <br />
            <span className={styles.highlight}>משפחת הצבע לסינון לא תשתנה.</span>
          </p>
        </div>

        {/* פרטי הצבע הנוכחי */}
        <div className={styles.colorInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>שם הצבע:</span>
            <span className={styles.value}>{colorName}</span>
          </div>
          {colorFamily && (
            <div className={styles.infoRow}>
              <span className={styles.label}>משפחת צבע (לסינון):</span>
              <span className={styles.familyBadge}>{colorFamily}</span>
            </div>
          )}
        </div>

        {/* בחירת צבע */}
        <div className={styles.colorPickerSection}>
          <label className={styles.label}>צבע לתצוגה:</label>
          <div className={styles.colorPickerWrapper}>
            <input
              type="color"
              className={styles.colorPicker}
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              title="בחר צבע"
            />
            <input
              type="text"
              className={styles.hexInput}
              value={colorHex}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                  setColorHex(hex);
                }
              }}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>

        {/* תצוגה מקדימה */}
        <div className={styles.previewSection}>
          <span className={styles.label}>תצוגה מקדימה:</span>
          <div className={styles.previewBox}>
            <span 
              className={styles.colorSwatch} 
              style={{ backgroundColor: colorHex }}
            />
            <span className={styles.previewText}>{colorName}</span>
          </div>
        </div>

        {/* כפתורים */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            <Icon name="Check" size={16} />
            שמור שינויים
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditColorHexModal;
