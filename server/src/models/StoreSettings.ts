/**
 * מודל הגדרות החנות - Store Settings Model
 * 
 * שומר הגדרות גלובליות של החנות במסד הנתונים
 * משתמש בפטרן Singleton - רק רשומה אחת
 * 
 * @module models/StoreSettings
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * הגדרות הזמנות
 */
export interface IOrderSettings {
  allowUnpaidOrders: boolean;     // אפשר הזמנות ללא תשלום מיידי
  disablePayment: boolean;         // כיבוי אפשרות התשלום - רק הזמנות ללא תשלום
  requirePhoneVerification: boolean; // דרוש אימות טלפון
  minOrderAmount: number;          // סכום מינימום להזמנה
  maxItemsPerOrder: number;        // מקסימום פריטים בהזמנה
}

/**
 * הגדרות משתמשים והרשמה
 */
export interface IUserSettings {
  requireRegistrationApproval: boolean; // דרוש אישור מנהל להרשמה
  requireLoginOTP: boolean;              // דרוש קוד OTP במייל בכל התחברות
}

/**
 * הגדרות משלוח
 */
export interface IShippingSettings {
  freeShippingThreshold: number;   // סכום למשלוח חינם
  defaultShippingCost: number;     // עלות משלוח ברירת מחדל
  enablePickup: boolean;           // אפשר איסוף מהחנות
}

/**
 * הגדרות תשלום
 */
export interface IPaymentSettings {
  enableCreditCard: boolean;       // אפשר כרטיס אשראי
  enablePaypal: boolean;           // אפשר PayPal
  enableBankTransfer: boolean;     // אפשר העברה בנקאית
  enableCash: boolean;             // אפשר מזומן (בעת איסוף)
}

/**
 * הגדרות מצב תחזוקה (Maintenance Mode)
 * כאשר מופעל - רק משתמשים מורשים יכולים לגשת לאתר
 */
export interface IMaintenanceSettings {
  enabled: boolean;                // האם מצב תחזוקה מופעל
  message: string;                 // הודעה מותאמת אישית למבקרים
  allowedRoles: ('admin' | 'super_admin' | 'customer')[]; // תפקידים מורשים לגשת
}

/**
 * הגדרות מלאי
 */
export interface IInventorySettings {
  defaultLowStockThreshold: number; // סף ברירת מחדל למלאי נמוך
}

/**
 * הגדרות התראות למנהל
 * שליחת מיילים אוטומטיים למנהלים בעת אירועים חשובים
 */
export interface INotificationSettings {
  adminNewOrderEmails: string[];  // כתובות מייל לקבלת התראה על הזמנה חדשה
}

/**
 * הגדרות הנחת סף (Threshold Discount)
 * הנחה אוטומטית כשהזמנה עוברת סכום מסוים
 */
export interface IThresholdDiscountSettings {
  enabled: boolean;              // האם ההנחה מופעלת
  minimumAmount: number;         // סכום מינימום להזמנה (לדוגמה: 500)
  discountPercentage: number;    // אחוז הנחה (לדוגמה: 10)
}

/**
 * חלק במדיניות משלוח/החזרות/אחריות
 */
export interface IShippingPolicySection {
  enabled: boolean;    // האם להציג חלק זה
  title: string;       // כותרת (משלוח/החזרות/אחריות)
  icon: string;        // שם האייקון
  items: string[];     // רשימת הפריטים (טקסטים)
}

/**
 * מדיניות משלוח והחזרות - מוצגת בטאב בעמוד המוצר
 */
export interface IShippingPolicySettings {
  shipping: IShippingPolicySection;
  returns: IShippingPolicySection;
  warranty: IShippingPolicySection;
}

/** * הגדרות ממשק משתמש (UI)
 */
export interface IUISettings {
  showCartTotalInHeader: boolean;  // הצגת מחיר כולל ליד אייקון העגלה
}

/** * ממשק מסמך הגדרות
 */
export interface IStoreSettings extends Document {
  orders: IOrderSettings;
  users: IUserSettings;
  shipping: IShippingSettings;
  payment: IPaymentSettings;
  maintenance: IMaintenanceSettings;
  inventory: IInventorySettings;
  notifications: INotificationSettings;                // הגדרות התראות למנהל
  thresholdDiscount: IThresholdDiscountSettings; // הנחת סף
  shippingPolicy: IShippingPolicySettings;       // מדיניות משלוח והחזרות
  ui: IUISettings;                               // הגדרות ממשק משתמש
  updatedAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
}

