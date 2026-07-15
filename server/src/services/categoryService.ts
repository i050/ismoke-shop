import Category, { ICategory } from '../models/Category';
import Product from '../models/Product';
import mongoose from 'mongoose';
import { invalidateInactiveCategoriesCache } from './productService';

// ===== טיפוסים =====

// מבנה צומת בעץ קטגוריות - תואם ל-API הקיים
export interface CategoryTreeNode {
	_id: string;
	name: string;
	slug: string;
	parentId: string | null;
	children: CategoryTreeNode[];
	// שדות חדשים (אופציונליים לתאימות אחורה)
	level?: number;
	path?: string;
	isActive?: boolean;
	sortOrder?: number;
	description?: string;
}

// נתוני יצירת קטגוריה
export interface CreateCategoryData {
	name: string;
	slug?: string;          // אם לא סופק - ייווצר אוטומטית מהשם
	parentId?: string | null;
	description?: string;
	isActive?: boolean;
	sortOrder?: number;
}

// נתוני עדכון קטגוריה
export interface UpdateCategoryData {
	name?: string;
	slug?: string;
	parentId?: string | null;
	description?: string;
	isActive?: boolean;
	sortOrder?: number;
}

// סטטיסטיקות קטגוריה
export interface CategoryStats {
	subcategoriesCount: number;      // מספר תת-קטגוריות ישירות
	productsCount: number;           // מספר מוצרים בקטגוריה עצמה
	descendantProductsCount: number; // מספר מוצרים כולל צאצאים
}

// אפשרויות מחיקה בטוחה
export interface SafeDeleteOptions {
	deleteSubcategories?: boolean;  // האם למחוק גם תת-קטגוריות
	reassignTo?: string | null;     // להעביר מוצרים לקטגוריה אחרת
}

// ===== פונקציות עזר פנימיות =====

/**
 * יצירת slug מתוך שם קטגוריה
 * תומך באנגלית בלבד (עברית תומר לtransliteration בעתיד)
 */
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')   // הסרת תווים מיוחדים
		.replace(/\s+/g, '-')       // רווחים למקפים
		.replace(/-+/g, '-')        // מקפים כפולים למקף יחיד
		.replace(/^-|-$/g, '');     // הסרת מקפים בהתחלה/סוף
}

/**
 * קבלת כל ה-IDs של צאצאים (רקורסיבי)
 * משמש למחיקה בטוחה ולסטטיסטיקות
 */
async function getDescendantIds(parentId: string): Promise<string[]> {
	const result: string[] = [];
	const queue = [parentId];
	
	while (queue.length > 0) {
		const currentId = queue.shift()!;
		// מציאת כל הילדים הישירים
		const children = await Category.find({ parentId: currentId }).select('_id').lean();
		
		for (const child of children) {
			const childId = child._id.toString();
			result.push(childId);
			queue.push(childId); // הוספה לתור לבדיקת צאצאים נוספים
		}
	}
	
	return result;
}

/**
 * חישוב level ו-path עבור קטגוריה חדשה או מועברת
 */
async function calculateLevelAndPath(
	slug: string,
	parentId: string | null
): Promise<{ level: number; path: string }> {
	// קטגוריה ראשית - level 0
	if (!parentId) {
		return { level: 0, path: `/${slug}` };
	}
	
	// תת-קטגוריה - חישוב מבוסס הורה
	const parent = await Category.findById(parentId).lean();
	if (!parent) {
		throw new Error('קטגוריית אב לא נמצאה');
	}
	
	const level = (parent.level ?? 0) + 1;
	const parentPath = parent.path || `/${parent.slug}`;
	const path = `${parentPath}/${slug}`;
	
	// הגבלת עומק העץ ל-3 רמות (0, 1, 2)
	if (level > 2) {
		throw new Error('לא ניתן ליצור יותר מ-3 רמות של קטגוריות');
	}
	
	return { level, path };
}

/**
 * עדכון היררכיה של כל הצאצאים כשמעבירים קטגוריה
 */
async function updateDescendantsHierarchy(
	categoryId: string,
	oldPath: string,
	newPath: string,
	levelDiff: number
): Promise<void> {
	// עדכון כל הקטגוריות שהנתיב שלהן מתחיל בנתיב הישן
	await Category.updateMany(
		{ path: { $regex: `^${escapeRegex(oldPath)}/` } },
		[
			{
				$set: {
					// החלפת תחילת הנתיב
					path: {
						$concat: [
							newPath,
							{ $substrCP: ['$path', { $strLenCP: oldPath }, { $strLenCP: '$path' }] }
						]
					},
					// עדכון הרמה
					level: { $add: ['$level', levelDiff] }
				}
			}
		]
	);
}

