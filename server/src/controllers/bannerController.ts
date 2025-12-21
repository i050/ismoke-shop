import { Request, Response } from 'express';
import { bannerService } from '../services/bannerService';
import { logger } from '../utils/logger';

// פונקציית עזר לנרמול שדות תאריך שנשלחים ב-body
// ממירה מחרוזת ריקה / undefined -> null
// מוודאת שהפורמט תקין ומחזירה ISO string או null
function normalizeDateFields(payload: any) {
  const clone = { ...payload };
  const toIsoOrNull = (v: any) => {
    if (v === undefined || v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error('תאריך לא תקין');
    return d.toISOString();
  };

  if ('startDate' in clone) clone.startDate = toIsoOrNull(clone.startDate);
  if ('endDate' in clone) clone.endDate = toIsoOrNull(clone.endDate);
  return clone;
}

// פונקציית עזר לנרמול ולידציה של שדות צבע (titleColor, descriptionColor, ctaTextColor, ctaBackgroundColor)
// - אם השדה חסר/ריק -> נשמור null
// - אם קיימת מחרוזת, ננרמל ל-lowercase ונבדוק שהיא hex 6 תווים
// - במידה והקלט לא תקין נזרוק שגיאה שתיתפס כחזרה ללקוח עם 400
function normalizeColorFields(payload: any) {
  const clone = { ...payload };
  const colorFields = ['titleColor', 'descriptionColor', 'ctaTextColor', 'ctaBackgroundColor'];
  
  for (const field of colorFields) {
    if (!(field in clone)) continue;

    const v = clone[field];
    if (v === undefined || v === null || v === '') {
      clone[field] = null;
      continue;
    }

    if (typeof v !== 'string') {
      throw new Error(`${field} לא תקין`);
    }

    const hex = v.trim().toLowerCase();
    if (!/^#([0-9a-f]{6})$/.test(hex)) {
      throw new Error(`${field} לא תקין - יש לספק hex של 6 תווים, לדוגמה #ffffff`);
    }

    clone[field] = hex;
  }
  
  return clone;
}

// פונקציית עזר לנרמול ולידציה של שדות גודל פונטים
// מצפה לערך string מתוך רשימה מוגדרת או null
function normalizeFontSizeFields(payload: any) {
  const clone = { ...payload };
  const fontFields = ['titleFontSize', 'descriptionFontSize', 'ctaFontSize'];
  const allowedSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'];
  
  for (const field of fontFields) {
    if (!(field in clone)) continue;

    const v = clone[field];
    if (v === undefined || v === null || v === '') {
      clone[field] = null;
      continue;
    }

    if (typeof v !== 'string') {
      throw new Error(`${field} לא תקין`);
    }

    const normalized = v.trim().toLowerCase();
    if (!allowedSizes.includes(normalized)) {
      throw new Error(`${field} לא תקין - יש לבחור אחד מהערכים: ${allowedSizes.join(', ')}`);
    }

    clone[field] = normalized;
  }
  
  return clone;
}

// פונקציית עזר לנרמול ולידציה של שדה overlayOpacity
// מצפה לערך מספרי (0..100). אם הערך ריק או לא קיים - תשאיר את השדה כפי שהוא (ה-schemas יתחייבו לברירת מחדל)
function normalizeOverlayOpacity(payload: any) {
  const clone = { ...payload };
  if (!('overlayOpacity' in clone)) return clone;

  const v = clone.overlayOpacity;
  if (v === undefined || v === null || v === '') {
    // לא נשנה כאן; השדה יכול להיות מאופסן כברירת מחדל בסכימה
    clone.overlayOpacity = clone.overlayOpacity === '' ? null : clone.overlayOpacity;
    return clone;
  }

  const num = Number(v);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error('overlayOpacity לא תקין - יש לספק מספר בין 0 ל-100');
  }

  const rounded = Math.round(num);
  if (rounded < 0 || rounded > 100) {
    throw new Error('overlayOpacity חייב להיות בין 0 ל-100');
  }

  clone.overlayOpacity = rounded;
  return clone;
}

// ============================================================================
// Banner Controller - טיפול בבקשות HTTP לניהול באנרים
// ============================================================================

/**
 * GET /api/banners
 * קבלת באנרים פעילים (ציבורי)
 * מחזיר רק באנרים פעילים בטווח תאריכים נוכחי
 */
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const banners = await bannerService.getActiveBanners();
    
    res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-getActiveBanners:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת באנרים פעילים',
      error: error.message,
    });
  }
};

