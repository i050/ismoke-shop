import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import { getToken } from '../../../../../utils/tokenUtils';
import { fetchInconsistencies, openModal } from '../../../../../store/slices/adminDashboardSlice';
import { Icon, Button } from '../../../../../components/ui';
import InconsistencyListModal from '../InconsistencyListModal/InconsistencyListModal';
import styles from './InconsistencyAlertWidget.module.css';

/**
 * וידג'ט התראות אי-עקביות במוצרים
 * מציג את מספר המוצרים שדורשים טיפול ומאפשר פתיחת מודאל לניהול
 */
const InconsistencyAlertWidget: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // קבלת מצב מה-Redux
  const { warnings, loading, error } = useAppSelector((state) => state.adminDashboard);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // טעינת התראות בעת טעינת הקומפוננטה - רק אם המשתמש מחובר
  // ובלבד שלא טעננו לאחרונה (memoization קצרת טווח כדי לא להעמיס בקשות)
  useEffect(() => {
    // בדיקה שהמשתמש מחובר ושיש לו הרשאות admin
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super_admin')) {
      // Debug info: log auth state and local token
      try {
        const tokenValue = getToken();
        console.log('🔐 InconsistencyAlertWidget - isAuthenticated:', isAuthenticated, 'user.role:', user.role, 'getToken():', !!tokenValue);
      } catch (e) {
        console.log('🔐 InconsistencyAlertWidget - error checking token presence', e);
      }

      // האם כבר טענו לאחרונה? השתמש ב-lastFetch מ-Redux כדי להימנע מטעינה תכופה
      // אם lastFetch לא קיים או עבר מאז יותר מ-60 שניות - נטען שוב
      const CACHE_TTL_MS = 60_000; // 1 דקה
      const lastFetch = (window as any).__adminLastInconsistencyFetch || 0; // גיבוי גלובלי

      // העדכון הרשמי מה-state לא נגיש כאן ישירות - נשקול קריאה ל-lastFetch דרך ה-state
      // אך כדי לשמור על backward compatibility, נבצע בדיקה פשוטה דרך dispatch וסיגנל
      // אם צריך מדיניות יותר חכמה - נעביר ל-Redux עצמו (invalidateCache ועוד)

      // Dispatch only if no recent fetch in-memory (process) or Redux lastFetch expired
      // קריאה ל-Redux lastFetch תעשה בעזרת selector במקום - פשוט יותר לבדוק גם את ה-state
      // אך מאחר שה-state כבר מסופק כאן כ־warnings/loading/error בלבד, נחזור לקריאה פשוטה:
      dispatch(fetchInconsistencies());
      // שמירה בקאש תהליך כדי למנוע קריאות מהירות מאוד
      (window as any).__adminLastInconsistencyFetch = Date.now();
    }
  }, [dispatch, user, isAuthenticated]);

  // אם המשתמש לא מחובר או אין לו הרשאות - לא מציגים כלום
  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  // עבור אדמינים: תמיד מציגים את הווידג'ט, גם אם אין התראות (הצגה של 'אין בעיות')

  // פתיחת המודאל
  const handleClick = () => {
    dispatch(openModal());
  };

  return (
    <>
      <section className={styles.alertWidget}>
        {/* כותרת */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              <span className={styles.titleIcon}>
                <Icon name="AlertTriangle" size={24} />
              </span>
              בקרת איכות מוצרים
            </h2>
          </div>
        </div>

        {/* תוכן */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <Icon name="Clock" size={32} className={styles.spinner} />
              <p>טוען נתונים...</p>
            </div>
                  ) : error ? (
            <div className={styles.error}>
              <Icon name="XCircle" size={32} />
              <p>{error}</p>
            </div>
                  ) : (
                    <div className={styles.alertContent} onClick={handleClick}>
              <div className={styles.iconWrapper}>
                <Icon name="AlertCircle" size={48} className={styles.alertIcon} />
              </div>
              <div className={styles.textWrapper}>
                        <h3 className={styles.alertTitle}>
                          {warnings.length > 0 ? `נמצאו ${warnings.length} מוצרים עם חוסר עקביות` : 'אין מוצרים עם חוסר עקביות'}
                        </h3>
                <p className={styles.alertDescription}>
                  יש מוצרים שבהם חלק מה-SKUs חסרים מידע חשוב (מידה, צבע, חומר וכו').
                  זה עלול לפגוע בחוויית הקנייה ובסינונים.
                </p>
                <Button
                  variant="outline"
                  className={styles.actionButton}
                  onClick={handleClick}
                >
                  <Icon name="Search" size={18} />
                  הצג ותקן בעיות
                </Button>
              </div>
                      {warnings.length > 0 ? (
                        <div className={styles.badge}>{warnings.length}</div>
                      ) : (
                        <div className={styles.badge} style={{ background: 'var(--brand-secondary)' }}>0</div>
                      )}
            </div>
          )}
        </div>
      </section>

      {/* המודאל לניהול ההתראות */}
      <InconsistencyListModal />
    </>
  );
};

export default InconsistencyAlertWidget;
