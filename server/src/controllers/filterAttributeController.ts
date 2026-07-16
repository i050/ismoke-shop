import { Request, Response } from 'express';
import * as filterAttributeService from '../services/filterAttributeService';

/**
 * GET /api/filter-attributes
 * קבלת כל המאפיינים (למנהל)
 */
export const getAllAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await filterAttributeService.getAllAttributes();

    res.json({
      success: true,
      count: attributes.length,
      data: attributes,
    });
  } catch (error: any) {
    console.error('❌ Error in getAllAttributes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attributes',
    });
  }
};

/**
 * GET /api/filter-attributes/for-filter
 * קבלת מאפיינים לסינון (לחזית) - רק אלו שיש להם מוצרים
 */
export const getAttributesForFilter = async (req: Request, res: Response) => {
  try {
    const attributes = await filterAttributeService.getAttributesForFilter();

    res.json({
      success: true,
      count: attributes.length,
      data: attributes,
    });
  } catch (error: any) {
    console.error('❌ Error in getAttributesForFilter:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch filter attributes',
    });
  }
};

/**
 * 🆕 GET /api/filter-attributes/color-families
 * קבלת כל משפחות הצבעים האפשריות (לממשק ניהול)
 * מחזיר רק משפחות - לא variants
 */
export const getColorFamiliesForAdmin = async (req: Request, res: Response) => {
  try {
    const colorFamilies = await filterAttributeService.getColorFamiliesForAdmin();

    res.json({
      success: true,
      count: colorFamilies.length,
      data: colorFamilies,
    });
  } catch (error: any) {
    console.error('❌ Error in getColorFamiliesForAdmin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch color families',
    });
  }
};

/**
 * POST /api/filter-attributes
 * יצירת מאפיין חדש (Admin)
 */
export const createAttribute = async (req: Request, res: Response) => {
  try {
    console.log('📥 Received body:', JSON.stringify(req.body, null, 2));
    console.log('📥 values type:', typeof req.body.values, Array.isArray(req.body.values));
    
    const attribute = await filterAttributeService.createAttribute(req.body);

    res.status(201).json({
      success: true,
      message: 'Attribute created successfully',
      data: attribute,
    });
  } catch (error: any) {
    console.error('❌ Error in createAttribute:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create attribute',
    });
  }
};

/**
 * PUT /api/filter-attributes/:id
 * עדכון מאפיין (Admin)
 */
export const updateAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attribute = await filterAttributeService.updateAttribute(id, req.body);

    res.json({
      success: true,
      message: 'Attribute updated successfully',
      data: attribute,
    });
  } catch (error: any) {
    console.error('❌ Error in updateAttribute:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attribute',
    });
  }
};

/**
 * DELETE /api/filter-attributes/:id
 * מחיקת מאפיין (Admin) - רק אם לא בשימוש
 */
export const deleteAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await filterAttributeService.deleteAttribute(id);

    res.json({
      success: true,
      message: 'Attribute deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error in deleteAttribute:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attribute',
    });
  }
};

/**
 * GET /api/filter-attributes/:id/usage
 * קבלת כמות השימוש של מאפיין (Admin)
 */
export const getAttributeUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await filterAttributeService.getAttributeUsageCount(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error in getAttributeUsage:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get attribute usage',
    });
  }
};

/**
 * POST /api/filter-attributes/:id/remove-from-skus
 * הסרת מאפיין מכל ה-SKUs (Admin) - לפני מחיקה
 */
export const removeAttributeFromSkus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await filterAttributeService.removeAttributeFromAllSkus(id);

    res.json({
      success: true,
      message: `Attribute "${result.attributeName}" removed from ${result.modifiedCount} SKU(s)`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error in removeAttributeFromSkus:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove attribute from SKUs',
    });
  }
};

// ============================================================================
// 🆕 ניהול גוונים בתוך משפחות צבע
// ============================================================================

/**
 * POST /api/filter-attributes/color-families/:family/variants
 * הוספת גוון למשפחת צבע (Admin)
 */
export const addColorVariant = async (req: Request, res: Response) => {
  try {
    const { family } = req.params;
    const { name, hex } = req.body;

    if (!name || !hex) {
      return res.status(400).json({ success: false, message: 'name ו-hex הם שדות חובה' });
    }

    await filterAttributeService.addColorVariant(family, name, hex);

    res.status(201).json({ success: true, message: `גוון "${name}" נוסף בהצלחה למשפחת "${family}"` });
  } catch (error: any) {
    console.error('❌ Error in addColorVariant:', error);
    const status = error.message.includes('כבר קיים') ? 409 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/filter-attributes/color-families/:family/variants/:variantName
 * עריכת גוון (Admin)
 */
export const updateColorVariant = async (req: Request, res: Response) => {
  try {
    const { family, variantName } = req.params;
    await filterAttributeService.updateColorVariant(family, variantName, req.body);
    res.json({ success: true, message: 'הגוון עודכן בהצלחה' });
  } catch (error: any) {
    console.error('❌ Error in updateColorVariant:', error);
    const status = error.message.includes('לא נמצא')
      ? 404
      : error.message.includes('כבר קיים')
        ? 409
        : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/filter-attributes/color-families/:family/variants/:variantName
 * מחיקת גוון (Admin)
 */
export const deleteColorVariant = async (req: Request, res: Response) => {
  try {
    const result = await filterAttributeService.deleteColorVariant(req.params.family, req.params.variantName);
    res.json({
      success: true,
      message: `הגוון "${req.params.variantName}" נמחק בהצלחה`,
      usageCount: result.usageCount,
    });
  } catch (error: any) {
    console.error('❌ Error in deleteColorVariant:', error);
    const status = error.message.includes('לא נמצא') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/filter-attributes/color-families/:family/variants/:variantName/usage
 * בדיקת שימוש בגוון (Admin)
 */
export const getColorVariantUsage = async (req: Request, res: Response) => {
  try {
    const count = await filterAttributeService.getColorVariantUsage(req.params.family, req.params.variantName);
    res.json({ success: true, usageCount: count });
  } catch (error: any) {
    console.error('❌ Error in getColorVariantUsage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