/**
 * GET /api/banners/all
 * קבלת כל הבאנרים (Admin בלבד)
 * כולל באנרים לא פעילים ושדות analytics
 */
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const banners = await bannerService.getAllBanners();
    
    res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-getAllBanners:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת כל הבאנרים',
      error: error.message,
    });
  }
};

/**
 * POST /api/banners
 * יצירת באנר חדש (Admin בלבד)
 */
export const createBanner = async (req: Request, res: Response) => {
  try {
    const bannerData = req.body;

    // נרמול שדות תאריך כדי לאפשר ערכים ריקים ולוודא פורמט תקין
    let normalizedData: any;
    try {
      normalizedData = normalizeDateFields(bannerData);
    } catch (err: any) {
      logger.warn('⚠️ תאריך לא תקין בבקשת יצירת באנר', { error: err.message, body: bannerData });
      return res.status(400).json({ success: false, message: 'תאריך לא תקין', error: err.message });
    }

    // נרמול ולידציה של שדות צבע (titleColor, descriptionColor, ctaTextColor, ctaBackgroundColor)
    try {
      normalizedData = normalizeColorFields(normalizedData);
    } catch (err: any) {
      logger.warn('⚠️ שדה צבע לא תקין בבקשת יצירת באנר', { error: err.message, body: bannerData });
      return res.status(400).json({ success: false, message: 'שדה צבע לא תקין', error: err.message });
    }

    // נרמול ולידציה של ערך overlayOpacity אם סופק
    try {
      normalizedData = normalizeOverlayOpacity(normalizedData);
    } catch (err: any) {
      logger.warn('⚠️ overlayOpacity לא תקין בבקשת יצירת באנר', { error: err.message, body: bannerData });
      return res.status(400).json({ success: false, message: 'overlayOpacity לא תקין', error: err.message });
    }

    // נרמול ולידציה של שדות גודל פונטים אם סופקו
    try {
      normalizedData = normalizeFontSizeFields(normalizedData);
    } catch (err: any) {
      logger.warn('⚠️ שדה גודל פונט לא תקין בבקשת יצירת באנר', { error: err.message, body: bannerData });
      return res.status(400).json({ success: false, message: 'שדה גודל פונט לא תקין', error: err.message });
    }

    // יצירת באנר
    const banner = await bannerService.createBanner(normalizedData);
    
    res.status(201).json({
      success: true,
      message: 'באנר נוצר בהצלחה',
      data: banner,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-createBanner:', error);
    
    // טיפול בשגיאות כפילות (409 Conflict)
    if (error.message.includes('כבר קיים')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'שגיאה ביצירת באנר',
      error: error.message,
    });
  }
};

/**
 * PUT /api/banners/:id
 * עדכון באנר קיים (Admin בלבד)
 */
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { expectedVersion } = req.query;
    
    // נרמול שדות תאריך לפני העדכון
    let normalizedUpdates: any;
    try {
      normalizedUpdates = normalizeDateFields(updates);
    } catch (err: any) {
      logger.warn('⚠️ תאריך לא תקין בבקשת עדכון באנר', { error: err.message, body: updates });
      return res.status(400).json({ success: false, message: 'תאריך לא תקין', error: err.message });
    }
    // נרמול ולידציה של שדות צבע בעדכון
    try {
      normalizedUpdates = normalizeColorFields(normalizedUpdates);
    } catch (err: any) {
      logger.warn('⚠️ שדה צבע לא תקין בבקשת עדכון באנר', { error: err.message, body: updates });
      return res.status(400).json({ success: false, message: 'שדה צבע לא תקין', error: err.message });
    }
    // נרמול ולידציה של ערך overlayOpacity אם סופק בעדכון
    try {
      normalizedUpdates = normalizeOverlayOpacity(normalizedUpdates);
    } catch (err: any) {
      logger.warn('⚠️ overlayOpacity לא תקין בבקשת עדכון באנר', { error: err.message, body: updates });
      return res.status(400).json({ success: false, message: 'overlayOpacity לא תקין', error: err.message });
    }

    // נרמול ולידציה של שדות גודל פונטים אם סופקו בעדכון
    try {
      normalizedUpdates = normalizeFontSizeFields(normalizedUpdates);
    } catch (err: any) {
      logger.warn('⚠️ שדה גודל פונט לא תקין בבקשת עדכון באנר', { error: err.message, body: updates });
      return res.status(400).json({ success: false, message: 'שדה גודל פונט לא תקין', error: err.message });
    }
    
    // עדכון עם optimistic locking
    const version = expectedVersion ? parseInt(expectedVersion as string) : undefined;
    const banner = await bannerService.updateBanner(id, normalizedUpdates, version);
    
    res.status(200).json({
      success: true,
      message: 'באנר עודכן בהצלחה',
      data: banner,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-updateBanner:', error);
    
    // טיפול בהתנגשות גרסאות (409 Conflict)
    if (error.message.includes('שונה על ידי משתמש אחר')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    
    // טיפול בבאנר לא נמצא
    if (error.message.includes('לא נמצא')) {
      return res.status(404).json({
        success: false,
        message: 'באנר לא נמצא',
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'שגיאה בעדכון באנר',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/banners/:id
 * מחיקת באנר (Admin בלבד)
 * כולל ניקוי אוטומטי של תמונה מ-Cloudinary
 */
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await bannerService.deleteBanner(id);
    
    res.status(200).json({
      success: true,
      message: 'באנר נמחק בהצלחה',
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-deleteBanner:', error);
    
    // טיפול בבאנר לא נמצא
    if (error.message.includes('לא נמצא')) {
      return res.status(404).json({
        success: false,
        message: 'באנר לא נמצא',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת באנר',
      error: error.message,
    });
  }
};

/**
 * POST /api/banners/:id/impression
 * הגדלת מונה צפיות (ציבורי עם rate limiting)
 */
export const trackImpression = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await bannerService.incrementImpression(id);
    
    res.status(200).json({
      success: true,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-trackImpression:', error);
    
    // לא מחזירים שגיאה קריטית - tracking לא אמור להפריע
    res.status(200).json({
      success: false,
      message: 'Tracking failed silently',
    });
  }
};

/**
 * POST /api/banners/:id/click
 * הגדלת מונה קליקים (ציבורי עם rate limiting)
 */
export const trackClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await bannerService.incrementClick(id);
    
    res.status(200).json({
      success: true,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-trackClick:', error);
    
    // לא מחזירים שגיאה קריטית - tracking לא אמור להפריע
    res.status(200).json({
      success: false,
      message: 'Tracking failed silently',
    });
  }
};

/**
 * PUT /api/banners/reorder
 * שינוי סדר באנרים (Admin בלבד)
 * מקבל מערך של IDs בסדר החדש
 */
export const reorderBanners = async (req: Request, res: Response) => {
  try {
    const { bannerIds } = req.body;
    
    // ולידציה
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({
        success: false,
        message: 'bannerIds חייב להיות מערך',
      });
    }
    
    await bannerService.reorderBanners(bannerIds);
    
    res.status(200).json({
      success: true,
      message: 'סדר הבאנרים עודכן בהצלחה',
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-reorderBanners:', error);
    
    res.status(400).json({
      success: false,
      message: 'שגיאה בשינוי סדר באנרים',
      error: error.message,
    });
  }
};

/**
 * POST /api/banners/upload
 * העלאת תמונת באנר (Admin בלבד)
 * מקבל קובץ דרך multipart/form-data
 */
export const uploadBannerImage = async (req: Request, res: Response) => {
  try {
    // הפקת הקובץ שהועלה (תמיכה גם ב-upload.single וגם ב-upload.array)
    const filesArray = Array.isArray((req as any).files)
      ? ((req as any).files as Express.Multer.File[])
      : undefined;
    const uploadedFile = req.file ?? filesArray?.[0];

    // בדיקה שקובץ הועלה
    if (!uploadedFile || !uploadedFile.buffer) {
      return res.status(400).json({
        success: false,
        message: 'לא הועלה קובץ תמונה',
      });
    }
    
    // קבלת bannerId אופציונלי מה-body
    const { bannerId } = req.body;
    
    // העלאה ל-Cloudinary
    const result = await bannerService.uploadBannerImage(
      uploadedFile.buffer,
      bannerId
    );
    
    res.status(200).json({
      success: true,
      message: 'תמונה הועלתה בהצלחה',
      data: result,
    });
  } catch (error: any) {
    logger.error('❌ שגיאה ב-uploadBannerImage:', error);
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בהעלאת תמונה',
      error: error.message,
    });
  }
};
