/**
 * כרטיס יצוא נתונים
 * 
 * מאפשר יצוא דוחות בפורמטים:
 * - CSV (פשוט לייבא ל-Excel)
 * - JSON (לעיבוד תכנותי)
 * - PDF (טבלה מקצועית עם תמיכה מלאה בעברית)
 * 
 * דוחות זמינים:
 * - מכירות
 * - מוצרים נמכרים
 * - סטטיסטיקות לקוחות
 */

import React, { useState, useCallback } from 'react';
import { Icon, type IconName } from '@ui';
import ReportCard from '../ReportCard';
import DateRangePicker, { type DateRange, type DateRangePreset } from '../DateRangePicker';
import { getTopSellingProducts, getAllOrders, type OrderStatus } from '../../../../../services/orderService';
import userManagementService from '../../../../../services/userManagementService';
import { exportToPdf } from '../../../../../utils/pdfExportHebrew';
import styles from './DataExportCard.module.css';

// ============================================================================
// Types
// ============================================================================

type ReportType = 'sales' | 'products' | 'customers';
type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportOption {
  id: ReportType;
  label: string;
  description: string;
  iconName: IconName;
}

// ============================================================================
// Constants
// ============================================================================

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'sales',
    label: 'דוח מכירות',
    description: 'הכנסות והזמנות',
    iconName: 'DollarSign'
  },
  {
    id: 'products',
    label: 'מוצרים נמכרים',
    description: 'Top 50 מוצרים',
    iconName: 'Package'
  },
  {
    id: 'customers',
    label: 'סטטיסטיקות לקוחות',
    description: 'נתוני משתמשים',
    iconName: 'Users'
  }
];

// סטטוסים אפשריים לסינון
const ORDER_STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'pending', label: 'ממתין' },
  { value: 'confirmed', label: 'מאושר' },
  { value: 'processing', label: 'בעיבוד' },
  { value: 'shipped', label: 'נשלח' },
  { value: 'delivered', label: 'נמסר' },
  { value: 'cancelled', label: 'בוטל' },
  { value: 'refunded', label: 'הוחזר' }
];

// ============================================================================
// Utils
// ============================================================================

const formatDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// תווית לתקופה בעברית
const getPresetLabel = (preset: DateRangePreset): string => {
  const labels: Record<DateRangePreset, string> = {
    today: 'היום',
    yesterday: 'אתמול',
    week: 'שבוע',
    month: 'חודש',
    quarter: 'רבעון',
    year: 'שנה',
    custom: 'מותאם'
  };
  return labels[preset] || preset;
};

// ברירת מחדל לתקופה - חודש אחרון
const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startDate: monthStart,
    endDate: monthEnd,
    preset: 'month'
  };
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// תרגום סטטוסים לעברית
const translateStatus = (status: OrderStatus): string => {
  const translations: Record<OrderStatus, string> = {
    pending: 'ממתין',
    confirmed: 'מאושר',
    processing: 'בעיבוד',
    shipped: 'נשלח',
    delivered: 'נמסר',
    cancelled: 'בוטל',
    refunded: 'הוחזר'
  };
  return translations[status] || status;
};

// תרגום אמצעי תשלום
const translatePaymentGateway = (gateway: string): string => {
  const translations: Record<string, string> = {
    stripe: 'כרטיס אשראי',
    paypal: 'PayPal',
    cash: 'מזומן',
    mock: 'תשלום ניסיון'
  };
  return translations[gateway] || gateway;
};

// תרגום סטטוס תשלום
const translatePaymentStatus = (status: string): string => {
  const translations: Record<string, string> = {
    pending: 'ממתין לתשלום',
    unpaid: 'לא שולם',
    processing: 'מעבד',
    completed: 'שולם',
    paid: 'שולם',
    failed: 'נכשל',
    refunded: 'הוחזר',
    cancelled: 'בוטל'
  };
  return translations[status] || status;
};

