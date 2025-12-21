import { Request, Response } from 'express';
import adminWarningsService from '../services/adminWarningsService';

/**
 * Controller לניהול התראות אי-עקביות במוצרים
 * מיועד למנהלי מערכת בלבד
 */

/**
 * GET /api/admin/warnings/inconsistencies
 * קבלת רשימת מוצרים עם אי-עקביות ב-SKU attributes
 * 
 * מחזיר: רשימה ממוינת של מוצרים עם תיאור הבעיות
 */
export const getInconsistentProducts = async (req: Request, res: Response) => {
  try {
    console.log('📊 בקשה לקבלת התראות אי-עקביות במוצרים');

    const warnings = await adminWarningsService.getInconsistentProducts();

    console.log(`✅ נמצאו ${warnings.length} מוצרים עם אי-עקביות`);

    res.json({
      success: true,
      count: warnings.length,
      warnings,
    });
  } catch (error: any) {
    console.error('❌ שגיאה בקבלת התראות אי-עקביות:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת התראות',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/warnings/ignore
 * הוספת/עדכון התעלמות עבור מוצר
 * 
 * Body: { productId: string, ignoreType: 'forever' | 'snooze' }
 */
export const setIgnore = async (req: Request, res: Response) => {
  try {
    const { productId, ignoreType } = req.body;

    // ולידציה בסיסית
    if (!productId || !ignoreType) {
      return res.status(400).json({
        success: false,
        message: 'חסרים פרמטרים נדרשים: productId, ignoreType',
      });
    }

    if (!['forever', 'snooze'].includes(ignoreType)) {
      return res.status(400).json({
        success: false,
        message: 'ignoreType חייב להיות forever או snooze',
      });
    }

    console.log(`🔕 הגדרת התעלמות למוצר ${productId} (${ignoreType})`);

    await adminWarningsService.setIgnore(productId, ignoreType);

    res.json({
      success: true,
      message: 'התעלמות נשמרה בהצלחה',
    });
  } catch (error: any) {
    console.error('❌ שגיאה בשמירת התעלמות:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת התעלמות',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/warnings/ignore/:productId
 * הסרת התעלמות (ביטול ignore/snooze)
 */
export const removeIgnore = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'חסר productId',
      });
    }

    console.log(`🔔 הסרת התעלמות למוצר ${productId}`);

    await adminWarningsService.removeIgnore(productId);

    res.json({
      success: true,
      message: 'התעלמות הוסרה בהצלחה',
    });
  } catch (error: any) {
    console.error('❌ שגיאה בהסרת התעלמות:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהסרת התעלמות',
      error: error.message,
    });
  }
};
