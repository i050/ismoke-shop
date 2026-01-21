import { Request, Response } from 'express';
import * as skuService from '../services/skuService';
import Counter from '../models/Counter';

/**
 * SKU Controller - טיפול בבקשות API עבור SKUs
 */

/**
 * קבלת מספרים סידוריים הבאים למספר SKUs
 * GET /api/skus/next-sequences?count=5
 */
export const getNextSequences = async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 1;
    
    // הגבלה למקסימום 100 בבקשה אחת
    if (count > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request more than 100 sequences at once'
      });
    }

    // קבלת מספרים סידוריים
    const sequences: number[] = [];
    for (let i = 0; i < count; i++) {
      const seq = await Counter.getNextSequence('sku_counter');
      sequences.push(seq);
    }

    res.json({
      success: true,
      data: { sequences }
    });
  } catch (error: any) {
    console.error('Error in getNextSequences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sequences',
      error: error.message
    });
  }
};

/**
 * קבלת פרטי SKU לפי קוד
 * GET /api/skus/:sku
 */
export const getSkuByCode = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;

    const skuDoc = await skuService.getSkuByCode(sku);

    if (!skuDoc) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found or inactive',
      });
    }

    res.json({
      success: true,
      data: skuDoc,
    });
  } catch (error: any) {
    console.error('Error in getSkuByCode:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch SKU',
    });
  }
};

/**
 * קבלת כל SKUs של מוצר
 * GET /api/products/:productId/skus
 */
export const getSkusByProductId = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    const skus = await skuService.getSkusByProductId(
      productId,
      includeInactive
    );

    res.json({
      success: true,
      count: skus.length,
      data: skus,
    });
  } catch (error: any) {
    console.error('Error in getSkusByProductId:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch SKUs',
    });
  }
};

/**
 * בדיקת זמינות SKU
 * GET /api/skus/:sku/availability?quantity=5
 */
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const quantity = parseInt(req.query.quantity as string) || 1;

    const isAvailable = await skuService.checkAvailability(sku, quantity);

    res.json({
      success: true,
      data: {
        sku,
        quantity,
        available: isAvailable,
      },
    });
  } catch (error: any) {
    console.error('Error in checkAvailability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check availability',
    });
  }
};

/**
 * יצירת SKU חדש (Admin)
 * POST /api/skus
 */
export const createSku = async (req: Request, res: Response) => {
  try {
    const skuData = req.body;

    // ולידציה בסיסית
    if (!skuData.sku || !skuData.productId || !skuData.name) {
      return res.status(400).json({
        success: false,
        message: 'SKU code, product ID, and name are required',
      });
    }

    const newSku = await skuService.createSku(skuData);

    res.status(201).json({
      success: true,
      message: 'SKU created successfully',
      data: newSku,
    });
  } catch (error: any) {
    console.error('Error in createSku:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create SKU',
    });
  }
};

/**
 * עדכון SKU (Admin)
 * PATCH /api/skus/:sku
 */
export const updateSku = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const updates = req.body;

    const updatedSku = await skuService.updateSku(sku, updates);

    if (!updatedSku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found',
      });
    }

    res.json({
      success: true,
      message: 'SKU updated successfully',
      data: updatedSku,
    });
  } catch (error: any) {
    console.error('Error in updateSku:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update SKU',
    });
  }
};

/**
 * עדכון מלאי SKU (Admin)
 * PATCH /api/skus/:sku/stock
 * Body: { delta: -5 } או { delta: 10 }
 */
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const { delta } = req.body;

    if (typeof delta !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Delta must be a number',
      });
    }

    const updatedSku = await skuService.updateStock(sku, delta);

    if (!updatedSku) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock or SKU not found',
      });
    }

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: updatedSku,
    });
  } catch (error: any) {
    console.error('Error in updateStock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update stock',
    });
  }
};

/**
 * מחיקת SKU (Admin)
 * DELETE /api/skus/:sku
 */
export const deleteSku = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const hardDelete = req.query.hard === 'true';

    let result;

    if (hardDelete) {
      // מחיקה קשה - שימוש בזהירות!
      result = await skuService.hardDeleteSku(sku);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'SKU not found',
        });
      }
    } else {
      // מחיקה רכה (ברירת מחדל)
      result = await skuService.softDeleteSku(sku);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'SKU not found',
        });
      }
    }

    res.json({
      success: true,
      message: hardDelete
        ? 'SKU deleted permanently'
        : 'SKU marked as inactive',
    });
  } catch (error: any) {
    console.error('Error in deleteSku:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete SKU',
    });
  }
};

/**
 * חיפוש SKUs
 * GET /api/skus/search?color=red&size=M&limit=20&skip=0
 */