const convertToCSV = (data: Record<string, unknown>[], headers: { key: string; label: string }[]): string => {
  // כותרות
  const headerRow = headers.map(h => h.label).join(',');
  
  // שורות נתונים
  const dataRows = data.map(row => 
    headers.map(h => {
      const value = row[h.key];
      // escape לערכים עם פסיקים או גרשיים
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  // הוספת BOM (Byte Order Mark) לתמיכה בעברית ב-Excel
  return '\uFEFF' + [headerRow, ...dataRows].join('\n');
};

// ============================================================================
// Component
// ============================================================================

const DataExportCard: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  
  // בחירת תקופה לדוח מכירות
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  
  // סינון לפי סטטוס הזמנה (רק לדוח מכירות)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // ===== יצוא נתונים =====
  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);

    try {
      let data: Record<string, unknown>[];
      let headers: { key: string; label: string }[];
      let filename: string;

      switch (selectedReport) {
        case 'sales': {
          // שליפת הזמנות בדפדוף לפי תקופה נבחרת
          // שולפים עד 10 עמודים = 1000 הזמנות מקסימום
          const allOrders: import('../../../../../services/orderService').Order[] = [];
          let currentPage = 1;
          const maxPages = 10;
          let hasMore = true;
          
          // המרת תאריכים לפורמט API
          const startDateStr = dateRange.startDate?.toISOString().split('T')[0];
          const endDateStr = dateRange.endDate?.toISOString().split('T')[0];
          
          // DEBUG: תיקוד - לוודא שהתאריכים בדיוק יודעים
          console.log('🔍 DEBUG Export - Date Range:', {
            preset: dateRange.preset,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            startDateStr,
            endDateStr
          });
          
          while (hasMore && currentPage <= maxPages) {
            const ordersResponse = await getAllOrders({ 
              page: currentPage, 
              limit: 100,
              startDate: startDateStr,
              endDate: endDateStr,
              // סינון לפי סטטוס - רק אם לא נבחר 'כל הסטטוסים'
              ...(statusFilter !== 'all' && { status: statusFilter })
            });
            
            allOrders.push(...ordersResponse.data);
            
            // בדיקה אם יש עוד עמודים
            hasMore = ordersResponse.pagination.page < ordersResponse.pagination.pages;
            currentPage++;
          }
          
          // יצירת שורה לכל הזמנה עם פרטים מלאים
          data = allOrders.map(order => {
            // DEBUG: לוודא שיש items בהזמנה
            console.log('🔍 DEBUG Order:', {
              orderNumber: order.orderNumber,
              itemsType: typeof order.items,
              itemsIsArray: Array.isArray(order.items),
              itemsLength: order.items?.length,
              paymentStatus: order.payment?.status
            });
            
            // חילוץ מייל - אם יש משתמש רשום (userId populate) או אורח (guestEmail)
            let customerEmail = 'לא זמין';
            if (order.userId && typeof order.userId === 'object' && 'email' in order.userId) {
              customerEmail = order.userId.email;
            } else if (order.guestEmail) {
              customerEmail = order.guestEmail;
            }
            
            // חילוץ שם לקוח - קודם מהמשתמש הרשום, אחר כך מכתובת המשלוח
            let customerName = 'אורח';
            if (order.userId && typeof order.userId === 'object' && 'firstName' in order.userId) {
              customerName = `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim();
            } else if (order.shippingAddress?.fullName) {
              customerName = order.shippingAddress.fullName;
            }
            
            // חילוץ טלפון - קודם מהמשתמש הרשום, אחר כך מכתובת המשלוח
            let customerPhone = '';
            if (order.userId && typeof order.userId === 'object' && 'phone' in order.userId && order.userId.phone) {
              customerPhone = order.userId.phone;
            } else if (order.shippingAddress?.phone) {
              customerPhone = order.shippingAddress.phone;
            }
            
            // בניית רשימת מוצרים - עם בדיקת תקינות
            // הערה: ב-DB השדה נקרא 'name', ב-Frontend Interface נקרא 'productName'
            let productsText = '';
            if (Array.isArray(order.items) && order.items.length > 0) {
              productsText = order.items
                .map(item => {
                  // תמיכה בשני השמות (name מה-DB, productName מה-interface)
                  const itemName = (item as any).name || item.productName || 'מוצר';
                  return `${itemName} (${item.quantity || 1})`;
                })
                .join('; ');
            }
            
            return {
              orderNumber: order.orderNumber || '',
              orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '',
              customerName,
              customerEmail,
              customerPhone,
              status: order.status ? translateStatus(order.status) : '',
              itemsCount: Array.isArray(order.items) ? order.items.length : 0,
              products: productsText,
              subtotal: order.subtotal || 0,
              shippingCost: order.shippingCost || 0,
              discount: order.discount || 0,
              total: order.total || 0,
              paymentMethod: order.payment?.gateway ? translatePaymentGateway(order.payment.gateway) : 'לא צוין',
              // סטטוס תשלום - אם אין payment object, סימן שלא שולם
              paymentStatus: order.payment?.status 
                ? translatePaymentStatus(order.payment.status) 
                : 'לא שולם',
              shippingCity: order.shippingAddress?.city || '',
              shippingAddress: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}`,
              notes: order.notes || ''
            };
          });
          
          headers = [
            { key: 'orderNumber', label: 'מספר הזמנה' },
            { key: 'orderDate', label: 'תאריך' },
            { key: 'customerName', label: 'שם לקוח' },
            { key: 'customerEmail', label: 'אימייל לקוח' },
            { key: 'customerPhone', label: 'טלפון לקוח' },
            { key: 'status', label: 'סטטוס הזמנה' },
            { key: 'itemsCount', label: 'מספר פריטים' },
            { key: 'products', label: 'מוצרים' },
            { key: 'subtotal', label: 'סכום ביניים' },
            { key: 'shippingCost', label: 'עלות משלוח' },
            { key: 'discount', label: 'הנחה' },
            { key: 'total', label: 'סה"כ לתשלום' },
            { key: 'paymentMethod', label: 'אמצעי תשלום' },
            { key: 'paymentStatus', label: 'סטטוס תשלום' },
            { key: 'shippingCity', label: 'עיר' },
            { key: 'shippingAddress', label: 'כתובת משלוח' },
            { key: 'notes', label: 'הערות' }
          ];
          // שם קובץ עם תקופה נבחרת
          const periodLabel = getPresetLabel(dateRange.preset);
          filename = `sales-report-${periodLabel}-${formatDate()}`;
          break;
        }

        case 'products': {
          const response = await getTopSellingProducts(50);
          data = response.data.map((product, index) => ({
            rank: index + 1,
            productName: product.productName,
            totalQuantity: product.totalQuantity,
            totalRevenue: product.totalRevenue,
            productId: product.productId
          }));
          headers = [
            { key: 'rank', label: 'דירוג' },
            { key: 'productName', label: 'שם מוצר' },
            { key: 'totalQuantity', label: 'כמות נמכרה' },
            { key: 'totalRevenue', label: 'הכנסות' },
            { key: 'productId', label: 'מזהה מוצר' }
          ];
          filename = `top-products-${formatDate()}`;
          break;
        }

        case 'customers': {
          // שליפת כל הלקוחות (עד 1000) עם populate של קבוצות
          const usersResponse = await userManagementService.getAllUsers({ limit: 1000 });
          
          // יצירת שורה לכל לקוח עם פרטים זמינים
          data = usersResponse.users.map(user => {
            // בדיקה אם customerGroupId הוא אובייקט (populate) או ID
            const hasGroup = typeof user.customerGroupId === 'object' && user.customerGroupId !== null;
            const groupName = hasGroup ? (user.customerGroupId as any).name : 'ללא קבוצה';
            const groupDiscount = hasGroup && (user.customerGroupId as any).discountPercentage 
              ? `${(user.customerGroupId as any).discountPercentage}%` 
              : '0%';
            
            return {
              _id: user._id,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              email: user.email,
              isActive: user.isActive ? 'פעיל' : 'לא פעיל',
              group: groupName,
              groupDiscount: groupDiscount,
              registeredDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : ''
            };
          });
          
          headers = [
            { key: '_id', label: 'מזהה מערכת' },
            { key: 'fullName', label: 'שם מלא' },
            { key: 'firstName', label: 'שם פרטי' },
            { key: 'lastName', label: 'שם משפחה' },
            { key: 'email', label: 'אימייל' },
            { key: 'isActive', label: 'סטטוס פעילות' },
            { key: 'group', label: 'קבוצת לקוחות' },
            { key: 'groupDiscount', label: 'הנחה' },
            { key: 'registeredDate', label: 'תאריך הצטרפות' }
          ];
          filename = `customers-detailed-report-${formatDate()}`;
          break;
        }
      }

      // יצירת הקובץ לפי הפורמט הנבחר
      if (format === 'csv') {
        const csvContent = convertToCSV(data, headers);
        // BOM + UTF-8 encoding לתצוגה תקינה של עברית ב-Excel
        downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
      } else if (format === 'json') {
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8');
      } else if (format === 'pdf') {
        // יצוא PDF עם תמיכה מלאה בעברית
        const reportTitle = EXPORT_OPTIONS.find(o => o.id === selectedReport)?.label || 'דוח';
        const periodLabel = selectedReport === 'sales' ? getPresetLabel(dateRange.preset) : undefined;
        
        await exportToPdf({
          title: reportTitle,
          subtitle: periodLabel ? `תקופה: ${periodLabel}` : undefined,
          headers,
          data,
          filename
        });
      }

      setLastExport(`${EXPORT_OPTIONS.find(o => o.id === selectedReport)?.label} - ${format.toUpperCase()}`);

    } catch (err) {
      console.error('Export error:', err);
      alert('שגיאה ביצוא הנתונים');
    } finally {
      setIsExporting(false);
    }
  }, [selectedReport, dateRange, statusFilter]);

  // ===== רינדור ראשי =====
  return (
    <ReportCard
      icon="Download"
      title="יצוא נתונים"
      description="הורדה ל-CSV, JSON ו-PDF"
      accentColor="orange"
      minHeight={320}
      isLoading={isExporting}
    >
      <div className={styles.exportContent}>
        {/* ===== בחירת דוח ===== */}
        <div className={styles.reportSelector}>
          {EXPORT_OPTIONS.map(option => (
            <button
              key={option.id}
              className={styles.reportOption}
              data-selected={selectedReport === option.id}
              onClick={() => setSelectedReport(option.id)}
              disabled={isExporting}
            >
              <Icon name={option.iconName} size={18} />
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDesc}>{option.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ===== בחירת תקופה (רק לדוח מכירות) ===== */}
        {selectedReport === 'sales' && (
          <div className={styles.dateRangeSection}>
            <div className={styles.sectionLabel}>
              <Icon name="Calendar" size={14} />
              <span>בחר תקופה:</span>
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        )}

        {/* ===== סינון לפי סטטוס הזמנה (רק לדוח מכירות) ===== */}
        {selectedReport === 'sales' && (
          <div className={styles.statusFilterSection}>
            <div className={styles.sectionLabel}>
              <Icon name="Filter" size={14} />
              <span>סינון סטטוס:</span>
            </div>
            <select
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              disabled={isExporting}
            >
              {ORDER_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ===== כפתורי יצוא ===== */}
        <div className={styles.exportButtons}>
          <button
            className={styles.exportBtn}
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Icon name="FileSpreadsheet" size={20} />
            <span>CSV</span>
          </button>
          {/* <button
            className={styles.exportBtn}
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            <Icon name="FileCode" size={20} />
            <span>JSON</span>
          </button> */}
          <button
            className={`${styles.exportBtn} ${styles.exportBtnPdf}`}
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <Icon name="FileText" size={20} />
            <span>PDF</span>
          </button>
        </div>

        {/* ===== הודעת יצוא אחרון ===== */}
        {lastExport && (
          <div className={styles.lastExport}>
            <Icon name="CheckCircle" size={14} />
            <span>יוצא: {lastExport}</span>
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default DataExportCard;
