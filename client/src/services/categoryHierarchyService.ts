import type { CategoryTreeNodeClient } from './categoryService';

// טיפוס עזר למפת צאצאים לכל קטגוריה
export type CategoryDescendantsMap = Map<string, string[]>;

// פונקציה רקורסיבית שמייצרת מפת צאצאים יעילה לכל קטגוריה בעץ
export function buildCategoryDescendantsMap(tree: CategoryTreeNodeClient[] = []): CategoryDescendantsMap {
	const map: CategoryDescendantsMap = new Map();

	const collect = (node: CategoryTreeNodeClient | null): string[] => {
		if (!node) return [];
		const descendants: string[] = [];
		if (node.children?.length) {
			for (const child of node.children) {
				descendants.push(child._id);
				descendants.push(...collect(child));
			}
		}
		map.set(node._id, descendants);
		return descendants.slice();
	};

	for (const root of tree) {
		collect(root);
	}

	return map;
}

// מחזיר את כל הצאצאים (רקורסיבי) עבור קטגוריה בודדת
export function getAllDescendantIds(tree: CategoryTreeNodeClient[], parentId: string): string[] {
	const result: string[] = [];
	const find = (nodes: CategoryTreeNodeClient[]) => {
		for (const node of nodes) {
			if (node.parentId === parentId) {
				result.push(node._id);
				if (node.children?.length) {
					result.push(...getAllDescendantIds(node.children, node._id));
				}
			} else if (node.children?.length) {
				find(node.children);
			}
		}
	};
	find(tree);
	return result;
}

// מחזיר רשימת צאצאים מתוך מפת צאצאים מזוהה
export function getDescendantsFromMap(map: CategoryDescendantsMap, parentId: string): string[] {
	return map.get(parentId) ? [...map.get(parentId)!] : [];
}

// מחזיר true אם כל הצאצאים נבחרו
export function areAllDescendantsSelected(tree: CategoryTreeNodeClient[], parentId: string, selected: string[]): boolean {
	const all = getAllDescendantIds(tree, parentId);
	return all.length > 0 && all.every(id => selected.includes(id));
}

// מחזיר true אם יש לפחות צאצא אחד נבחר
export function areSomeDescendantsSelected(tree: CategoryTreeNodeClient[], parentId: string, selected: string[]): boolean {
	const all = getAllDescendantIds(tree, parentId);
	return all.some(id => selected.includes(id));
}