/**
 * escape לתווים מיוחדים ב-regex
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== פונקציות CRUD ראשיות =====

/**
 * יצירת קטגוריה חדשה - משודרגת עם חישוב level ו-path
 * תואמת לחלוטין ל-API הקיים!
 */
export async function createCategory(
	data: CreateCategoryData | { name: string; slug: string; parentId?: string | null }
): Promise<ICategory> {
	// יצירת slug אוטומטית אם לא סופק
	const slug = data.slug || generateSlug(data.name);
	
	// בדיקת slug ייחודי
	const existingSlug = await Category.findOne({ slug }).lean();
	if (existingSlug) {
		throw new Error(`קטגוריה עם slug "${slug}" כבר קיימת`);
	}
	
	// בדיקת parentId תקין אם סופק
	const parentId = data.parentId ?? null;
	if (parentId) {
		const parentExists = await Category.exists({ _id: parentId });
		if (!parentExists) {
			throw new Error('קטגוריית אב לא נמצאה');
		}
	}
	
	// חישוב level ו-path
	const { level, path } = await calculateLevelAndPath(slug, parentId);
	
	// יצירת הקטגוריה עם כל השדות
	const cat = new Category({
		name: data.name,
		slug,
		parentId,
		level,
		path,
		isActive: 'isActive' in data ? data.isActive : true,
		sortOrder: 'sortOrder' in data ? data.sortOrder : 0,
		description: 'description' in data ? data.description : undefined,
	});
	
	return cat.save();
}

/**
 * קבלת כל הקטגוריות - ללא שינוי (תאימות אחורה)
 */
export async function getAllCategories(): Promise<ICategory[]> {
	return Category.find()
		.sort({ sortOrder: 1, name: 1 }) // מיון לפי sortOrder קודם, אח"כ שם
		.lean<ICategory[]>();
}

/**
 * קבלת קטגוריה לפי ID - ללא שינוי (תאימות אחורה)
 */
export async function getCategoryById(id: string): Promise<ICategory | null> {
	return Category.findById(id).lean<ICategory | null>();
}

/**
 * עדכון קטגוריה - משודרגת עם טיפול בשינוי הורה
 */
export async function updateCategory(
	id: string,
	data: UpdateCategoryData | Partial<Pick<ICategory, 'name' | 'slug' | 'parentId'>>
): Promise<ICategory | null> {
	const category = await Category.findById(id);
	if (!category) return null;
	
	const currentParentId = category.parentId?.toString() || null;
	// המרה ל-string כדי להבטיח טיפוס אחיד
	const newParentId: string | null = data.parentId !== undefined 
		? (data.parentId?.toString() || null) 
		: currentParentId;
	
	// בדיקת מניעת מעגליות
	if (newParentId) {
		// קטגוריה לא יכולה להיות הורה של עצמה
		if (newParentId === id) {
			throw new Error('קטגוריה לא יכולה להיות הורה של עצמה');
		}
		
		// בדיקה שה-parent החדש לא צאצא של הקטגוריה הנוכחית
		const descendants = await getDescendantIds(id);
		if (descendants.includes(newParentId)) {
			throw new Error('לא ניתן להעביר קטגוריה לתוך אחד מהצאצאים שלה');
		}
	}
	
	// אם משנים הורה - צריך לעדכן level ו-path של הקטגוריה וכל הצאצאים
	if (newParentId !== currentParentId) {
		const oldPath = category.path || `/${category.slug}`;
		const oldLevel = category.level ?? 0;
		
		// חישוב הערכים החדשים
		const slug = data.slug || category.slug;
		const { level: newLevel, path: newPath } = await calculateLevelAndPath(slug, newParentId);
		
		// עדכון הקטגוריה עצמה
		category.level = newLevel;
		category.path = newPath;
		category.parentId = newParentId ? new mongoose.Types.ObjectId(newParentId) : null;
		
		// עדכון כל הצאצאים
		const levelDiff = newLevel - oldLevel;
		await updateDescendantsHierarchy(id, oldPath, newPath, levelDiff);
	}
	
	// עדכון שאר השדות
	if (data.name !== undefined) category.name = data.name;
	if (data.slug !== undefined) {
		// אם משנים slug, צריך לעדכן גם path
		if (data.slug !== category.slug) {
			const existingSlug = await Category.findOne({ slug: data.slug, _id: { $ne: id } }).lean();
			if (existingSlug) {
				throw new Error(`קטגוריה עם slug "${data.slug}" כבר קיימת`);
			}
			const oldPath = category.path || `/${category.slug}`;
			const newPath = category.path?.replace(category.slug, data.slug) || `/${data.slug}`;
			
			// עדכון path בכל הצאצאים
			await updateDescendantsHierarchy(id, oldPath, newPath, 0);
			
			category.slug = data.slug;
			category.path = newPath;
		}
	}
	if ('description' in data) category.description = data.description;
	if ('isActive' in data) {
		category.isActive = data.isActive ?? true;
		// 🚀 Performance: ניקוי cache של קטגוריות מושבתות כשמשתנה isActive
		invalidateInactiveCategoriesCache();
	}
	if ('sortOrder' in data) category.sortOrder = data.sortOrder ?? 0;
	
	return category.save();
}

