import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Card, Button } from '../../../components/ui';
import { 
  getStockAlertStats, 
  type StockAlertStats 
} from '../../../services/stockAlertService';
import styles from './StockAlertsDashboard.module.css';

/**
 * StockAlertsDashboard - דשבורד ניהול התראות "עדכן אותי כשחוזר"
 * מציג סטטיסטיקות על התראות פעילות, נשלחו, ומוצרים מובילים
 */
const StockAlertsDashboard: React.FC = () => {
  // ============================================
  // State - מצב הקומפוננטה
  // ============================================
  
  // נתוני סטטיסטיקות
  const [stats, setStats] = useState<StockAlertStats | null>(null);
  // מצב טעינה
  const [loading, setLoading] = useState(true);
  // הודעת שגיאה
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // טעינת נתונים
  // ============================================
  
  /**
   * פונקציית טעינת הסטטיסטיקות מהשרת
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getStockAlertStats();
      
      if (data) {
        setStats(data);
      } else {
        setError('לא ניתן לטעון את נתוני ההתראות');
      }
    } catch (err) {
      console.error('Error fetching stock alert stats:', err);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  // טעינה ראשונית
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ============================================
  // רינדור - מצבי טעינה ושגיאה
  // ============================================
  
  // מצב טעינה
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Icon name="Loader2" size={48} className={styles.spinner} />
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  // מצב שגיאה
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <Icon name="AlertCircle" size={48} />
          <p>{error}</p>
          <Button onClick={fetchStats} variant="outline">
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // רינדור - תוכן ראשי
  // ============================================
  
  return (
    <div className={styles.container}>
      {/* כותרת הדף */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Icon name="Bell" size={28} className={styles.titleIcon} />
          <h1 className={styles.title}>התראות "עדכן אותי כשחוזר"</h1>
        </div>
        <p className={styles.subtitle}>
          מעקב אחר לקוחות שמחכים למוצרים שיחזרו למלאי
        </p>
      </header>

      {/* כרטיסי סטטיסטיקות */}
      <section className={styles.statsGrid}>
        {/* התראות פעילות */}
        <Card className={styles.statCard}>
          <div className={styles.statIcon}>
            <Icon name="Clock" size={32} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {stats?.totalActive ?? 0}
            </span>
            <span className={styles.statLabel}>התראות פעילות</span>
          </div>
          <p className={styles.statDescription}>
            לקוחות שממתינים לעדכון
          </p>
        </Card>

        {/* התראות שנשלחו */}
        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
            <Icon name="CheckCircle2" size={32} />
          </div>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statValueSuccess}`}>
              {stats?.totalSent ?? 0}
            </span>
            <span className={styles.statLabel}>התראות נשלחו</span>
          </div>
          <p className={styles.statDescription}>
            לקוחות שקיבלו עדכון
          </p>
        </Card>

        {/* אחוז המרה */}
        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
            <Icon name="TrendingUp" size={32} />
          </div>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statValueInfo}`}>
              {stats && stats.totalActive + stats.totalSent > 0
                ? Math.round((stats.totalSent / (stats.totalActive + stats.totalSent)) * 100)
                : 0}%
            </span>
            <span className={styles.statLabel}>שיעור שליחה</span>
          </div>
          <p className={styles.statDescription}>
            אחוז ההתראות שנשלחו
          </p>
        </Card>
      </section>

      {/* טבלת מוצרים מובילים */}
      <section className={styles.tableSection}>
        <Card className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              <Icon name="Star" size={20} />
              <h2>מוצרים עם הכי הרבה התראות</h2>
            </div>
            <span className={styles.tableCount}>
              {stats?.topProducts?.length ?? 0} מוצרים
            </span>
          </div>

          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>שם המוצר</th>
                    <th>התראות פעילות</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product, index) => (
                    <tr key={product.productId}>
                      <td className={styles.rankCell}>
                        <span className={styles.rank}>{index + 1}</span>
                      </td>
                      <td className={styles.productCell}>
                        <Icon name="Package" size={16} className={styles.productIcon} />
                        {product.productName}
                      </td>
                      <td className={styles.countCell}>
                        <span className={styles.alertBadge}>
                          {product.alertCount}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <Link 
                          to={`/admin/products?search=${encodeURIComponent(product.productName)}`}
                          className={styles.actionLink}
                        >
                          <Icon name="ExternalLink" size={16} />
                          צפה במוצר
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Icon name="Inbox" size={48} />
              <p>אין עדיין נתונים להצגה</p>
              <span>התראות יופיעו כאן כאשר לקוחות ירשמו לעדכונים</span>
            </div>
          )}
        </Card>
      </section>

      {/* כפתור רענון */}
      <div className={styles.refreshSection}>
        <Button 
          onClick={fetchStats} 
          variant="ghost"
          className={styles.refreshButton}
        >
          <Icon name="RefreshCw" size={16} />
          רענן נתונים
        </Button>
      </div>
    </div>
  );
};

export default StockAlertsDashboard;
