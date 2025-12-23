import cron from 'node-cron';
// ✅ permanentlyDeleteMarkedImages, detectBrokenImages, cleanupTempImages - הוסרו (לא נחוצים עם Spaces)

/**
 * Cron Jobs - מערכת ניקוי תמונות
 * כרגע מושבת - תיישם עתידי אם נדרש
 */
export const scheduleImageCleanup = () => {
  // ✅ כרגע ללא פעולות - מוכן לשימוש עתידי
  console.log('✅ Image cleanup system initialized (currently inactive)');
  
  // כאן ניתן להוסיף Cron jobs עתידיים אם נדרש
  // לדוגמה: ניקוי temp files מ-Spaces
};