/**
 * מחיקת קטגוריה פשוטה - נשמרת לתאימות אחורה
 * שימו לב: לא בודקת תלויות! להשתמש ב-safeDeleteCategory לבדיקה
 */
export async function deleteCategory(id: string): Promise<ICategory | null> {
	return Category.findByIdAndDelete(id);
}

/**
 * קבלת עץ קטגוריות - משודרגת עם שדות חדשים
 * תואמת לחלוטין למבנה הקיים!
 */
export async function getCategoriesTree(): Promise<CategoryTreeNode[]> {
	// שליפה עם מיון לפי sortOrder ואז שם
	const cats = await Category.find()
		.sort({ sortOrder: 1, name: 1 })
		.lean<ICategory[]>();
	
	const nodes: Record<string, CategoryTreeNode> = {};
	
	// פונקציית עזר להמרת _id לstring
	const idToString = (id: ICategory['_id']): string => (id as any).toString();
	
	// יצירת אובייקטים בסיסיים עם השדות החדשים
	for (const c of cats) {
		const cid = idToString(c._id);
		nodes[cid] = {
			_id: cid,
			name: c.name,
			slug: c.slug,
			parentId: c.parentId ? idToString(c.parentId as any) : null,
			children: [],
			// שדות חדשים - נוספים רק אם קיימים
			level: c.level,
			path: c.path,
			isActive: c.isActive,
			sortOrder: c.sortOrder,
			description: c.description,
		};
	}
	
	// שיוך לפי הורה
	const roots: CategoryTreeNode[] = [];
	for (const id in nodes) {
		const n = nodes[id];
		if (n.parentId && nodes[n.parentId]) {
			nodes[n.parentId].children.push(n);
		} else {
			roots.push(n);
		}
	}
	
	return roots;
}

// ===== פונקציות חדשות =====

/**
 * קבלת סטטיסטיקות קטגוריה
 * משמש להצגה ב-Admin ולפני מחיקה
 */
export async function getCategoryStats(id: string): Promise<CategoryStats> {
	// קבלת כל הצאצאים
	const descendantIds = await getDescendantIds(id);
	const allIds = [id, ...descendantIds];
	const allCategoryObjectIds = allIds.map(i => new mongoose.Types.ObjectId(i));
	const productsInCategoriesFilter = {
		$or: [
			{ categoryId: { $in: allCategoryObjectIds } },
			{ additionalCategoryIds: { $in: allCategoryObjectIds } },
		],
	};
	
	// שאילתות מקבילות לביצועים טובים יותר
	const [subcategoriesCount, productsCount, descendantProductsCount] = await Promise.all([
		// מספר תת-קטגוריות ישירות
		Category.countDocuments({ parentId: id }),
		// מספר מוצרים בקטגוריה עצמה
		Product.countDocuments({
			$or: [
				{ categoryId: new mongoose.Types.ObjectId(id) },
				{ additionalCategoryIds: new mongoose.Types.ObjectId(id) },
			],
		}),
		// מספר מוצרים כולל בכל הצאצאים
		Product.countDocuments(productsInCategoriesFilter),
	]);
	
	return { subcategoriesCount, productsCount, descendantProductsCount };
}

/**
 * מחיקה בטוחה של קטגוריה עם אפשרויות
 * - בודקת תלויות לפני מחיקה
 * - מאפשרת העברת מוצרים לקטגוריה אחרת
 * - מאפשרת מחיקת כל התת-קטגוריות
 */
