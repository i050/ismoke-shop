# הטמעת סינון קטגוריות בניהול מלאי

## סיכום השינויים

הוספנו אפשרות לסנן מלאי לפי קטגוריות, בדומה למה שקיים בדף ניהול המוצרים.

## מטרת הפיצ'ר

- **עקביות**: יצירת חוויה אחידה בין דף ניהול המוצרים לדף ניהול המלאי
- **נוחות**: מנהל חנות יכול לראות מלאי של קטגוריה ספציפית (לדוגמה: "כמה יש לי נעליים במלאי?")
- **יעילות**: סינון מהיר של מוצרים לפי קטגוריות במקום גלילה על כל המלאי

---

## שינויים בצד השרת (Backend)

### 1. **productService.ts** - ייצוא פונקציית עזר
**קובץ**: `server/src/services/productService.ts`

#### שינויים:
- ייצוא הפונקציה `collectCategoryAndDescendantIds` כ-`export` כדי שתהיה נגישה משירותים אחרים
- הפונקציה אוספת קטגוריה + כל הצאצאים שלה באופן רקורסיבי (BFS)

```typescript
export async function collectCategoryAndDescendantIds(
  rootId: mongoose.Types.ObjectId,
  includeInactive: boolean = false
): Promise<mongoose.Types.ObjectId[]>
```

### 2. **skuService.ts** - שירות SKU
**קובץ**: `server/src/services/skuService.ts`

#### שינויים:
- ייבוא `collectCategoryAndDescendantIds` מ-productService
- שינוי אלגוריתם הסינון מ-aggregation pipeline ל-שאילתה פשוטה עם `$in`
- הפונקציה כעת:
  1. אוספת את הקטגוריה + כל הצאצאים שלה
  2. מוצאת את כל המוצרים בקטגוריות אלו
  3. מסננת SKUs לפי המוצרים שנמצאו
  4. משתמשת ב-`populate` רגיל (יותר יעיל מ-aggregation)

```typescript
import { collectCategoryAndDescendantIds } from './productService';

// בתוך getInventorySkus:
if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
  // איסוף הקטגוריה + צאצאים
  const categoryObjectId = new mongoose.Types.ObjectId(categoryId);
  const allCategoryIds = await collectCategoryAndDescendantIds(categoryObjectId);

  // שליפת מוצרים בקטגוריות אלו
  const productsInCategories = await Product.find({
    categoryId: { $in: allCategoryIds }
  }).select('_id').lean();

  const productIds = productsInCategories.map(p => p._id);

  // סינון SKUs לפי המוצרים
  matchStage.productId = { $in: productIds };
  
  // שאילתה רגילה עם populate (יותר יעיל)
  skus = await Sku.find(matchStage)
    .sort(sortStage)
    .skip(skip)
    .limit(limit)
    .populate('productId', 'name category slug images lowStockThreshold')
    .lean();
}
```

**למה זה יותר טוב:**
- ✅ **עקביות**: שימוש באותה לוגיקה כמו ניהול מוצרים
- ✅ **ביצועים**: `find` + `populate` מהיר יותר מ-aggregation pipeline במקרה זה
- ✅ **תחזוקה**: קוד פשוט יותר, קל לקריאה ולתחזוקה
- ✅ **DRY**: אין כפילות קוד - משתמשים בפונקציה קיימת
**קובץ**: `server/src/controllers/skuController.ts`

#### שינויים:
```typescript
const categoryId = (req.query.categoryId as string) || undefined;

const result = await skuService.getInventorySkus({
  page,
  limit,
  search,
  sortBy,
  sortOrder,
  stockFilter,
  categoryId, // ✨ העברת הפרמטר לשירות
});
```

---

## שינויים בצד הלקוח (Frontend)

### 1. **inventoryService.ts** - שירות מלאי
**קובץ**: `client/src/services/inventoryService.ts`

#### שינויים:
```typescript
export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  stockFilter?: 'all' | 'low' | 'out' | 'in';
  categoryId?: string; // ✨ חדש
}
```

```typescript
const searchParams = new URLSearchParams({
  page: String(filters.page || 1),
  limit: String(filters.limit || 50),
  sortBy: filters.sortBy || 'sku',
  sortOrder: filters.sortOrder || 'asc',
  stockFilter: filters.stockFilter || 'all',
});

if (filters.search) {
  searchParams.append('search', filters.search);
}

if (filters.categoryId) {
  searchParams.append('categoryId', filters.categoryId); // ✨ חדש
}
```

### 2. **InventoryManagementPage.tsx** - דף ניהול מלאי
**קובץ**: `client/src/pages/Admin/Inventory/InventoryManagementPage.tsx`

#### שינויים עיקריים:

**ייבואים חדשים**:
```typescript
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { fetchCategoriesTree } from '../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '../../../services/categoryService';
import { NativeSelect } from '../../../components/ui';
```

**פונקציה עזר לשיטוח עץ קטגוריות**:
```typescript
const flattenCategoryTree = (
  nodes: CategoryTreeNodeClient[],
  depth = 0
): Array<{ value: string; label: string; depth: number }> => {
  const result: Array<{ value: string; label: string; depth: number }> = [];
  
  for (const node of nodes) {
    const indent = depth > 0 ? '—'.repeat(depth) + ' ' : '';
    result.push({
      value: node._id,
      label: `${indent}${node.name}`,
      depth,
    });
    
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  
  return result;
};
```

**קבלת קטגוריות מ-Redux**:
```typescript
const dispatch = useAppDispatch();
const { tree: categories, loading: categoriesLoading } = useAppSelector(
  (state) => state.categories
);
```

**טעינת קטגוריות**:
```typescript
useEffect(() => {
  if (categories.length === 0) {
    dispatch(fetchCategoriesTree());
  }
}, [dispatch, categories.length]);
```

