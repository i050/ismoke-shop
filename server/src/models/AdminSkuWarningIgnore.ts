import mongoose, { Schema, Document } from 'mongoose';

/**
 * ממשק TypeScript למסמך התעלמות מהתראות
 */
export interface IAdminSkuWarningIgnore extends Document {
  productId: mongoose.Types.ObjectId; // מזהה המוצר שמתעלמים ממנו
  warningType: string; // סוג ההתראה (להרחבה עתידית)
  ignoredUntil: Date | null; // null = התעלם לתמיד, תאריך = התעלם עד למועד זה
  createdAt: Date; // תאריך יצירת ההתעלמות
  updatedAt?: Date; // תאריך עדכון אחרון
}

/**
 * סכמת MongoDB לניהול התעלמויות מהתראות אי-עקביות במוצרים
 * 
 * תכונות:
 * - productId: קישור למוצר שמתעלמים ממנו
 * - warningType: סוג ההתראה (כרגע 'missing_attribute')
 * - ignoredUntil: null = לצמיתות, תאריך = זמני (snooze)
 * - createdAt/updatedAt: מעקב אחר שינויים
 */
const AdminSkuWarningIgnoreSchema = new Schema<IAdminSkuWarningIgnore>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true, // אינדקס לשאילתות מהירות
    },
    warningType: {
      type: String,
      default: 'missing_attribute',
      enum: ['missing_attribute'], // להרחבה עתידית: 'duplicate_sku', 'invalid_price' וכו'
    },
    ignoredUntil: {
      type: Date,
      default: null, // null = התעלם לתמיד
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // מוסיף אוטומטית createdAt ו-updatedAt
    collection: 'adminskuwarningignores', // שם הקולקשיין במסד הנתונים
  }
);

// אינדקס מורכב לייעול שאילתות - מוצר + סוג התראה חייבים להיות ייחודיים
AdminSkuWarningIgnoreSchema.index({ productId: 1, warningType: 1 }, { unique: true });

// אינדקס לשאילתות לפי תאריך פקיעה (למציאת התראות שצריך להציג שוב)
AdminSkuWarningIgnoreSchema.index({ ignoredUntil: 1 });

/**
 * מודל Mongoose לגישה למסד הנתונים
 */
const AdminSkuWarningIgnore = mongoose.model<IAdminSkuWarningIgnore>(
  'AdminSkuWarningIgnore',
  AdminSkuWarningIgnoreSchema
);

export default AdminSkuWarningIgnore;