export async function safeDeleteCategory(
	id: string,
	options: SafeDeleteOptions = {}
): Promise<{ success: boolean; message: string; affected: number }> {
	// קבלת סטטיסטיקות
	const stats = await getCategoryStats(id);
	
	// בדיקה אם יש תת-קטגוריות
	if (stats.subcategoriesCount > 0 && !options.deleteSubcategories) {
		throw new Error(
			`לא ניתן למחוק - קיימות ${stats.subcategoriesCount} תת-קטגוריות. ` +
			'אנא מחק אותן קודם או בחר באפשרות מחיקת צאצאים'
		);
	}
	
	// טיפול במוצרים
	const descendantIds = await getDescendantIds(id);
	const allCategoryIds = [id, ...descendantIds].map(i => new mongoose.Types.ObjectId(i));
	
	if (stats.descendantProductsCount > 0) {
		if (options.reassignTo) {
			const reassignedCategoryId = new mongoose.Types.ObjectId(options.reassignTo);

			// מוצרים שבהם זו הקטגוריה הראשית: מחליפים ראשית ומנקים כפילויות.
			await Product.updateMany(
				{ categoryId: { $in: allCategoryIds } },
				[
					{
						$set: {
							categoryId: reassignedCategoryId,
							additionalCategoryIds: {
								$setDifference: [
									{ $ifNull: ['$additionalCategoryIds', []] },
									[...allCategoryIds, reassignedCategoryId],
								],
							},
						},
					},
				]
			);

			// מוצרים שבהם זו קטגוריה נוספת: שומרים את הראשית ומחליפים רק את השיוך הנוסף.
			await Product.updateMany(
				{
					categoryId: { $nin: allCategoryIds },
					additionalCategoryIds: { $in: allCategoryIds },
				},
				[
					{
						$set: {
							additionalCategoryIds: {
								$let: {
									vars: {
										remaining: {
											$setDifference: [
												{ $ifNull: ['$additionalCategoryIds', []] },
												allCategoryIds,
											],
										},
									},
									in: {
										$cond: [
											{ $eq: ['$categoryId', reassignedCategoryId] },
											'$$remaining',
											{ $setUnion: ['$$remaining', [reassignedCategoryId]] },
										],
									},
								},
							},
						},
					},
				]
			);
		} else {
			// הסרת שיוכים שנמחקו מהמוצרים, ראשיים ונוספים.
			await Product.updateMany(
				{ categoryId: { $in: allCategoryIds } },
				{ $unset: { categoryId: 1 } }
			);
			await Product.updateMany(
				{ additionalCategoryIds: { $in: allCategoryIds } },
				{ $pull: { additionalCategoryIds: { $in: allCategoryIds } } }
			);
		}
	}
	
	// מחיקת תת-קטגוריות אם נדרש
	if (options.deleteSubcategories && descendantIds.length > 0) {
		await Category.deleteMany({ _id: { $in: descendantIds.map(i => new mongoose.Types.ObjectId(i)) } });
	}
	
	// מחיקת הקטגוריה עצמה
	await Category.findByIdAndDelete(id);
	
	return {
		success: true,
		message: 'הקטגוריה נמחקה בהצלחה',
		affected: stats.descendantProductsCount,
	};
}

/**
 * שינוי סדר קטגוריות (batch update)
 * מקבל מערך של ID + sortOrder חדש
 */
export async function reorderCategories(
	items: Array<{ id: string; sortOrder: number }>
): Promise<void> {
	if (items.length === 0) return;
	
	// שימוש ב-bulkWrite לביצועים מיטביים
	const bulkOps = items.map(item => ({
		updateOne: {
			filter: { _id: new mongoose.Types.ObjectId(item.id) },
			update: { $set: { sortOrder: item.sortOrder } },
		},
	}));
	
	await Category.bulkWrite(bulkOps);
}

/**
 * קבלת קטגוריות פעילות בלבד (לשימוש בחנות)
 */
export async function getActiveCategoriesTree(): Promise<CategoryTreeNode[]> {
	const cats = await Category.find({ isActive: true })
		.sort({ sortOrder: 1, name: 1 })
		.lean<ICategory[]>();
	
	const nodes: Record<string, CategoryTreeNode> = {};
	const idToString = (id: ICategory['_id']): string => (id as any).toString();
	
	for (const c of cats) {
		const cid = idToString(c._id);
		nodes[cid] = {
			_id: cid,
			name: c.name,
			slug: c.slug,
			parentId: c.parentId ? idToString(c.parentId as any) : null,
			children: [],
			level: c.level,
			path: c.path,
			isActive: c.isActive,
			sortOrder: c.sortOrder,
			description: c.description,
		};
	}
	
	const roots: CategoryTreeNode[] = [];
	for (const id in nodes) {
		const n = nodes[id];
		if (n.parentId && nodes[n.parentId]) {
			nodes[n.parentId].children.push(n);
		} else {
			roots.push(n);
		}
	}
	
	return roots;
}

