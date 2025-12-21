import Banner, { IBanner } from '../models/Banner';
import { uploadImage, deleteImage } from './imageService';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

// ============================================================================
// Banner Service - שכבת לוגיקה עסקית לניהול באנרים
// ============================================================================

/**
 * Class המרכז את כל הלוגיקה העסקית של באנרים
 * תומך ב-CRUD, Analytics, Reordering והעלאות תמונות
 */
export class BannerService {
  // ============================================================================
  // קבלת באנרים פעילים (לצד לקוח)
  // ============================================================================
  
  /**
   * מחזיר רק באנרים פעילים בטווח התאריכים הנוכחי
   * ממוין לפי order, ללא שדות analytics (אופטימיזציה)
   * @returns מערך באנרים ל-Hero Carousel
   */
  async getActiveBanners(): Promise<Partial<IBanner>[]> {
    try {
      const now = new Date();
      
      // שאילתה מותנית: רק באנרים פעילים בטווח תאריכים
      const query = {
        isActive: true,
        $or: [
          // ללא מגבלות תאריך
          { startDate: null, endDate: null },
          // תאריך התחלה עבר, אין תאריך סיום
          { startDate: { $lte: now }, endDate: null },
          // אין תאריך התחלה, תאריך סיום עתידי
          { startDate: null, endDate: { $gte: now } },
          // שניהם מוגדרים ובטווח
          { startDate: { $lte: now }, endDate: { $gte: now } },
        ],
      };

      // שליפה עם אופטימיזציה: lean() + הסרת שדות analytics
      const banners = await Banner.find(query)
        .select('-clickCount -impressionCount -version -__v') // הסתרת שדות פנימיים
        .sort({ order: 1 }) // מיון לפי סדר עולה
        .lean<Partial<IBanner>[]>(); // lean למהירות

      logger.info(`✅ נטענו ${banners.length} באנרים פעילים`);
      return banners;
    } catch (error) {
      logger.error('❌ שגיאה בשליפת באנרים פעילים:', error);
      throw new Error('Failed to fetch active banners');
    }
  }

  // ============================================================================
  // ניהול באנרים (Admin)
  // ============================================================================

  /**
   * מחזיר את כל הבאנרים (כולל לא פעילים) עם כל השדות
   * לשימוש בדף הניהול בלבד
   * @returns מערך כל הבאנרים
   */
  async getAllBanners(): Promise<IBanner[]> {
    try {
      const banners = await Banner.find()
        .sort({ order: 1, createdAt: -1 }) // סדר + תאריך יצירה
        .lean<IBanner[]>();

      logger.info(`📋 נטענו ${banners.length} באנרים (כולל לא פעילים)`);
      return banners;
    } catch (error) {
      logger.error('❌ שגיאה בשליפת כל הבאנרים:', error);
      throw new Error('Failed to fetch all banners');
    }
  }

