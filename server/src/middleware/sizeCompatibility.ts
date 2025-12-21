/**
 * Middleware למיפוי size compatibility
 * ממיר size ברמה עליונה ל-attributes.size
 * מאפשר ללקוחות ישנים להמשיך לשלוח size בטופ-לבל
 */

import { Request, Response, NextFunction } from 'express';

/**
 * ממיר req.body.size -> req.body.attributes.size
 * שומר על תאימות לאחור עם API ישן
 */
export function mapSizeToAttributes(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // אם יש size בבקשה וזה POST/PUT/PATCH
  if (req.body && req.body.size !== undefined) {
    console.log(`[Size Compatibility] Mapping size="${req.body.size}" to attributes.size`);
    
    // יצירת attributes אם לא קיים
    if (!req.body.attributes) {
      req.body.attributes = {};
    }
    
    // העברת size ל-attributes (רק אם לא קיים שם כבר)
    if (!req.body.attributes.size) {
      req.body.attributes.size = req.body.size;
    }
    
    // הסרת size מהרמה העליונה
    delete req.body.size;
  }
  
  // טיפול ב-SKUs array (במקרה של יצירת/עדכון מוצר עם SKUs)
  if (req.body && req.body.skus && Array.isArray(req.body.skus)) {
    req.body.skus = req.body.skus.map((sku: any) => {
      if (sku.size !== undefined) {
        if (!sku.attributes) sku.attributes = {};
        if (!sku.attributes.size) {
          sku.attributes.size = sku.size;
        }
        delete sku.size;
      }
      return sku;
    });
  }
  
  next();
}

/**
 * ממיר query parameter ?size=M -> filter['attributes.size']
 * שומר על תאימות לאחור עם חיפושים ישנים
 */
export function mapSizeQueryParam(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.query.size) {
    console.log(`[Size Compatibility] Mapping query size="${req.query.size}" to attributes.size`);
    // נשמור את זה ב-req object לשימוש ב-controller
    (req as any).mappedSizeFilter = { 'attributes.size': req.query.size };
  }
  next();
}
