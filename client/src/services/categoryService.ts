/**
 * שירות קטגוריות בצד הלקוח
 * מטרות:
 * 1. משיכת רשימת קטגוריות כעץ (השרת מספק /api/categories/tree)
 * 2. CRUD מלא לניהול קטגוריות (Admin)
 * 3. קאש בזיכרון למניעת קריאות חוזרות
 * 4. טיפוס עץ עקבי לשימוש ב-CategoriesTree
 */

import { ApiError } from '../utils/ApiError';
import type { 
	CategoryCreateRequest, 
	CategoryUpdateRequest, 
	CategoryStats, 
	CategoryDeleteOptions,
	CategoryDeleteResult,
	CategoryReorderItem,
	Category 
} from '../types/Category';

// ===== טיפוסים =====

// צומת בעץ קטגוריות - כולל שדות חדשים
export interface CategoryTreeNodeClient {
	_id: string;
	name: string;
	slug: string;
	parentId: string | null;
	children: CategoryTreeNodeClient[];
	// שדות חדשים (אופציונליים לתאימות אחורה)
	level?: number;
	path?: string;
	isActive?: boolean;
	sortOrder?: number;
	description?: string;
}

// ===== קבועים =====

const API_BASE_URL = 'http://localhost:5000/api';

// ===== קאש =====

let cachedTree: CategoryTreeNodeClient[] | null = null;
let inFlight: Promise<CategoryTreeNodeClient[]> | null = null;

// ===== פונקציות עזר פנימיות =====

/**
 * פונקציית fetch גנרית עם טיפול בשגיאות
 */
async function apiFetch<T>(
	endpoint: string, 
	options?: RequestInit
): Promise<T> {
	const res = await fetch(`${API_BASE_URL}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
		...options,
	});
	
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		let message = text || res.statusText || 'שגיאה בקריאה לשרת';
		
		// ניסיון לפרסר JSON לקבלת הודעת שגיאה מפורטת
		try {
			const json = JSON.parse(text);
			if (json.message) message = json.message;
			if (json.error) message = json.error;
		} catch {
			// לא JSON - נשתמש בטקסט כמו שהוא
		}
		
		throw new ApiError(res.status, message);
	}
	
	// אם התגובה ריקה (למשל DELETE), החזר undefined
	const contentLength = res.headers.get('content-length');
	if (contentLength === '0' || res.status === 204) {
		return undefined as T;
	}
	
	return res.json();
}

// ===== פונקציות ציבוריות - קריאה =====

/**
 * טעינת עץ קטגוריות מהשרת
 */
async function fetchTree(): Promise<CategoryTreeNodeClient[]> {
	return apiFetch<CategoryTreeNodeClient[]>('/categories/tree');
}

/**
 * מחזיר עץ קטגוריות עם קאש בזיכרון.
 * אם יש בקשה בעיצומה – מחזיר את אותה הבטחה למניעת מרוץ.
 */
export async function getCategoriesTree(): Promise<CategoryTreeNodeClient[]> {
	if (cachedTree) return cachedTree;
	if (inFlight) return inFlight;
	
	inFlight = fetchTree()
		.then(tree => {
			cachedTree = tree;
			return tree;
		})
		.finally(() => {
			inFlight = null;
		});
		
	return inFlight;
}

/**
 * קבלת קטגוריות פעילות בלבד (לחנות)
 */
export async function getActiveCategoriesTree(): Promise<CategoryTreeNodeClient[]> {
	return apiFetch<CategoryTreeNodeClient[]>('/categories/tree/active');
}

/**
 * קבלת קטגוריה בודדת לפי ID
 */
export async function getCategoryById(id: string): Promise<Category> {
	return apiFetch<Category>(`/categories/${id}`);
}

/**
 * קבלת סטטיסטיקות קטגוריה
 */
export async function getCategoryStats(id: string): Promise<CategoryStats> {
	return apiFetch<CategoryStats>(`/categories/stats/${id}`);
}

// ===== פונקציות ציבוריות - CRUD =====

/**
 * יצירת קטגוריה חדשה
 */
export async function createCategory(data: CategoryCreateRequest): Promise<Category> {
	const result = await apiFetch<Category>('/categories', {
		method: 'POST',
		body: JSON.stringify(data),
	});
	
	// איפוס קאש אחרי יצירה
	invalidateCategoriesCache();
	
	return result;
}

/**
 * עדכון קטגוריה קיימת
 */
export async function updateCategory(id: string, data: CategoryUpdateRequest): Promise<Category> {
	const result = await apiFetch<Category>(`/categories/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data),
	});
	
	// איפוס קאש אחרי עדכון
	invalidateCategoriesCache();
	
	return result;
}

