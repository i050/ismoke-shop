/**
 * יצירת PDF עם תמיכה מלאה בעברית
 * 
 * משתמש ב-dom-to-image-more לצילום טבלה מעוצבת ו-jsPDF להמרה ל-PDF
 * גישה זו שומרת על הפונטים העבריים בדיוק כפי שהם נראים במסך
 */

import { jsPDF } from 'jspdf';
import domtoimage from 'dom-to-image-more';

// ============================================================================
// Types
// ============================================================================

export interface PdfExportOptions {
  /** כותרת המסמך */
  title: string;
  /** תת-כותרת (אופציונלי) */
  subtitle?: string;
  /** כותרות העמודות */
  headers: { key: string; label: string }[];
  /** נתונים לייצוא */
  data: Record<string, unknown>[];
  /** שם הקובץ (ללא סיומת) */
  filename: string;
  /** תאריך הפקה (אופציונלי) */
  generatedDate?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * המרת ערך לטקסט לתצוגה
 */
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toLocaleString('he-IL');
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  return String(value);
};

/**
 * קבלת תאריך נוכחי בפורמט עברי
 */
const getCurrentDateHebrew = (): string => {
  return new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * יצירת אלמנט HTML זמני לטבלה - עמוד ספציפי
 * @param options - אפשרויות המקוריות
 * @param pageData - הנתונים לעמוד הנוכחי בלבד
 * @param isFirstPage - האם זה העמוד הראשון (להציג כותרת)
 * @param pageNum - מספר העמוד
 * @param totalPages - סה"כ עמודים
 */
const createPageElement = (
  options: PdfExportOptions, 
  pageData: Record<string, unknown>[],
  isFirstPage: boolean,
  pageNum: number,
  totalPages: number
): HTMLDivElement => {
  const { title, subtitle, headers, generatedDate } = options;
  
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 2400px;
    padding: 30px;
    background: #ffffff;
    font-family: Arial, sans-serif;
    direction: rtl;
  `;
  
  // כותרת - רק בעמוד הראשון
  const headerHtml = isFirstPage ? `
    <div style="margin-bottom: 20px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1e293b; font-weight: 700; font-family: inherit;">${title}</h1>
      ${subtitle ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; font-family: inherit;">${subtitle}</p>` : ''}
      <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: inherit;">הופק בתאריך: ${generatedDate || getCurrentDateHebrew()}</p>
    </div>
  ` : `
    <div style="margin-bottom: 10px;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-family: inherit;">${title} - עמוד ${pageNum} מתוך ${totalPages}</p>
    </div>
  `;
  
  container.innerHTML = `
    ${headerHtml}
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; font-family: inherit; table-layout: auto;">
      <thead>
        <tr>
          ${headers.map(h => {
            const narrowColumns = ['סטטוס הזמנה', 'מספר פריטים', 'עלות משלוח', 'סטטוס תשלום', 'מספר', 'כמות'];
            const isNarrow = narrowColumns.some(col => h.label.includes(col));
            const maxWidth = isNarrow ? '70px' : '150px';
            
            return `
            <th style="
              padding: 8px 6px;
              background: #f59e0b;
              color: #ffffff;
              text-align: right;
              font-weight: 600;
              border: 1px solid #e5e7eb;
              font-family: inherit;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
              max-width: ${maxWidth};
            ">${h.label}</th>
          `;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        ${pageData.map((row, i) => `
          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#fef3c7'};">
            ${headers.map(h => {
              const narrowColumns = ['סטטוס הזמנה', 'מספר פריטים', 'עלות משלוח', 'סטטוס תשלום', 'מספר', 'כמות'];
              const isNarrow = narrowColumns.some(col => h.label.includes(col));
              const maxWidth = isNarrow ? '70px' : '150px';
              
              return `
              <td style="
                padding: 8px 6px;
                text-align: right;
                border: 1px solid #e5e7eb;
                color: #374151;
                font-family: inherit;
                word-wrap: break-word;
                white-space: normal;
                overflow-wrap: break-word;
                line-height: 1.4;
                max-width: ${maxWidth};
              ">${formatCellValue(row[h.key])}</td>
            `;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${pageNum === totalPages ? `
      <div style="margin-top: 16px; font-size: 14px; color: #4b5563; font-weight: 600; font-family: inherit;">
        סה"כ רשומות: ${options.data.length.toLocaleString('he-IL')}
      </div>
    ` : ''}
  `;
  
  return container;
};

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * יצירת והורדת קובץ PDF עם טבלה בעברית
 * גישה חדשה: כל עמוד נוצר בנפרד עם שורות שלמות בלבד
 * 
 * @param options - אפשרויות היצוא
 */
export const exportToPdf = async (options: PdfExportOptions): Promise<void> => {
  const { filename, data } = options;

  // הגדרות
  const ROWS_PER_PAGE_FIRST = 12; // שורות בעמוד הראשון (עם כותרת)
  const ROWS_PER_PAGE = 14; // שורות בעמודים הבאים (ללא כותרת מלאה)
  
  // פיצול הנתונים לעמודים
  const pages: Record<string, unknown>[][] = [];
  let remainingData = [...data];
  
  // עמוד ראשון
  pages.push(remainingData.splice(0, ROWS_PER_PAGE_FIRST));
  
  // עמודים נוספים
  while (remainingData.length > 0) {
    pages.push(remainingData.splice(0, ROWS_PER_PAGE));
  }
  
  const totalPages = pages.length;

  // השתקת שגיאות CORS זמנית
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args[0]?.toString() || '';
    if (errorStr.includes('CSSStyleSheet') || 
        errorStr.includes('googleapis') ||
        errorStr.includes('cssRules')) {
      return;
    }
    originalError.apply(console, args);
  };

  try {
    // יצירת PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 297; // A4 landscape width in mm
    const margin = 10;
    const availableWidth = pdfWidth - (margin * 2);

    // עיבוד כל עמוד בנפרד
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        doc.addPage();
      }

      // יצירת HTML לעמוד הנוכחי בלבד
      const pageContainer = createPageElement(
        options, 
        pages[pageNum], 
        pageNum === 0, 
        pageNum + 1, 
        totalPages
      );
      document.body.appendChild(pageContainer);

      try {
        // המתנה קצרה לטעינת הפונטים
        await new Promise(resolve => setTimeout(resolve, 50));

        // צילום העמוד
        const dataUrl = await domtoimage.toPng(pageContainer, {
          quality: 1,
          bgcolor: '#ffffff',
          style: { fontFamily: 'Arial, sans-serif' }
        });

        // יצירת תמונה לחישוב מידות
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataUrl;
        });

        // חישוב מידות
        const pixelsPerMm = 3.78;
        const imgWidthMm = img.width / pixelsPerMm;
        const imgHeightMm = img.height / pixelsPerMm;
        const scale = availableWidth / imgWidthMm;
        const finalWidth = imgWidthMm * scale;
        const finalHeight = imgHeightMm * scale;

        // הוספת התמונה לעמוד
        doc.addImage(dataUrl, 'PNG', margin, margin, finalWidth, finalHeight);

      } finally {
        // ניקוי האלמנט הזמני
        document.body.removeChild(pageContainer);
      }
    }

    // הורדת הקובץ
    doc.save(`${filename}.pdf`);

  } finally {
    // החזרת console.error למצב המקורי
    console.error = originalError;
  }
};

/**
 * יצירת PDF לדוח מכירות
 */
export const exportSalesReportToPdf = async (
  data: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  periodLabel: string
): Promise<void> => {
  const formatDate = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
  };

  await exportToPdf({
    title: 'דוח מכירות',
    subtitle: `תקופה: ${periodLabel}`,
    headers,
    data,
    filename: `sales-report-${periodLabel}-${formatDate()}`
  });
};

/**
 * יצירת PDF לדוח מוצרים
 */
export const exportProductsReportToPdf = async (
  data: Record<string, unknown>[],
  headers: { key: string; label: string }[]
): Promise<void> => {
  const formatDate = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
  };

  await exportToPdf({
    title: 'דוח מוצרים נמכרים',
    subtitle: 'Top 50 המוצרים הנמכרים ביותר',
    headers,
    data,
    filename: `products-report-${formatDate()}`
  });
};

/**
 * יצירת PDF לדוח לקוחות
 */
export const exportCustomersReportToPdf = async (
  data: Record<string, unknown>[],
  headers: { key: string; label: string }[]
): Promise<void> => {
  const formatDate = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
  };

  await exportToPdf({
    title: 'דוח לקוחות',
    subtitle: 'רשימת כל הלקוחות הרשומים',
    headers,
    data,
    filename: `customers-report-${formatDate()}`
  });
};