export const searchSkus = async (req: Request, res: Response) => {
  try {
    const filters: any = {};
    const options: any = {
      limit: parseInt(req.query.limit as string) || 50,
      skip: parseInt(req.query.skip as string) || 0,
      sort: { sku: 1 },
    };

    // בניית פילטרים מ-query parameters
    if (req.query.productId) {
      filters.productId = req.query.productId;
    }

    if (req.query.minPrice) {
      filters.price = { $gte: parseFloat(req.query.minPrice as string) };
    }

    if (req.query.maxPrice) {
      filters.price = {
        ...filters.price,
        $lte: parseFloat(req.query.maxPrice as string),
      };
    }

    if (req.query.inStock === 'true') {
      filters.stockQuantity = { $gt: 0 };
    }

    // פילטר על color (שדה שטוח)
    if (req.query.color) {
      filters.color = req.query.color;
    }

    // פילטר על size (עבר להיות attributes.size)
    // ניצול המיפוי מה-middleware או fallback ישיר
    if ((req as any).mappedSizeFilter) {
      Object.assign(filters, (req as any).mappedSizeFilter);
    } else if (req.query.size) {
      filters['attributes.size'] = req.query.size;
    }

    const skus = await skuService.searchSkus(filters, options);
    const total = await skuService.countSkus(filters);

    res.json({
      success: true,
      count: skus.length,
      total,
      data: skus,
    });
  } catch (error: any) {
    console.error('Error in searchSkus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search SKUs',
    });
  }
};

/**
 * קבלת SKUs לניהול מלאי (Admin) - עם פגינציה, חיפוש ומיון
 * GET /api/skus/inventory?page=1&limit=50&search=xxx&sortBy=stockQuantity&sortOrder=asc&stockFilter=low
 */
export const getInventorySkus = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'sku';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const stockFilter = (req.query.stockFilter as 'all' | 'low' | 'out' | 'in') || 'all';

    const result = await skuService.getInventorySkus({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      stockFilter,
    });

    res.json({
      success: true,
      data: result.skus,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Error in getInventorySkus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory SKUs',
    });
  }
};

/**
 * עדכון כמות מלאי ישירה (Admin)
 * PUT /api/skus/:sku/stock-quantity
 * Body: { quantity: number }
 */
export const setStockQuantity = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative number',
      });
    }

    const updatedSku = await skuService.setStockQuantity(sku, quantity);

    if (!updatedSku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found',
      });
    }

    res.json({
      success: true,
      message: 'Stock quantity updated successfully',
      data: updatedSku,
    });
  } catch (error: any) {
    console.error('Error in setStockQuantity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set stock quantity',
    });
  }
};

/**
 * קבלת SKUs עם מלאי נמוך (Admin)
 * GET /api/skus/low-stock?threshold=5
 */
export const getLowStockSkus = async (req: Request, res: Response) => {
  try {
    const thresholdParam = req.query.threshold as string | undefined;
    const parsedThreshold = thresholdParam !== undefined ? Number(thresholdParam) : undefined;
    const effectiveThreshold =
      typeof parsedThreshold === 'number' && Number.isFinite(parsedThreshold) && parsedThreshold >= 0
        ? parsedThreshold
        : undefined;

    // אם לא התקבל threshold תקין משתמשים בסף של המוצר כפי שהוא מוגדר במסד הנתונים
    const skus = await skuService.getLowStockSkus(effectiveThreshold);

    res.json({
      success: true,
      count: skus.length,
      data: skus,
    });
  } catch (error: any) {
    console.error('Error in getLowStockSkus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch low stock SKUs',
    });
  }
};

/**
 * קבלת SKUs שאזל מלאיים (Admin)
 * GET /api/skus/out-of-stock
 */
export const getOutOfStockSkus = async (req: Request, res: Response) => {
  try {
    const skus = await skuService.getOutOfStockSkus();

    res.json({
      success: true,
      count: skus.length,
      data: skus,
    });
  } catch (error: any) {
    console.error('Error in getOutOfStockSkus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch out of stock SKUs',
    });
  }
};

/**
 * עדכון מלאי בצובר (Bulk Update) - Admin
 * POST /api/skus/bulk-update-stock
 * Body: { updates: [{ sku: 'SKU1', delta: -5 }, { sku: 'SKU2', delta: 10 }] }
 */
export const bulkUpdateStock = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
      });
    }

    const results = await skuService.bulkUpdateStock(updates);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `${successCount} updated, ${failCount} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error in bulkUpdateStock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk update stock',
    });
  }
};

/**
 * קבלת הזדמנויות שהוחמצו - מוצרים במלאי נמוך/אזל שנמצאים בסלי לקוחות
 * GET /api/skus/reports/missed-opportunities
 */
export const getMissedOpportunities = async (req: Request, res: Response) => {
  try {
    // ייבוא דינמי של cartService כדי למנוע circular dependency
    const cartService = (await import('../services/cartService')).default;
    const opportunities = await cartService.getMissedOpportunities();

    res.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error: any) {
    console.error('Error in getMissedOpportunities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch missed opportunities',
    });
  }
};

export default {
  getSkuByCode,
  getSkusByProductId,
  checkAvailability,
  createSku,
  updateSku,
  updateStock,
  deleteSku,
  searchSkus,
  getLowStockSkus,
  getOutOfStockSkus,
  bulkUpdateStock,
  getInventorySkus,
  setStockQuantity,
  getMissedOpportunities,
};