/**
 * מחיקה פשוטה של קטגוריה (ללא בדיקות)
 */
export async function deleteCategory(id: string): Promise<void> {
	await apiFetch<void>(`/categories/${id}`, {
		method: 'DELETE',
	});
	
	// איפוס קאש אחרי מחיקה
	invalidateCategoriesCache();
}

/**
 * מחיקה בטוחה של קטגוריה עם אפשרויות
 */
export async function safeDeleteCategory(
	id: string, 
	options?: CategoryDeleteOptions
): Promise<CategoryDeleteResult> {
	const result = await apiFetch<CategoryDeleteResult>(`/categories/${id}/safe`, {
		method: 'DELETE',
		body: JSON.stringify(options || {}),
	});
	
	// איפוס קאש אחרי מחיקה
	invalidateCategoriesCache();
	
	return result;
}

/**
 * שינוי סדר קטגוריות (batch update)
 */
export async function reorderCategories(items: CategoryReorderItem[]): Promise<void> {
	await apiFetch<void>('/categories/reorder', {
		method: 'POST',
		body: JSON.stringify({ items }),
	});
	
	// איפוס קאש אחרי שינוי סדר
	invalidateCategoriesCache();
}

// ===== פונקציות קאש =====

/**
 * איפוס קאש - אילוץ טעינה מחדש בפעם הבאה
 */
export function invalidateCategoriesCache(): void {
	cachedTree = null;
}

/**
 * גישה לקאש הנוכחי (סינכרוני) - מחזיר null אם אין קאש
 */
export function getCachedCategoriesTree(): CategoryTreeNodeClient[] | null {
	return cachedTree;
}

// ===== פונקציות עזר =====

/**
 * חיפוש צומת בעץ לפי id
 */
export function findNodeById(
	tree: CategoryTreeNodeClient[], 
	id: string
): CategoryTreeNodeClient | null {
	for (const node of tree) {
		if (node._id === id) return node;
		const found = findNodeById(node.children, id);
		if (found) return found;
	}
	return null;
}

/**
 * חיפוש צומת בעץ לפי שם (case insensitive)
 */
export function findNodeByName(
	tree: CategoryTreeNodeClient[], 
	name: string
): CategoryTreeNodeClient | null {
	const lowerName = name.toLowerCase();
	for (const node of tree) {
		if (node.name.toLowerCase() === lowerName) return node;
		const found = findNodeByName(node.children, name);
		if (found) return found;
	}
	return null;
}

/**
 * קבלת כל ה-IDs של צאצאים (שטוח)
 */
export function getDescendantIds(
	tree: CategoryTreeNodeClient[], 
	parentId: string
): string[] {
	const result: string[] = [];
	
	const collectDescendants = (nodes: CategoryTreeNodeClient[]) => {
		for (const node of nodes) {
			if (node.parentId === parentId || result.includes(node.parentId || '')) {
				result.push(node._id);
			}
			if (node.children.length > 0) {
				collectDescendants(node.children);
			}
		}
	};
	
	// מצא את הצומת ואסוף את הצאצאים שלו
	const parentNode = findNodeById(tree, parentId);
	if (parentNode && parentNode.children.length > 0) {
		const collectFromNode = (node: CategoryTreeNodeClient) => {
			for (const child of node.children) {
				result.push(child._id);
				collectFromNode(child);
			}
		};
		collectFromNode(parentNode);
	}
	
	return result;
}

/**
 * המרת עץ לרשימה שטוחה
 */
export function flattenTree(tree: CategoryTreeNodeClient[]): CategoryTreeNodeClient[] {
	const result: CategoryTreeNodeClient[] = [];
	
	const flatten = (nodes: CategoryTreeNodeClient[]) => {
		for (const node of nodes) {
			result.push(node);
			if (node.children.length > 0) {
				flatten(node.children);
			}
		}
	};
	
	flatten(tree);
	return result;
}