// ============================================================================
// פונקציות לניהול תבנית מפרט טכני
// ============================================================================

import { ISpecificationField } from '../models/Category';

/**
 * טיפוס לתבנית מפרט עם מידע על מקור (ירושה)
 */
export interface InheritedSpecificationField extends ISpecificationField {
	inheritedFrom?: string;      // שם הקטגוריה שממנה השדה נורש
	inheritedFromId?: string;    // ID של הקטגוריה שממנה השדה נורש
	isInherited: boolean;        // האם השדה נורש או מוגדר ישירות
}

/**
 * תבנית מפרט מורכבת עם ירושה
 */
export interface MergedSpecificationTemplate {
	categoryId: string;
	categoryName: string;
	fields: InheritedSpecificationField[];
	inheritanceChain: Array<{
		id: string;
		name: string;
		fieldsCount: number;
	}>;
}

/**
 * קבלת תבנית מפרט טכני עם ירושה מקטגוריות אב
 * - מאחד שדות מכל הקטגוריות בשרשרת (מהשורש עד הקטגוריה הנבחרת)
 * - שדות עם אותו key יידרסו על ידי הקטגוריה הקרובה יותר
 * - כולל מידע על מקור כל שדה (לצורך תצוגה)
 */
export async function getSpecificationTemplateWithInheritance(
	categoryId: string
): Promise<MergedSpecificationTemplate | null> {
	// טעינת הקטגוריה הנבחרת
	const category = await Category.findById(categoryId).lean<ICategory>();
	if (!category) return null;
	
	// בניית שרשרת הירושה (מהשורש לקטגוריה הנוכחית)
	const inheritanceChain: Array<{ id: string; name: string; template: ISpecificationField[] }> = [];
	
	// התחלה מהקטגוריה הנוכחית ועלייה בהיררכיה
	let currentCat: ICategory | null = category;
	const categoryPath: ICategory[] = [category];
	
	while (currentCat?.parentId) {
		const parentCat: ICategory | null = await Category.findById(currentCat.parentId).lean<ICategory>();
		if (!parentCat) break;
		categoryPath.unshift(parentCat); // הוספה להתחלה - סדר מהשורש
		currentCat = parentCat;
	}
	
	// בניית שרשרת הירושה עם התבניות
	for (const cat of categoryPath) {
		inheritanceChain.push({
			id: (cat._id as any).toString(),
			name: cat.name,
			template: cat.specificationTemplate || [],
		});
	}
	
	// מיזוג השדות - שדות מקטגוריות יורשות דורסים שדות מהורים
	const mergedFields = new Map<string, InheritedSpecificationField>();
	
	for (const item of inheritanceChain) {
		for (const field of item.template) {
			const inheritedField: InheritedSpecificationField = {
				...field,
				inheritedFrom: item.id === (category._id as any).toString() ? undefined : item.name,
				inheritedFromId: item.id === (category._id as any).toString() ? undefined : item.id,
				isInherited: item.id !== (category._id as any).toString(),
			};
			mergedFields.set(field.key, inheritedField);
		}
	}
	
	// המרה למערך ומיון לפי sortOrder
	const sortedFields = Array.from(mergedFields.values()).sort((a, b) => {
		const orderA = a.sortOrder ?? 999;
		const orderB = b.sortOrder ?? 999;
		return orderA - orderB;
	});
	
	return {
		categoryId: (category._id as any).toString(),
		categoryName: category.name,
		fields: sortedFields,
		inheritanceChain: inheritanceChain.map(item => ({
			id: item.id,
			name: item.name,
			fieldsCount: item.template.length,
		})),
	};
}

/**
 * עדכון תבנית מפרט טכני לקטגוריה
 */
export async function updateSpecificationTemplate(
	categoryId: string,
	template: ISpecificationField[]
): Promise<ICategory | null> {
	// ולידציה בסיסית
	if (template.length > 30) {
		throw new Error('לא ניתן להגדיר יותר מ-30 שדות בתבנית מפרט');
	}
	
	// בדיקת keys ייחודיים
	const keys = template.map(f => f.key);
	const uniqueKeys = new Set(keys);
	if (keys.length !== uniqueKeys.size) {
		throw new Error('כל שדה בתבנית חייב להיות עם key ייחודי');
	}
	
	// הוספת sortOrder אוטומטי אם לא קיים
	const normalizedTemplate = template.map((field, index) => ({
		...field,
		sortOrder: field.sortOrder ?? index,
	}));
	
	return Category.findByIdAndUpdate(
		categoryId,
		{ $set: { specificationTemplate: normalizedTemplate } },
		{ new: true }
	).lean<ICategory>();
}

