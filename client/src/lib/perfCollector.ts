// חיבור קל לניטור ביצועים יסודי בצד הלקוח
// מטרת הקובץ: לאסוף מדידות performance.mark/measure ולשחררן
// ל-console בזמן פיתוח, ובאופן אופציונלי לשלוח ל-endpoint חיצוני אם מוגדר.
// הערות בעברית נדרשות על פי הנחיות הפרויקט.

/* eslint-disable no-console */
export async function collectPerfMeasure(perfId: string, info?: Record<string, any>) {
  try {
    // סמן סיום המדידה (אם קיימת התחלה)
    try {
      performance.mark(`${perfId}:end`);
      performance.measure(perfId, `${perfId}:start`, `${perfId}:end`);
    } catch (e) {
      // יתכן שאין API בסביבת בדיקה - מתעלמים
    }

    // קרא את המדידות שהתקבלו
    let duration: number | null = null;
    try {
      const measures = performance.getEntriesByName(perfId);
      if (measures && measures.length > 0) {
        // קח את המדידה הראשונה (הרלוונטית)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        duration = (measures[0] as any).duration ?? null;
      }
    } catch (e) {
      // מתעלמים אם ה-API לא זמין
    }

    const payload = {
      id: perfId,
      duration,
      info: info || {},
      ts: Date.now(),
    };

    // אם בשלב פיתוח ובדגל מפורש – נדפיס לפלט הדיבאג
    const enableDevLog = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PERF_LOGGING === 'true';
    if (enableDevLog) {
      // eslint-disable-next-line no-console
      console.debug('[perfCollector] measure', payload);
    }

    // אם יש הגדרה לכתובת יצוא, נשלח POST ל־URL זה (אופציונלי)
    const exportUrl = import.meta.env.VITE_PERF_EXPORT_URL;
    if (exportUrl && typeof fetch !== 'undefined') {
      try {
        // ניסיון לשלוח נתונים ל-backend/analytics קל
        await fetch(String(exportUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        if (enableDevLog) {
          // eslint-disable-next-line no-console
          console.debug('[perfCollector] export failed', e);
        }
      }
    }

    // נקה את המדידות שנוצרו כדי לא לצבור זיכרון
    try {
      performance.clearMarks(`${perfId}:start`);
      performance.clearMarks(`${perfId}:end`);
      performance.clearMeasures(perfId);
    } catch (e) {
      // ignore
    }
  } catch (err) {
    // הגנה כללית – אף קריאה לא תזרוק שגיאה החוצה
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[perfCollector] unexpected error', err);
    }
  }
}

export default collectPerfMeasure;
