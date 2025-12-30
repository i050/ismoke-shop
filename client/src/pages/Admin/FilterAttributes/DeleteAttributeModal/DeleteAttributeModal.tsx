import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Icon } from '../../../../components/ui';
import type { FilterAttribute } from '../../../../services/filterAttributeService';
import styles from './DeleteAttributeModal.module.css';

interface DeleteAttributeModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** המאפיין למחיקה */
  attribute: FilterAttribute | null;
  /** כמות ה-SKUs שמשתמשים במאפיין */
  usageCount: number;
  /** האם בתהליך טעינה/עיבוד */
  isProcessing: boolean;
  /** פונקציה לסגירת המודאל */
  onClose: () => void;
  /** פונקציה להסרת המאפיין מכל המוצרים */
  onRemoveFromAll: () => void;
  /** פונקציה למחיקת המאפיין (אחרי שהוסר מכל המוצרים) */
  onDelete: () => void;
}

/** משך הספירה לאחור בשניות */
const COUNTDOWN_DURATION = 10;

/**
 * מודאל מחיקת מאפיין סינון
 * 
 * זרימה:
 * 1. אם המאפיין בשימוש - מציג כמה מוצרים משתמשים בו
 * 2. משתמש לוחץ "הסר מכל המוצרים"
 * 3. מתחילה ספירה לאחור של 10 שניות (אפשר לבטל)
 * 4. בסיום הספירה - מסיר מכל המוצרים ומוחק את המאפיין
 */
const DeleteAttributeModal: React.FC<DeleteAttributeModalProps> = ({
  isOpen,
  attribute,
  usageCount,
  isProcessing,
  onClose,
  onRemoveFromAll,
  onDelete,
}) => {
  // ספירה לאחור
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [shouldExecute, setShouldExecute] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ניקוי טיימר בסגירה
  useEffect(() => {
    if (!isOpen) {
      cancelCountdown();
      setShouldExecute(false);
    }
  }, [isOpen]);

  // ניקוי בעת unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ביצוע הפעולה כש-shouldExecute הופך ל-true
  useEffect(() => {
    if (shouldExecute) {
      setShouldExecute(false);
      onRemoveFromAll();
    }
  }, [shouldExecute, onRemoveFromAll]);

  /**
   * התחלת ספירה לאחור
   */
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_DURATION);
    setIsCountdownActive(true);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // סיום הספירה
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsCountdownActive(false);
          
          // סימון שצריך לבצע את הפעולה (יטופל ב-useEffect)
          setShouldExecute(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * ביטול ספירה לאחור
   */
  const cancelCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdown(null);
    setIsCountdownActive(false);
    setShouldExecute(false);
  }, []);

  /**
   * סגירה עם ביטול הספירה
   */
  const handleClose = () => {
    cancelCountdown();
    onClose();
  };

  // לא להציג אם אין מאפיין
  if (!attribute) return null;

  const hasUsage = usageCount > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="מחיקת מאפיין סינון"
      size="small"
      closeOnOverlayClick={!isCountdownActive && !isProcessing}
      closeOnEscape={!isCountdownActive && !isProcessing}
    >
      <div className={styles.container}>
        {/* איקון אזהרה */}
        <div className={styles.iconWrapper}>
          <Icon 
            name={hasUsage ? "AlertTriangle" : "Trash2"} 
            size={48} 
            className={hasUsage ? styles.warningIcon : styles.deleteIcon} 
          />
        </div>

        {/* שם המאפיין */}
        <h3 className={styles.attributeName}>
          {attribute.name}
        </h3>

        {/* תוכן מותנה לפי מצב השימוש */}
        {hasUsage ? (
          <>
            {/* הודעת אזהרה - יש מוצרים שמשתמשים */}
            <div className={styles.warningBox}>
              <Icon name="Package" size={20} />
              <p>
                <strong>{usageCount}</strong> מוצרים משתמשים במאפיין זה.
                <br />
                יש להסיר אותו מכל המוצרים לפני המחיקה.
              </p>
            </div>

            {/* ספירה לאחור */}
            {isCountdownActive && countdown !== null && (
              <div className={styles.countdownSection}>
                <div className={styles.countdownCircle}>
                  <span className={styles.countdownNumber}>{countdown}</span>
                </div>
                <p className={styles.countdownText}>
                  ההסרה תתבצע בעוד {countdown} שניות...
                </p>
                <Button
                  variant="secondary"
                  onClick={cancelCountdown}
                  className={styles.cancelButton}
                >
                  <Icon name="X" size={16} />
                  ביטול
                </Button>
              </div>
            )}

            {/* כפתורי פעולה - רק אם לא בספירה */}
            {!isCountdownActive && !isProcessing && (
              <div className={styles.actions}>
                <Button
                  variant="danger"
                  onClick={startCountdown}
                >
                  <Icon name="Trash2" size={18} />
                  הסר מכל המוצרים ומחק
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                >
                  ביטול
                </Button>
              </div>
            )}

            {/* מצב עיבוד */}
            {isProcessing && (
              <div className={styles.processingSection}>
                <div className={styles.spinner} />
                <p>מסיר את המאפיין מכל המוצרים...</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* אין מוצרים שמשתמשים - מחיקה ישירה */}
            <p className={styles.noUsageText}>
              אין מוצרים שמשתמשים במאפיין זה.
              <br />
              ניתן למחוק אותו בבטחה.
            </p>

            {!isProcessing ? (
              <div className={styles.actions}>
                <Button
                  variant="danger"
                  onClick={onDelete}
                >
                  <Icon name="Trash2" size={18} />
                  מחק מאפיין
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                >
                  ביטול
                </Button>
              </div>
            ) : (
              <div className={styles.processingSection}>
                <div className={styles.spinner} />
                <p>מוחק את המאפיין...</p>
              </div>
            )}
          </>
        )}

        {/* הודעת אזהרה על בלתי הפיכה */}
        <p className={styles.warningNote}>
          <Icon name="AlertCircle" size={14} />
          פעולה זו בלתי הפיכה
        </p>
      </div>
    </Modal>
  );
};

export default DeleteAttributeModal;
