import mongoose, { Document, Schema } from 'mongoose';

/**
 * ממשק מאפיין סינון גלובלי
 * מייצג מאפיין שמנהלים יכולים להוסיף ל-SKUs (צבע, גודל, חומר וכו')
 */
export interface IFilterAttribute extends Document {
  name: string;              // שם המאפיין בעברית (למשל: "צבע")
  key: string;               // מזהה ייחודי באנגלית (למשל: "color")
  valueType: 'text' | 'color' | 'number';  // סוג הערך
  icon?: string;             // אייקון אופציונלי (emoji או icon name)
  showInFilter: boolean;     // האם להציג בפאנל הסינון בחזית
  isRequired: boolean;       // האם חובה למלא (יציג אזהרה)
  sortOrder: number;         // סדר הצגה בפאנל הסינון
  
  // עבור טקסט/מספר רגיל
  values?: Array<{
    value: string;           // הערך בפועל (למשל: "S", "red")
    displayName: string;     // שם לתצוגה (למשל: "קטן", "אדום")
  }>;                        // רשימת ערכים אפשריים (אופציונלי)
  
  // עבור צבעים (מקרה מיוחד)
  colorFamilies?: Array<{
    family: string;          // משפחת צבע באנגלית (red, blue, green)
    displayName: string;     // שם בעברית (אדום, כחול, ירוק)
    variants: Array<{
      name: string;          // שם הגוון (Crimson, Navy)
      displayName?: string;  // שם הגוון בעברית (ארגמן, כחול כהה)
      hex: string;           // קוד צבע (#DC143C)
    }>;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * סכמת FilterAttribute
 */
const FilterAttributeSchema = new Schema<IFilterAttribute>(
  {
    // שם המאפיין בעברית
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    
    // מזהה ייחודי באנגלית
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z_]+$/,
    },
    
    // סוג הערך
    valueType: {
      type: String,
      enum: ['text', 'color', 'number'],
      required: true,
      default: 'text',
    },
    
    // אייקון (emoji)
    icon: {
      type: String,
      maxlength: 10,
    },
    
    // האם להציג בסינון
    showInFilter: {
      type: Boolean,
      default: true,
    },
    
    // האם חובה למלא
    isRequired: {
      type: Boolean,
      default: false,
    },
    
    // סדר הצגה
    sortOrder: {
      type: Number,
      default: 0,
    },
    
    // ערכים (לטקסט/מספר)
    values: {
      type: [{
        value: {
          type: String,
          required: true,
          trim: true,
          minlength: 1,
          maxlength: 50,
        },
        displayName: {
          type: String,
          required: true,
          trim: true,
          minlength: 1,
          maxlength: 50,
        },
      }],
      default: undefined,
    },
    
    // משפחות צבעים (לצבע)
    colorFamilies: {
      type: [{
        family: {
          type: String,
          required: true,
          lowercase: true,
          match: /^[a-z_]+$/,
        },
        displayName: {
          type: String,
          required: true,
          trim: true,
        },
        variants: {
          type: [{
            name: {
              type: String,
              required: true,
              trim: true,
            },
            displayName: {
              type: String,
              trim: true,
              // אם לא נמסר, ישתמש ב-name
            },
            hex: {
              type: String,
              required: true,
              match: /^#[0-9A-F]{6}$/,
              uppercase: true,
            },
          }],
          validate: {
            validator: (v: any[]) => v && v.length > 0,
            message: 'משפחת צבע חייבת להכיל לפחות גוון אחד',
          },
        },
      }],
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'filterattributes',
  }
);

// ============================================================================
// Indexes לביצועים
// ============================================================================

// הערה: key כבר יש לו unique index (מוגדר בשדה עצמו)
FilterAttributeSchema.index({ showInFilter: 1 });
FilterAttributeSchema.index({ sortOrder: 1 });

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * ולידציה: אם valueType=color, חייב להיות colorFamilies
 */
FilterAttributeSchema.pre('save', function (next) {
  if (this.valueType === 'color' && !this.colorFamilies) {
    return next(new Error('מאפייני צבע חייבים להכיל colorFamilies'));
  }
  
  if (this.valueType !== 'color' && this.colorFamilies) {
    return next(new Error('רק מאפייני צבע יכולים להכיל colorFamilies'));
  }
  
  // אזהרה (לא חסימה) למאפיין טקסט ללא ערכים
  if (this.valueType === 'text' && (!this.values || this.values.length === 0)) {
    console.warn(
      `⚠️ Warning: Text attribute "${this.name}" has no predefined values. ` +
      `This may cause inconsistent data.`
    );
  }
  
  next();
});

/**
 * מניעת שינוי key בעדכון
 */
FilterAttributeSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  
  if (update.$set && update.$set.key) {
    delete update.$set.key;
  }
  if (update.key) {
    delete update.key;
  }
  
  next();
});

const FilterAttribute = mongoose.model<IFilterAttribute>(
  'FilterAttribute',
  FilterAttributeSchema
);

export default FilterAttribute;