  /**
   * יצירת באנר חדש
   * @param bannerData - נתוני הבאנר החדש
   * @returns הבאנר שנוצר
   */
  async createBanner(bannerData: Partial<IBanner>): Promise<IBanner> {
    try {
      // ולידציה בסיסית
      if (!bannerData.imageUrl || !bannerData.imagePublicId) {
        throw new Error('חסרים פרטי תמונה לבאנר');
      }

      const sanitizedTitle = (bannerData.title ?? '').trim();
      const sanitizedDescription = (bannerData.description ?? '').trim();

      // בדיקת כפילות (title + startDate) רק אם קיימת כותרת
      if (sanitizedTitle && bannerData.startDate) {
        const existing = await Banner.findOne({
          title: sanitizedTitle,
          startDate: bannerData.startDate,
        });

        if (existing) {
          throw new Error('קיים כבר באנר עם אותה כותרת ותאריך התחלה');
        }
      }

      // יצירת באנר חדש
      const banner = new Banner({
        ...bannerData,
        title: sanitizedTitle,
        description: sanitizedDescription,
      });
      await banner.save();

      logger.info(`✅ באנר חדש נוצר: ${banner.title} (ID: ${banner._id})`);
      return banner;
    } catch (error: any) {
      logger.error('❌ שגיאה ביצירת באנר:', error);
      
      // טיפול בשגיאות ולידציה של Mongoose
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e: any) => e.message);
        throw new Error(`שגיאות ולידציה: ${messages.join(', ')}`);
      }
      
      // טיפול בכפילות (unique index)
      if (error.code === 11000) {
        throw new Error('באנר עם כותרת ותאריך זהים כבר קיים במערכת');
      }

      throw error;
    }
  }

  /**
   * עדכון באנר קיים עם Optimistic Locking
   * @param id - מזהה הבאנר
   * @param updates - השדות לעדכון
   * @param expectedVersion - גרסה צפויה (למניעת התנגשויות)
   * @returns הבאנר המעודכן
   */
  async updateBanner(
    id: string,
    updates: Partial<IBanner>,
    expectedVersion?: number
  ): Promise<IBanner> {
    try {
      // ולידציה של ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('מזהה באנר לא תקין');
      }

      // בניית query עם גרסה (אם סופקה)
      const query: any = { _id: id };
      if (expectedVersion !== undefined) {
        query.version = expectedVersion;
      }

      const sanitizedUpdates: Partial<IBanner> = { ...updates };
      if (sanitizedUpdates.title !== undefined) {
        sanitizedUpdates.title = (sanitizedUpdates.title ?? '').trim();
      }
      if (sanitizedUpdates.description !== undefined) {
        sanitizedUpdates.description = (sanitizedUpdates.description ?? '').trim();
      }

      // בנה אובייקט $set רק עם שדות שהגיעו בפיילוד (מניעת איפוס שדות לא מכוון)
      const setFields: any = {};
      Object.entries(sanitizedUpdates).forEach(([key, value]) => {
        if (value !== undefined) setFields[key] = value;
      });

      if (Object.keys(setFields).length === 0) {
        throw new Error('אין שדות לעדכון');
      }

      // עדכון אטומי עם הגדלת גרסה
      const banner = await Banner.findOneAndUpdate(
        query,
        {
          $set: setFields,
          $inc: { version: 1 }, // הגדלת מונה גרסה
        },
        {
          new: true, // החזר את המסמך המעודכן
          runValidators: true, // הרץ ולידציות
        }
      );

      if (!banner) {
        if (expectedVersion !== undefined) {
          throw new Error('הבאנר שונה על ידי משתמש אחר. אנא רענן את הדף.');
        }
        throw new Error('באנר לא נמצא');
      }

      logger.info(`✅ באנר עודכן: ${banner.title} (ID: ${banner._id}, גרסה: ${banner.version})`);
      return banner;
    } catch (error: any) {
      logger.error('❌ שגיאה בעדכון באנר:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e: any) => e.message);
        throw new Error(`שגיאות ולידציה: ${messages.join(', ')}`);
      }

      throw error;
    }
  }

  /**
   * מחיקת באנר (כולל ניקוי Cloudinary)
   * @param id - מזהה הבאנר
   */
  async deleteBanner(id: string): Promise<void> {
    try {
      // ולידציה של ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('מזהה באנר לא תקין');
      }

      // מחיקה (ה-pre-delete hook ימחק את התמונה מ-Cloudinary)
      const result = await Banner.findByIdAndDelete(id);

      if (!result) {
        throw new Error('באנר לא נמצא');
      }

      logger.info(`🗑️ באנר נמחק: ${result.title} (ID: ${result._id})`);
    } catch (error) {
      logger.error('❌ שגיאה במחיקת באנר:', error);
      throw error;
    }
  }

  // ============================================================================
  // Analytics & Tracking
  // ============================================================================

  /**
   * הגדלת מונה צפיות (impression)
   * @param id - מזהה הבאנר
   */
  async incrementImpression(id: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('מזהה באנר לא תקין');
      }

      // עדכון אטומי של מונה
      const result = await Banner.findByIdAndUpdate(
        id,
        { $inc: { impressionCount: 1 } },
        { new: true }
      );

      if (!result) {
        throw new Error('באנר לא נמצא');
      }

      logger.debug(`👁️ צפייה נוספה לבאנר: ${result.title} (סה"כ: ${result.impressionCount})`);
    } catch (error) {
      logger.error('❌ שגיאה בעדכון מונה צפיות:', error);
      // לא זורקים שגיאה - tracking לא אמור להפריע לזרימה
    }
  }

  /**
   * הגדלת מונה קליקים (click)
   * @param id - מזהה הבאנר
   */
  async incrementClick(id: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('מזהה באנר לא תקין');
      }

      // עדכון אטומי של מונה
      const result = await Banner.findByIdAndUpdate(
        id,
        { $inc: { clickCount: 1 } },
        { new: true }
      );

      if (!result) {
        throw new Error('באנר לא נמצא');
      }

      logger.debug(`🖱️ קליק נוסף לבאנר: ${result.title} (סה"כ: ${result.clickCount})`);
    } catch (error) {
      logger.error('❌ שגיאה בעדכון מונה קליקים:', error);
      // לא זורקים שגיאה - tracking לא אמור להפריע לזרימה
    }
  }

  // ============================================================================
  // Reordering
  // ============================================================================

  /**
   * שינוי סדר באנרים
   * @param bannerIds - מערך IDs בסדר החדש הרצוי
   */
  async reorderBanners(bannerIds: string[]): Promise<void> {
    try {
      // ולידציה
      if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
        throw new Error('יש לספק מערך של מזהי באנרים');
      }

      // עדכון מקבילי של כל הבאנרים
      await Banner.bulkWrite(
        bannerIds.map((id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { order: index } },
          },
        }))
      );

      logger.info(`🔄 סדר הבאנרים עודכן (${bannerIds.length} באנרים)`);
    } catch (error) {
      logger.error('❌ שגיאה בשינוי סדר באנרים:', error);
      throw error;
    }
  }

  // ============================================================================
  // העלאת תמונות
  // ============================================================================

  /**
   * העלאת תמונת באנר ל-Cloudinary
   * @param buffer - תוכן הקובץ
   * @param bannerId - מזהה הבאנר (לארגון בתיקיות)
   * @returns אובייקט עם URL ו-public_id
   */
  async uploadBannerImage(
    buffer: Buffer,
    bannerId?: string
  ): Promise<{ url: string; publicId: string }> {
    try {
      // יצירת מבנה תיקיות היררכי: banners/YYYY/bannerId
      const year = new Date().getFullYear();
      const folder = bannerId 
        ? `banners/${year}/${bannerId}`
        : `banners/${year}/temp`;

      // העלאה עם טרנספורמציות
      const result = await uploadImage(buffer, folder);

      // Cloudinary מחזיר secure_url ו-public_id
      logger.info(`📤 תמונת באנר הועלתה: ${result.secure_url}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error('❌ שגיאה בהעלאת תמונת באנר:', error);
      throw new Error('Failed to upload banner image');
    }
  }

  /**
   * מחיקת תמונת באנר מ-Cloudinary (גיבוי למחיקה ידנית)
   * @param publicId - Cloudinary public_id
   */
  async deleteBannerImage(publicId: string): Promise<void> {
    try {
      await deleteImage(publicId);
      logger.info(`🗑️ תמונת באנר נמחקה מ-Cloudinary: ${publicId}`);
    } catch (error) {
      logger.error('❌ שגיאה במחיקת תמונת באנר מ-Cloudinary:', error);
      throw error;
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const bannerService = new BannerService();
