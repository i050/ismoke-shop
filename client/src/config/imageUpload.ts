/**
 * הגדרות העלאת תמונות בצד הלקוח.
 * שומרות על יישור מול השרת ומרכזות את מגבלת הגודל במקום אחד.
 */

const DEFAULT_PRODUCT_IMAGE_MAX_FILE_SIZE_MB = 60;

// קריאת משתנה סביבה מהלקוח עם נפילה בטוחה לברירת מחדל.
const parsedProductImageMaxFileSizeMb = Number.parseInt(
  import.meta.env.VITE_PRODUCT_IMAGE_MAX_FILE_SIZE_MB || `${DEFAULT_PRODUCT_IMAGE_MAX_FILE_SIZE_MB}`,
  10
);

// הגנה מערכים לא חוקיים כדי לא לשבור את מנגנון ההעלאה.
export const PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_MB =
  Number.isFinite(parsedProductImageMaxFileSizeMb) && parsedProductImageMaxFileSizeMb > 0
    ? parsedProductImageMaxFileSizeMb
    : DEFAULT_PRODUCT_IMAGE_MAX_FILE_SIZE_MB;

// הערך בבתים משמש ישירות את רכיבי ה-dropzone.
export const PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES =
  PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;