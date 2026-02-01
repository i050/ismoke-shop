import mongoose, { Document, Schema } from 'mongoose';

// ממשק לתמונת קטגוריה (לשימוש עתידי עם Cloudinary)
export interface ICategoryImage {
	url: string;
	public_id: string;
}

// ============================================================================
// ממשק לשדה בתבנית מפרט טכני
// ============================================================================
/**
 * כל שדה בתבנית המפרט הטכני של קטגוריה
 * - key: מזהה ייחודי לשדה (באנגלית, לדוגמה: "height")
 * - label: תווית להצגה (בעברית, לדוגמה: "גובה")
 * - unit: יחידת מידה אופציונלית (לדוגמה: "ס"מ", "גרם")
 * - type: סוג השדה - text/number/select
 * - options: אפשרויות לבחירה (רק ל-type=select)
 * - required: האם השדה חובה ברמת המוצר
 * - sortOrder: סדר הצגה בטופס
 */
export interface ISpecificationField {
	key: string;              // מזהה ייחודי לשדה (באנגלית)
	label: string;            // תווית להצגה (בעברית)
	unit?: string;            // יחידת מידה (אופציונלי)
	type: 'text' | 'number' | 'select';  // סוג השדה
	options?: string[];       // אפשרויות לבחירה (ל-select בלבד)
	required?: boolean;       // האם חובה למלא
	sortOrder?: number;       // סדר הצגה
}

// ממשק קטגוריה מורחב - תואם לחלוטין למבנה הקיים + שדות חדשים
export interface ICategory extends Document {
	// שדות קיימים - לא משתנים!
	name: string;
	slug: string;
	parentId: mongoose.Types.ObjectId | null;
	
	// שדות חדשים - כולם עם default values לתאימות אחורה
	level: number;           // רמה בעץ: 0=ראשי, 1=תת, 2=תת-תת
	path: string;            // נתיב מלא: "/electronics/phones"
	isActive: boolean;       // האם הקטגוריה פעילה באתר
	sortOrder: number;       // סדר תצוגה (מספר נמוך = ראשון)
	description?: string;    // תיאור לSEO ולתצוגה
	image?: ICategoryImage;  // תמונת קטגוריה (אופציונלי)
	
	// ============================================================================
	// תבנית מפרט טכני - הגדרת שדות ברמת הקטגוריה
	// ============================================================================
	/**
	 * תבנית מפרט טכני לקטגוריה
	 * - מגדירה אילו שדות יופיעו בטופס יצירת מוצר
	 * - תת-קטגוריות יורשות את התבנית מקטגוריית האב
	 * - ניתן להוסיף שדות ייחודיים לתת-קטגוריה
	 */
	specificationTemplate?: ISpecificationField[];
	
	// Timestamps - נשארים כמו שהם
	createdAt: Date;
	updatedAt: Date;
}

// סכמת תמונה (אופציונלית - nested schema)
const CategoryImageSchema: Schema = new Schema({
	url: { type: String, required: true },
	public_id: { type: String, required: true },
}, { _id: false }); // ללא _id כי זה embedded document

// ============================================================================
// סכמת שדה בתבנית מפרט טכני
// ============================================================================
const SpecificationFieldSchema: Schema = new Schema({
	key: { 
		type: String, 
		required: true, 
		trim: true,
		maxlength: 50      // מגבלה על אורך המפתח
	},
	label: { 
		type: String, 
		required: true, 
		trim: true,
		maxlength: 100     // מגבלה על אורך התווית
	},
	unit: { 
		type: String, 
		trim: true,
		maxlength: 20      // מגבלה על אורך יחידת המידה
	},
	type: { 
		type: String, 
		enum: ['text', 'number', 'select'], 
		default: 'text' 
	},
	options: [{ 
		type: String, 
		trim: true 
	}],                    // אפשרויות לבחירה (רק ל-select)
	required: { 
		type: Boolean, 
		default: false 
	},
	sortOrder: { 
		type: Number, 
		default: 0 
	},
}, { _id: false }); // ללא _id כי זה embedded document

const CategorySchema: Schema = new Schema({
	// שדות קיימים - ללא שינוי!
	name: { type: String, required: true, trim: true },
	slug: { type: String, required: true, unique: true, index: true },
	parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
	
	// שדות חדשים עם default values - קטגוריות קיימות יקבלו ערכי ברירת מחדל
	level: { 
		type: Number, 
		default: 0,      // ברירת מחדל: קטגוריה ראשית
		min: 0, 
		max: 5           // מגביל עומק עץ ל-6 רמות
	},
	path: { 
		type: String, 
		default: ''      // יחושב אוטומטית ב-service
	},
	isActive: { 
		type: Boolean, 
		default: true    // קטגוריות חדשות פעילות כברירת מחדל
	},
	sortOrder: { 
		type: Number, 
		default: 0       // סדר תצוגה - 0 = ראשון
	},
	description: { 
		type: String, 
		trim: true, 
		maxlength: 500   // הגבלת אורך תיאור
	},
	image: { 
		type: CategoryImageSchema  // תמונה אופציונלית
	},
	
	// ============================================================================
	// תבנית מפרט טכני - מערך שדות לקטגוריה
	// ============================================================================
	specificationTemplate: {
		type: [SpecificationFieldSchema],
		default: [],         // ברירת מחדל: ללא תבנית
		validate: {
			validator: function(arr: any[]) {
				return arr.length <= 30; // מגבלה על מספר השדות בתבנית
			},
			message: 'לא ניתן להגדיר יותר מ-30 שדות בתבנית מפרט'
		}
	},
}, { timestamps: true });

// אינדקסים לביצועים מיטביים
// אינדקס מורכב לבניית עץ מהירה - הכי חשוב!
CategorySchema.index({ isActive: 1, parentId: 1, sortOrder: 1 });

// אינדקס לשאילתות לפי נתיב (Materialized Path queries)
CategorySchema.index({ path: 1 });

// אינדקס לשאילתות לפי רמה וסדר
CategorySchema.index({ level: 1, sortOrder: 1 });

const Category = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
