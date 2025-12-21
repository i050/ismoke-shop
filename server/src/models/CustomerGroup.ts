import mongoose, { Document, Schema } from 'mongoose';

// הגדרת ממשק CustomerGroup
export interface ICustomerGroup extends Document {
  name: string;               // "VIP", "סיטונאים", "לקוחות רגילים"
  discountPercentage: number; // 0-100 (אחוז הנחה גלובלי)
  color: string;              // צבע לזיהוי ב-UI (#FF5733)
  description?: string;       // תיאור הקבוצה
  isActive: boolean;          // האם הקבוצה פעילה
  priority: number;           // עדיפות (למקרה של קבוצות מרובות)
  taxRate: number;            // שיעור המע"מ (ברירת מחדל 17%)
  
  // תכונות שקיפות
  showGroupMembership: boolean; // האם להציג ללקוחות שהם בקבוצה
  showOriginalPrice: boolean;   // האם להציג מחיר מקורי לצד ההנחה
  
  // מעקב אחר שינויים
  createdBy: mongoose.Types.ObjectId; // מי יצר
  updatedBy: mongoose.Types.ObjectId; // מי עדכן

  // תנאים לקבוצה (עתידי)
  conditions?: {
    minOrderAmount?: number;  // סכום הזמנה מינימלי
    minOrdersCount?: number;  // מספר הזמנות מינימלי
  };

  createdAt: Date;
  updatedAt: Date;
}

// הגדרת סכימת CustomerGroup
const customerGroupSchema = new Schema<ICustomerGroup>({
  name: {
    type: String,
    required: [true, 'שם הקבוצה הוא שדה חובה'],
    trim: true,
    unique: true,
    minlength: [2, 'שם הקבוצה חייב להכיל לפחות 2 תווים'],
    maxlength: [50, 'שם הקבוצה לא יכול להכיל יותר מ-50 תווים']
  },
  discountPercentage: {
    type: Number,
    required: [true, 'אחוז ההנחה הוא שדה חובה'],
    min: [0, 'אחוז ההנחה לא יכול להיות שלילי'],
    max: [100, 'אחוז ההנחה לא יכול להיות גדול מ-100']
  },
  color: {
    type: String,
    required: [true, 'צבע הוא שדה חובה'],
    match: [/^#[0-9A-F]{6}$/i, 'צבע חייב להיות בפורמט hex תקין (#RRGGBB)']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'תיאור לא יכול להכיל יותר מ-200 תווים']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'עדיפות לא יכולה להיות שלילית']
  },
  taxRate: {
    type: Number,
    default: 17,
    min: [0, 'שיעור המע"מ לא יכול להיות שלילי'],
    max: [100, 'שיעור המע"מ לא יכול להיות גדול מ-100']
  },
  showGroupMembership: {
    type: Boolean,
    default: true,
    required: [true, 'הגדרת הצגת חברות בקבוצה היא שדה חובה']
  },
  showOriginalPrice: {
    type: Boolean,
    default: true,
    required: [true, 'הגדרת הצגת מחיר מקורי היא שדה חובה']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'שדה יוצר הוא שדה חובה']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'שדה מעדכן הוא שדה חובה']
  },
  conditions: {
    minOrderAmount: {
      type: Number,
      min: [0, 'סכום הזמנה מינימלי לא יכול להיות שלילי']
    },
    minOrdersCount: {
      type: Number,
      min: [0, 'מספר הזמנות מינימלי לא יכול להיות שלילי']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// The `name` field already declares `unique: true` in the schema above.
// Keep the uniqueness on the field and avoid declaring the same index twice
// to prevent Mongoose "Duplicate schema index" warnings.
// customerGroupSchema.index({ name: 1 });
customerGroupSchema.index({ isActive: 1 });
customerGroupSchema.index({ priority: -1 });
customerGroupSchema.index({ createdBy: 1 });
customerGroupSchema.index({ updatedBy: 1 });
customerGroupSchema.index({ showGroupMembership: 1 });
customerGroupSchema.index({ showOriginalPrice: 1 });

// Virtual for user count
customerGroupSchema.virtual('userCount').get(async function() {
  const User = mongoose.model('User');
  return await User.countDocuments({ customerGroupId: this._id });
});

// Virtual for active users count
customerGroupSchema.virtual('activeUserCount').get(async function() {
  const User = mongoose.model('User');
  return await User.countDocuments({ 
    customerGroupId: this._id,
    isActive: true 
  });
});

// Middleware to update updatedBy on save
customerGroupSchema.pre('save', function(next) {
  if (this.isModified() && this.updatedBy) {
    // Keep the updatedBy as is
  }
  next();
});

// יצירת המודל
const CustomerGroup = mongoose.model<ICustomerGroup>('CustomerGroup', customerGroupSchema);

export default CustomerGroup;
