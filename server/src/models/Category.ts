import mongoose, { Document, Schema } from 'mongoose';

// ממשק לתמונת קטגוריה (לשימוש עתידי עם Cloudinary)
export interface ICategoryImage {
	url: string;
	public_id: string;
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
	
	// Timestamps - נשארים כמו שהם
	createdAt: Date;
	updatedAt: Date;
}

// סכמת תמונה (אופציונלית - nested schema)
const CategoryImageSchema: Schema = new Schema({
	url: { type: String, required: true },
	public_id: { type: String, required: true },
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
