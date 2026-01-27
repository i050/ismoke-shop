import mongoose, { Document, Schema } from 'mongoose';

/**
 * ממשק מותג
 * מייצג מותג של מוצרים - כולל רק שם (פשוט וישיר)
 * שימושי לעקביות ומניעת שגיאות כתיב במותגים
 */
export interface IBrand extends Document {
  name: string;              // שם המותג (למשל: "ASPIRE", "SMOK")
  isActive: boolean;         // האם המותג פעיל (ניתן לבחור אותו במוצרים)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * סכמת Brand
 * מאפשרת ניהול מרכזי של מותגים
 */
const BrandSchema = new Schema<IBrand>(
  {
    // שם המותג
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'שם המותג חייב להכיל לפחות 2 תווים'],
      maxlength: [100, 'שם המותג לא יכול להכיל יותר מ-100 תווים'],
    },
    
    // האם המותג פעיל
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,      // יוצר createdAt ו-updatedAt
    versionKey: false,     // מסיר __v
  }
);

// אינדקס unique עם collation case-insensitive - הדרך המקצועית!
BrandSchema.index(
  { name: 1 }, 
  { 
    unique: true,
    collation: { locale: 'en', strength: 2 } // strength: 2 = case-insensitive
  }
);
BrandSchema.index({ isActive: 1 });

// וירטואלים - אפשר להוסיף בעתיד ספירת מוצרים פר מותג

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
export default Brand;