**יצירת אפשרויות לבחירה (memoized)**:
```typescript
const categoryOptions = useMemo(() => {
  const flatCategories = flattenCategoryTree(categories);
  return [
    { value: 'all', label: 'כל הקטגוריות' },
    ...flatCategories.map((cat) => ({
      value: cat.value,
      label: cat.label,
    })),
  ];
}, [categories]);
```

**Handler לשינוי קטגוריה**:
```typescript
const handleCategoryChange = (value: string) => {
  setFilters((prev) => ({
    ...prev,
    categoryId: value === 'all' ? undefined : value,
    page: 1,
  }));
};
```

**UI Component**:
```tsx
{/* פילטר קטגוריה */}
<div className={styles.filterGroup}>
  <label className={styles.filterLabel}>
    <Icon name="FolderTree" size={16} />
    קטגוריה
  </label>
  <NativeSelect
    options={categoryOptions}
    value={filters.categoryId || 'all'}
    onChange={handleCategoryChange}
    disabled={categoriesLoading}
    standalone
    className={styles.categorySelect}
  />
</div>
```

### 3. **InventoryManagementPage.module.css** - עיצוב
**קובץ**: `client/src/pages/Admin/Inventory/InventoryManagementPage.module.css`

#### שינויים:
```css
.filterLabel {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-secondary, #666);
  font-weight: var(--font-weight-medium, 500);
  display: flex; /* ✨ חדש - לתמיכה באייקון */
  align-items: center;
  gap: var(--spacing-xs);
}

.categorySelect {
  min-width: 200px; /* ✨ חדש */
}
```

---

## מה הפיצ'ר עושה?

1. **בחירת קטגוריה**: המשתמש יכול לבחור קטגוריה מרשימה נפתחת היררכית
2. **סינון היררכי**: ברגע שקטגוריה נבחרת, הרשימה מסתננת ל-SKUs של מוצרים מהקטגוריה **וגם מכל הקטגוריות הבנות שלה**
3. **חזרה לעמוד ראשון**: כל שינוי בקטגוריה מחזיר לעמוד 1 (כמו בחיפוש)
4. **תצוגה היררכית**: קטגוריות משנה מוצגות עם אינדנטציה (`—`)
5. **שילוב עם פילטרים אחרים**: הסינון עובד יחד עם חיפוש, סינון מלאי, ומיון
6. **עקביות מלאה**: התנהגות זהה לדף ניהול מוצרים - בחירת "ביגוד" תציג גם חולצות, מכנסיים וכל מה שתחת ביגוד

---

## דוגמאות שימוש

### דוגמה 1: צפייה במלאי של קטגוריה ספציפית
1. המשתמש נכנס לדף ניהול מלאי
2. בוחר "בגדים" מתפריט הקטגוריות
3. רואה SKUs של מוצרים מקטגוריית בגדים **וגם** מכל הקטגוריות הבנות (חולצות, מכנסיים וכו')

### דוגמה 2: שילוב עם סינון מלאי
1. בוחר קטגוריה "נעליים"
2. לוחץ על "מלאי נמוך"
3. רואה **כל** הנעליים (כולל סוגי משנה) עם מלאי נמוך

### דוגמה 3: חיפוש בקטגוריה
1. בוחר "אלקטרוניקה"
2. מקליד "iPhone" בחיפוש
3. רואה רק SKUs של iPhone מקטגוריית אלקטרוניקה **וכל תתי הקטגוריות שלה**

---

## תאימות לאחור

- ✅ הפרמטר `categoryId` הוא **אופציונלי**
- ✅ אם לא נשלח - הקוד עובד בדיוק כמו קודם
- ✅ לא משנה שום דבר בממשק קיים
- ✅ לא משפיע על קריאות API קיימות

---

## בדיקות מומלצות

### Backend
- [ ] לקרוא ל-`GET /api/skus/inventory` ללא `categoryId` - צריך להחזיר את כל ה-SKUs
- [ ] לקרוא עם `categoryId` של קטגורית אב - צריך להחזיר SKUs של הקטגוריה **וכל הצאצאים**
- [ ] לקרוא עם `categoryId` של קטגורית עלה (ללא צאצאים) - צריך להחזיר רק SKUs מקטגוריה זו
- [ ] לקרוא עם `categoryId` שלא קיים - צריך להחזיר רשימה ריקה
- [ ] לקרוא עם `categoryId` לא תקין (לא ObjectId) - צריך להחזיר את כל ה-SKUs (fallback)

### Frontend
- [ ] לבדוק שהתפריט נפתח ומציג את כל הקטגוריות
- [ ] לבחור קטגורית אב ולוודא שהרשימה מסתננת **כולל צאצאים**
- [ ] לבחור קטגורית עלה ולוודא שרואים רק ממנה
- [ ] לבחור "כל הקטגוריות" ולוודא שמוצגים כל ה-SKUs
- [ ] לשלב עם חיפוש וסינון מלאי
- [ ] לוודא שהספירה (total) נכונה גם עם סינון קטגוריה

---

## סיכום

הפיצ'ר הושלם בהצלחה! ✨

- **Backend**: עודכן ב-2 קבצים (productService - ייצוא פונקציה, skuService - שינוי אלגוריתם)
- **Frontend**: עודכן ב-2 קבצים (InventoryManagementPage, CSS)
- **תאימות**: מלאה עם קוד קיים - שימוש בפונקציה קיימת (DRY)
- **ביצועים**: יותר יעיל - `find` + `populate` במקום aggregation pipeline
- **חוויית משתמש**: עקבית עם דף ניהול מוצרים - **סינון היררכי מלא**
- **תחזוקה**: קוד פשוט יותר וקל לתחזוקה
