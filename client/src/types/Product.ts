// ממשק לנתוני מחיר דינמיים שמגיעים מהשרת
export interface PricingData {
  productId: string;
  originalPrice: number;      // מחיר מקורי של המוצר
  finalPrice: number;         // מחיר סופי אחרי הנחה
  discountPercentage: number; // אחוז ההנחה שהוחל
  customerGroupName?: string; // שם קבוצת הלקוח (אם יש)
  hasDiscount: boolean;       // האם יש הנחה
}

// ✅ ממשק לתמונה עם DigitalOcean Spaces (3 גדלים מעובדים מראש)
export interface IImage {
  thumbnail: string;  // 200×200 WebP - לכרטיסי מוצר
  medium: string;     // 800×800 WebP - לתצוגה ראשית
  large: string;      // 1200×1200 WebP - לזום ותצוגה מוגדלת
  key: string;        // Base path ב-Spaces (לצורך מחיקה)
  format: string;     // 'webp'
  uploadedAt: string; // Date string מ-JSON
}

// ממשק למפרט טכני (Technical Specification)
// מאפשר להציג key-value דינמי בעמוד המוצר
export interface ISpecification {
  key: string;
  value: string;
}

// Phase 3.4: ממשק ל-SKU (מודל חדש)
// Base Price Override Pattern: price אופציונלי - אם null, משתמשים ב-Product.basePrice
// Flat Attributes: color כשדה שטוח, size עבר ל-attributes
export interface Sku {
  _id: string;
  sku: string; // קוד SKU ייחודי
  productId: string;
  name: string;
  price?: number | null; // אופציונלי - Base Price Override Pattern
  stockQuantity: number;
  // שדה שטוח (Flat Attribute)
  color?: string;
  // size עבר להיות מאפיין דינמי ב-attributes
  // תאימות לאחור - attributes מכיל מאפיינים דינמיים
  attributes?: {
    size?: string;
    material?: string;
    [key: string]: string | undefined;
  };
  images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {// זה הטייפ של מוצר
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
  quantityInStock: number;
  sku?: string; // קוד SKU ברמת מוצר (לא SKU מרובים)
  trackInventory?: boolean; // האם לעקוב אחרי מלאי
  lowStockThreshold?: number; // רף אזהרה למלאי נמוך
  attributes: Array<{ key: string; value: string }>;
  specifications?: ISpecification[]; // מפרט טכני - key/value דינמי
  categoryId?: string;
  isActive: boolean;
  viewCount: number;// מספר צפיות במוצר
  salesCount: number;// מספר מכירות של המוצר
  variants?: Array<{ // גרסאות מוצר לצבעים/גדלים וכו' (ישן - לתקופת מעבר)
    name: string;
    priceModifier: number;
    stockQuantity: number;
    sku?: string;
    images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
    attributes: {
      color?: string;
      size?: string;
      material?: string;
    };
  }>;
  skus?: Sku[]; // Phase 3.4: SKUs מה-SKU Collection (חדש)
  pricing?: PricingData; // נתוני מחיר מותאמים אישית (מהשרת החדש)
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateRequest {// כשאנחנו רוצים ליצור מוצר חדש
  name: string;
  description: string;
  basePrice: number;
  images?: string[];
  quantityInStock: number;
  attributes?: Array<{ key: string; value: string }>;
  categoryId?: string;
  isActive?: boolean;
}

export interface ProductUpdateRequest {// כשאנחנו רוצים לעדכן מוצר קיים
  name?: string;
  description?: string;
  basePrice?: number;
  images?: string[];
  quantityInStock?: number;
  attributes?: Array<{ key: string; value: string }>;
  categoryId?: string;
  isActive?: boolean;
}
// בקובץ הזה אנחנו מגדירים את הטייפים של המוצרים
// זה עוזר לנו לדעת איך נראה מוצר ואילו שדות יש לו
