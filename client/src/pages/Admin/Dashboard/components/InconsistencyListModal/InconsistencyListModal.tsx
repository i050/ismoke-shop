import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import {
  closeModal,
  setProductIgnore,
} from '../../../../../store/slices/adminDashboardSlice';
import { Icon, Button } from '../../../../../components/ui';
import Modal from '../../../../../components/ui/Modal/Modal';
import { useConfirm } from '../../../../../hooks/useConfirm';
import styles from './InconsistencyListModal.module.css';

/**
 * מודאל לניהול התראות אי-עקביות במוצרים
 * מציג טבלה של מוצרים בעייתיים עם אפשרויות פעולה
 */
const InconsistencyListModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  let confirm: any = null;
  try {
    // קוראים ל-hook באופן ישיר; אם אין ConfirmProvider הוא יזרוק
    confirm = useConfirm();
  } catch (e) {
    // אין provider — נעבור ל-fallback במקום לקרוס
    confirm = null;
  }
  
  // קבלת מצב מה-Redux
  const { warnings, isModalOpen, loading } = useAppSelector((state) => state.adminDashboard);

  // סגירת המודאל
  const handleClose = () => {
    dispatch(closeModal());
  };

  // ניווט לעריכת מוצר
  const handleFix = (productId: string) => {
    // סגירת המודאל
    dispatch(closeModal());
    
    // ניווט לעמוד עריכת המוצר עם state מיוחד - לטאב מאפייני סינון
    navigate(`/admin/products`, {
      state: {
        editProductId: productId,
        activeTab: 'attributes',
        highlightWarnings: true,
      },
    });
  };

  // התעלמות לצמיתות
  const handleIgnoreForever = async (productId: string) => {

    if (!confirm) {
      // אם אין provider — משתמשים ב-window.confirm כדי למנוע קריסה
      const confirmedFallback = window.confirm('התעלמות לצמיתות - האם אתה בטוח?');
      if (confirmedFallback) {
        await dispatch(setProductIgnore({ productId, ignoreType: 'forever' }));
      }
      return;
    }

    const confirmed = await confirm({
      title: 'התעלמות לצמיתות',
      message: 'האם אתה בטוח שברצונך להתעלם ממוצר זה לצמיתות?',
      confirmText: 'התעלם',
      cancelText: 'ביטול',
      danger: true,
    });
    if (confirmed) {
      await dispatch(setProductIgnore({ productId, ignoreType: 'forever' }));
    }
  };

  // התעלמות זמנית (4 ימים)
  const handleSnooze = async (productId: string) => {
    await dispatch(setProductIgnore({ productId, ignoreType: 'snooze' }));
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="מוצרים עם חוסר עקביות"
      size="large"
      className={styles.modal}
    >
      <div className={styles.modalContent}>
        {/* הסבר כללי */}
        <div className={styles.infoBox}>
          <Icon name="AlertCircle" size={20} />
          <p>
            המוצרים הבאים מכילים אי-עקביות בנתוני ה-SKU. 
            חלק מהוריאציות חסרות מידע שקיים בוריאציות אחרות של אותו מוצר.
            זה עלול לפגוע בחוויית המשתמש ובסינונים.
          </p>
        </div>

        {/* טבלת מוצרים */}
        {loading ? (
          <div className={styles.loading}>
            <Icon name="Clock" size={32} className={styles.spinner} />
            <p>טוען נתונים...</p>
          </div>
        ) : warnings.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="CheckCircle2" size={48} />
            <h3>כל הכבוד!</h3>
            <p>לא נמצאו מוצרים עם אי-עקביות</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>תמונה</th>
                  <th>שם המוצר</th>
                  <th>תיאור הבעיה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {warnings.map((warning) => (
                  <tr key={warning.productId}>
                    {/* תמונת המוצר */}
                    <td>
                      <div className={styles.imageCell}>
                        {warning.productImage ? (
                          <img
                            src={warning.productImage}
                            alt={warning.productName}
                            className={styles.productImage}
                          />
                        ) : (
                          <div className={styles.noImage}>
                            <Icon name="Image" size={24} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* שם המוצר */}
                    <td>
                      <span className={styles.productName}>{warning.productName}</span>
                    </td>

                    {/* תיאור הבעיה */}
                    <td>
                      <div className={styles.issuesCell}>
                        {warning.issues.map((issue, idx) => (
                          <div key={idx} className={styles.issueTag}>
                            <Icon name="AlertCircle" size={14} />
                            <span>
                              {issue.attributeKey === 'color' ? 'צבע' : issue.attributeKey}:
                              חסר ב-{issue.missingInCount}/{issue.totalSkus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* כפתורי פעולה */}
                    <td>
                      <div className={styles.actions}>
                        {/* כפתור תקן */}
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${styles.actionBtn} ${styles.fixBtn}`}
                          onClick={() => handleFix(warning.productId)}
                          title="עבור לתיקון המוצר"
                        >
                          <Icon name="Edit" size={16} />
                          תקן
                        </Button>

                        {/* כפתור התעלם */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${styles.actionBtn} ${styles.ignoreBtn}`}
                          onClick={() => handleIgnoreForever(warning.productId)}
                          title="התעלם ממוצר זה לצמיתות"
                        >
                          <Icon name="XCircle" size={16} />
                          התעלם
                        </Button>

                        {/* כפתור הזכר לי אחר כך */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${styles.actionBtn} ${styles.snoozeBtn}`}
                          onClick={() => handleSnooze(warning.productId)}
                          title="הזכר לי בעוד 4 ימים"
                        >
                          <Icon name="Clock" size={16} />
                          בעוד 4 ימים
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* סיכום בתחתית */}
        {warnings.length > 0 && (
          <div className={styles.footer}>
            <p className={styles.summary}>
              סה"כ {warnings.length} מוצרים דורשים טיפול
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InconsistencyListModal;
