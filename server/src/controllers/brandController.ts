/**
 * 🏷️ Brand Controller
 * 
 * מטרה: ניהול מותגים - CRUD פשוט
 * מותג = שם בלבד (פשוט וישיר)
 */

import { Request, Response, NextFunction } from 'express';
import Brand from '../models/Brand';
import * as brandService from '../services/brandService';

// ============================================================================
// GET /api/brands - קבלת כל המותגים
// ============================================================================

export const getAllBrands = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // פרמטרים אופציונליים לסינון
    const { activeOnly } = req.query;
    
    // בניית query
    const query: any = {};
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    // שליפת מותגים ממוינים לפי שם
    const brands = await Brand.find(query).sort({ name: 1 }).lean();
    
    res.status(200).json({
      success: true,
      data: brands,
      count: brands.length,
    });
  } catch (error) {
    console.error('❌ שגיאה בטעינת מותגים:', error);
    next(error);
  }
};

// ============================================================================
// GET /api/brands/for-select - מותגים לדרופדאון (שם בלבד)
// ============================================================================

export const getBrandsForSelect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // שליפת מותגים פעילים בלבד, רק שדות נחוצים
    const brands = await Brand.find({ isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();
    
    res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error('❌ שגיאה בטעינת מותגים לבחירה:', error);
    next(error);
  }
};

// ============================================================================
// POST /api/brands - יצירת מותג חדש
// ============================================================================

export const createBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    
    console.log('\n🔍 === DEBUG: createBrand נקרא ===');
    console.log('📥 name מהבקשה:', JSON.stringify(name));
    console.log('📏 name.trim():', JSON.stringify(name?.trim()));
    console.log('📏 אורך:', name?.trim()?.length);
    
    // וולידציה בסיסית
    if (typeof name !== 'string' || name.trim().length < 2) {
      console.log('❌ VALIDATION FAILED: שם קצר מדי');
      res.status(400).json({
        success: false,
        message: 'שם המותג חייב להכיל לפחות 2 תווים',
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: 'שם המותג לא יכול להכיל יותר מ-100 תווים',
      });
      return;
    }
    
    // בדיקת כפילות case-insensitive - הדרך המקצועית עם collation
    console.log('🔍 מחפש מותג קיים עם collation...');
    const existingBrand = await Brand.findOne({ name: name.trim() })
      .collation(brandService.BRAND_COLLATION); // strength: 2 = case-insensitive
    
    console.log('📊 תוצאת חיפוש:', existingBrand ? `נמצא: "${existingBrand.name}"` : 'לא נמצא');
    
    if (existingBrand) {
      console.log(`❌ DUPLICATE FOUND: "${existingBrand.name}" (ID: ${existingBrand._id})`);
      res.status(400).json({
        success: false,
        message: `מותג בשם "${name}" כבר קיים`,
      });
      return;
    }
    
    // יצירת המותג
    console.log('✅ לא נמצא כפילות, יוצר מותג חדש...');
    const brand = await Brand.create({
      name: name.trim(),
      isActive: true,
    });
    
    console.log('✅ מותג נוצר בהצלחה:', brand.name, `(ID: ${brand._id})`);
    
    res.status(201).json({
      success: true,
      data: brand,
      message: `מותג "${brand.name}" נוצר בהצלחה`,
    });
  } catch (error: any) {
    console.log('💥 EXCEPTION בעת יצירת מותג:', error);
    // טיפול בשגיאת unique index (אם בכל זאת נפלה דרך הרשת)
    if (error.code === 11000) {
      console.log('❌ MongoDB UNIQUE INDEX ERROR (11000)');
      res.status(400).json({
        success: false,
        message: 'מותג בשם זה כבר קיים',
      });
      return;
    }

    if (error?.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    console.error('❌ שגיאה ביצירת מותג:', error);
    next(error);
  }
};

// ============================================================================
// PUT /api/brands/:id - עדכון מותג
// ============================================================================

export const updateBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, isActive, expectedUpdatedAt } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      res.status(400).json({
        success: false,
        message: 'שם המותג חייב להכיל לפחות 2 תווים',
      });
      return;
    }

    if (name !== undefined && name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: 'שם המותג לא יכול להכיל יותר מ-100 תווים',
      });
      return;
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'סטטוס המותג חייב להיות ערך בוליאני',
      });
      return;
    }

    if (
      expectedUpdatedAt !== undefined &&
      (
        typeof expectedUpdatedAt !== 'string' ||
        expectedUpdatedAt.trim() === '' ||
        Number.isNaN(new Date(expectedUpdatedAt).getTime())
      )
    ) {
      res.status(400).json({
        success: false,
        message: 'גרסת המותג שנשלחה אינה תקינה',
      });
      return;
    }

    const brand = await brandService.updateBrandAndProductReferences(id, {
      name,
      isActive,
      expectedUpdatedAt,
    });

    if (!brand) {
      res.status(404).json({
        success: false,
        message: 'מותג לא נמצא',
      });
      return;
    }
    
    console.log('✅ מותג עודכן:', brand.name);
    
    res.status(200).json({
      success: true,
      data: brand,
      message: `מותג "${brand.name}" עודכן בהצלחה`,
    });
  } catch (error: any) {
    if (error instanceof brandService.DuplicateBrandError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error instanceof brandService.StaleBrandUpdateError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('❌ שגיאה בעדכון מותג:', error);
    next(error);
  }
};

// ============================================================================
// DELETE /api/brands/:id - מחיקת מותג
// ============================================================================

export const deleteBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const brand = await brandService.deleteBrandIfUnused(id);
    if (!brand) {
      res.status(404).json({
        success: false,
        message: 'מותג לא נמצא',
      });
      return;
    }
    
    console.log('✅ מותג נמחק:', brand.name);
    
    res.status(200).json({
      success: true,
      message: `מותג "${brand.name}" נמחק בהצלחה`,
    });
  } catch (error: any) {
    if (error instanceof brandService.BrandInUseError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        usageCount: error.usageCount,
      });
      return;
    }

    if (error?.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'מזהה מותג לא תקין',
      });
      return;
    }

    console.error('❌ שגיאה במחיקת מותג:', error);
    next(error);
  }
};

// ============================================================================
// GET /api/brands/:id/usage - כמות מוצרים שמשתמשים במותג
// ============================================================================

export const getBrandUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const brand = await Brand.findById(id);
    if (!brand) {
      res.status(404).json({
        success: false,
        message: 'מותג לא נמצא',
      });
      return;
    }
    
    const usageCount = await brandService.countProductsUsingBrand(brand.name);
    
    res.status(200).json({
      success: true,
      data: {
        brandId: id,
        brandName: brand.name,
        usageCount,
      },
    });
  } catch (error: any) {
    if (error?.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'מזהה מותג לא תקין',
      });
      return;
    }

    console.error('❌ שגיאה בבדיקת שימוש במותג:', error);
    next(error);
  }
};