// ============================================================================
// Schema
// ============================================================================

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    orders: {
      allowUnpaidOrders: {
        type: Boolean,
        default: false
      },
      disablePayment: {
        type: Boolean,
        default: false
      },
      requirePhoneVerification: {
        type: Boolean,
        default: false
      },
      minOrderAmount: {
        type: Number,
        default: 0
      },
      maxItemsPerOrder: {
        type: Number,
        default: 50
      }
    },
    
    users: {
      requireRegistrationApproval: {
        type: Boolean,
        default: false
      },
      requireLoginOTP: {
        type: Boolean,
        default: false
      }
    },
    
    shipping: {
      freeShippingThreshold: {
        type: Number,
        default: 200
      },
      defaultShippingCost: {
        type: Number,
        default: 30
      },
      enablePickup: {
        type: Boolean,
        default: true
      }
    },
    
    payment: {
      enableCreditCard: {
        type: Boolean,
        default: true
      },
      enablePaypal: {
        type: Boolean,
        default: false
      },
      enableBankTransfer: {
        type: Boolean,
        default: false
      },
      enableCash: {
        type: Boolean,
        default: true
      }
    },
    
    // הגדרות מצב פרטי
    maintenance: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: {
        type: String,
        default: ''
      },
      allowedRoles: {
        type: [String],
        enum: ['admin', 'super_admin', 'customer'],
        default: ['admin', 'super_admin', 'customer']
      }
    },
    
    // הגדרות מלאי
    inventory: {
      defaultLowStockThreshold: {
        type: Number,
        default: 5,
        min: 0,
        max: 1000
      }
    },
    
    // הגדרות התראות למנהל
    notifications: {
      adminNewOrderEmails: {
        type: [String],
        default: []
      }
    },
    
    // הגדרות הנחת סף - הנחה אוטומטית מעל סכום מסוים
    thresholdDiscount: {
      enabled: {
        type: Boolean,
        default: false
      },
      minimumAmount: {
        type: Number,
        default: 500,
        min: 0
      },
      discountPercentage: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
      }
    },
    
    // מדיניות משלוח והחזרות - מוצגת בטאב בעמוד המוצר
    shippingPolicy: {
      shipping: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'משלוח' },
        icon: { type: String, default: 'Truck' },
        items: { type: [String], default: [] }
      },
      returns: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'החזרות' },
        icon: { type: String, default: 'Undo' },
        items: { type: [String], default: [] }
      },
      warranty: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'אחריות' },
        icon: { type: String, default: 'Shield' },
        items: { type: [String], default: [] }
      }
    },
    
    ui: {
      showCartTotalInHeader: {
        type: Boolean,
        default: false
      }
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// ============================================================================
// Static Methods - Singleton Pattern
// ============================================================================

/**
 * קבלת ההגדרות (יוצר אם לא קיים)
 */
storeSettingsSchema.statics.getSettings = async function(): Promise<IStoreSettings> {
  let settings = await this.findOne();
  
  if (!settings) {
    // יצירת הגדרות ברירת מחדל
    settings = await this.create({
      orders: {
        allowUnpaidOrders: false,
        disablePayment: false,
        requirePhoneVerification: false,
        minOrderAmount: 0,
        maxItemsPerOrder: 50
      },
      users: {
        requireRegistrationApproval: false
      },
      shipping: {
        freeShippingThreshold: 200,
        defaultShippingCost: 30,
        enablePickup: true
      },
      payment: {
        enableCreditCard: true,
        enablePaypal: false,
        enableBankTransfer: false,
        enableCash: true
      },
      maintenance: {
        enabled: false,
        message: 'האתר במצב פרטי. רק משתמשים רשומים יכולים לגשת.',
        allowedRoles: ['admin', 'super_admin', 'customer']
      },
      inventory: {
        defaultLowStockThreshold: 5
      },
      notifications: {
        adminNewOrderEmails: []
      },
      thresholdDiscount: {
        enabled: false,
        minimumAmount: 500,
        discountPercentage: 10
      },
      shippingPolicy: {
        shipping: { enabled: true, title: 'משלוח', icon: 'Truck', items: [] },
        returns: { enabled: true, title: 'החזרות', icon: 'Undo', items: [] },
        warranty: { enabled: true, title: 'אחריות', icon: 'Shield', items: [] }
      },
      ui: {
        showCartTotalInHeader: false
      }
    });
  }
  
  return settings;
};

/**
 * עדכון הגדרות
 */
storeSettingsSchema.statics.updateSettings = async function(
  updates: Partial<{
    orders: Partial<IOrderSettings>;
    users: Partial<IUserSettings>;
    shipping: Partial<IShippingSettings>;
    payment: Partial<IPaymentSettings>;
    maintenance: Partial<IMaintenanceSettings>;
    inventory: Partial<IInventorySettings>;
    thresholdDiscount: Partial<IThresholdDiscountSettings>;
  }>,
  updatedBy?: mongoose.Types.ObjectId
): Promise<IStoreSettings> {
  let settings = await this.findOne();
  
  if (!settings) {
    // יצירת הגדרות ברירת מחדל אם לא קיימות
    settings = await this.create({
      orders: {
        allowUnpaidOrders: false,
        disablePayment: false,
        requirePhoneVerification: false,
        minOrderAmount: 0,
        maxItemsPerOrder: 50
      },
      users: {
        requireRegistrationApproval: false
      },
      shipping: {
        freeShippingThreshold: 200,
        defaultShippingCost: 30,
        enablePickup: true
      },
      payment: {
        enableCreditCard: true,
        enablePaypal: false,
        enableBankTransfer: false,
        enableCash: true
      },
      maintenance: {
        enabled: false,
        message: 'האתר במצב פרטי. רק משתמשים רשומים יכולים לגשת.',
        allowedRoles: ['admin', 'super_admin', 'customer']
      },
      inventory: {
        defaultLowStockThreshold: 5
      },
      notifications: {
        adminNewOrderEmails: []
      },
      thresholdDiscount: {
        enabled: false,
        minimumAmount: 500,
        discountPercentage: 10
      },
      shippingPolicy: {
        shipping: { enabled: true, title: 'משלוח', icon: 'Truck', items: [] },
        returns: { enabled: true, title: 'החזרות', icon: 'Undo', items: [] },
        warranty: { enabled: true, title: 'אחריות', icon: 'Shield', items: [] }
      }
    });
  }
  
  // עדכון עמוק של כל השדות
  if (updates.orders) {
    Object.assign(settings.orders, updates.orders);
  }
  if (updates.users) {
    Object.assign(settings.users, updates.users);
  }
  if (updates.shipping) {
    Object.assign(settings.shipping, updates.shipping);
  }
  if (updates.payment) {
    Object.assign(settings.payment, updates.payment);
  }
  if (updates.maintenance) {
    Object.assign(settings.maintenance, updates.maintenance);
  }
  if (updates.inventory) {
    // וידוא שאובייקט inventory קיים
    if (!settings.inventory) {
      (settings as any).inventory = { defaultLowStockThreshold: 5 };
    }
    Object.assign(settings.inventory, updates.inventory);
  }
  if ((updates as any).notifications) {
    // וידוא שאובייקט notifications קיים
    if (!settings.notifications) {
      (settings as any).notifications = { adminNewOrderEmails: [] };
    }
    Object.assign(settings.notifications, (updates as any).notifications);
  }
  if (updates.thresholdDiscount) {
    // וידוא שאובייקט thresholdDiscount קיים
    if (!settings.thresholdDiscount) {
      (settings as any).thresholdDiscount = { enabled: false, minimumAmount: 500, discountPercentage: 10 };
    }
    Object.assign(settings.thresholdDiscount, updates.thresholdDiscount);
  }
  if ((updates as any).shippingPolicy) {
    // וידוא שאובייקט shippingPolicy קיים
    if (!settings.shippingPolicy) {
      (settings as any).shippingPolicy = {
        shipping: { enabled: true, title: 'משלוח', icon: 'Truck', items: [] },
        returns: { enabled: true, title: 'החזרות', icon: 'Undo', items: [] },
        warranty: { enabled: true, title: 'אחריות', icon: 'Shield', items: [] }
      };
    }
    // עדכון עמוק של כל חלק (shipping, returns, warranty)
    const policyUpdates = (updates as any).shippingPolicy;
    if (policyUpdates.shipping) {
      Object.assign(settings.shippingPolicy.shipping, policyUpdates.shipping);
    }
    if (policyUpdates.returns) {
      Object.assign(settings.shippingPolicy.returns, policyUpdates.returns);
    }
    if (policyUpdates.warranty) {
      Object.assign(settings.shippingPolicy.warranty, policyUpdates.warranty);
    }
  }
  
  if (updatedBy) {
    settings.updatedBy = updatedBy;
  }
  
  await settings.save();
  return settings;
};

// ============================================================================
// Model Export
// ============================================================================

interface StoreSettingsModel extends mongoose.Model<IStoreSettings> {
  getSettings(): Promise<IStoreSettings>;
  updateSettings(
    updates: Partial<{
      orders: Partial<IOrderSettings>;
      users: Partial<IUserSettings>;
      shipping: Partial<IShippingSettings>;
      payment: Partial<IPaymentSettings>;
      maintenance: Partial<IMaintenanceSettings>;
      inventory: Partial<IInventorySettings>;
      notifications: Partial<INotificationSettings>;
      thresholdDiscount: Partial<IThresholdDiscountSettings>;
      shippingPolicy: Partial<IShippingPolicySettings>;
    }>,
    updatedBy?: mongoose.Types.ObjectId
  ): Promise<IStoreSettings>;
}

const StoreSettings = mongoose.model<IStoreSettings, StoreSettingsModel>(
  'StoreSettings',
  storeSettingsSchema
);

export default StoreSettings;
