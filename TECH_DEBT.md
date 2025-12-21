# 🔧 Technical Debt & Known Issues

> **מטרה:** תיעוד חובות טכניים ופלסטרים שצריך לתקן בעתיד

---

## 🟡 Priority: Low (לא דחוף)

### Issue #1: Type Mismatch - yup vs react-hook-form
**קובץ:** `client/src/components/features/admin/Products/ProductForm/ProductForm.tsx`  
**שורה:** ~75

**הבעיה:**
```typescript
// yup.InferType מחזיר שדות required (לא optional)
type YupOutput = { name: string; brand: string | null; ... }

// react-hook-form מצפה לשדות optional
type RHFExpected = { name?: string; brand?: string | null; ... }
```

**הפתרון הזמני:**
```typescript
resolver: yupResolver(productSchema) as any  // ← Type assertion
```

**פתרונות אפשריים:**
1. **Migrate to Zod** (מומלץ) - Zod מתאים יותר ל-RHF, type inference מושלם
2. **Use Partial<ProductFormData>** - כל השדות יהפכו לאופציונליים
3. **Custom Type Mapping** - יצירת טיפוס ידני עם required/optional נכון

**Timeline:** Phase 7 - Refactoring  
**Effort:** 2-3 שעות  
**Impact:** Type safety משופר, Auto-complete טוב יותר

---

### Issue #2: FieldError vs String Error Messages
**קובץ:** `client/src/components/features/admin/Products/ProductForm/ProductForm.tsx`  
**שורות:** ~395, ~402, ~409, ~416, ~423, ~430

**הבעיה:**
```typescript
// react-hook-form מחזיר FieldError objects
type RHFErrors = { name?: FieldError; ... }

// הקומפוננטות מצפות ל-string errors
type ComponentErrors = { name?: string; ... }
```

**הפתרון הזמני:**
```typescript
<ProductBasicInfo errors={errors as any} />  // ← Type assertion
```

**פתרון נכון:**
```typescript
// Option 1: Helper function
const extractErrorMessages = (errors: FieldErrors<ProductFormData>) => {
  return Object.entries(errors).reduce((acc, [key, value]) => {
    acc[key] = value?.message || '';
    return acc;
  }, {} as Record<string, string>);
};

<ProductBasicInfo errors={extractErrorMessages(errors)} />

// Option 2: Update component interfaces
interface ProductBasicInfoProps {
  errors?: FieldErrors<Pick<ProductFormData, 'name' | 'description' | 'brand'>>;
}
```

**Timeline:** Phase 7 - Refactoring  
**Effort:** 1-2 שעות  
**Impact:** Type safety, תיעוד טוב יותר

---

## ✅ למה זה לא דחוף?

1. **Runtime Validation עובד מעולה:**
   - yup בודק את כל הנתונים בזמן ריצה ✅
   - שגיאות מוצגות נכון למשתמש ✅
   - אין bugs פונקציונליים ✅

2. **Type Assertions מתועדים:**
   - כל הפלסטרים מסומנים עם TODO ✅
   - הסברנו למה ואיך לתקן ✅
   - מיקום ברור בקוד ✅

3. **קל לתקן בעתיד:**
   - הקוד מודולרי ומסודר ✅
   - התיקון לא ישפיע על functionality ✅
   - אפשר לתקן בשלב Refactoring ✅

---

## 📅 תכנית תיקון

### Phase 7: Refactoring (לאחר Phase 6)
1. ✅ החלטה: Zod או שמירה על yup
2. ✅ יצירת helper functions להמרת errors
3. ✅ הסרת כל ה-`as any` assertions
4. ✅ בדיקות regression

### Phase 8: Testing
1. ✅ Unit tests לוולידציה
2. ✅ Type tests (TypeScript compiler checks)
3. ✅ Integration tests לטפסים

---

## 📊 Tracking

| Issue | Priority | Status | ETA |
|-------|----------|--------|-----|
| #1: yup vs RHF types | 🟡 Low | 📝 Documented | Phase 7 |
| #2: FieldError vs string | 🟡 Low | 📝 Documented | Phase 7 |

**Last Updated:** Phase 5.9 (October 26, 2025)
