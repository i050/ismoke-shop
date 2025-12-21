# 🚀 Button Component - Enterprise Grade Upgrade

## מה השתנה?

הכפתור שודרג מגרסה בסיסית לגרסה ברמה **אנטרפרייז מקצועית** המתאימה לאתר מכירות גדול.

---

## ✨ תכונות חדשות

### 1. **forwardRef** - גישה ישירה לאלמנט
```tsx
const buttonRef = useRef<HTMLButtonElement>(null);

<Button ref={buttonRef} onClick={() => buttonRef.current?.focus()}>
  לחץ כאן
</Button>
```

### 2. **Loading State** - מצב טעינה עם ספינר
```tsx
<Button loading={isLoading} onClick={handleSubmit}>
  {isLoading ? 'שולח...' : 'שלח'}
</Button>
```

### 3. **Icons** - תמיכה באייקונים משני הצדדים
```tsx
import { Icon } from '@ui';

<Button icon={<Icon name="ShoppingCart" />} iconPosition="left">
  הוסף לעגלה
</Button>

<Button icon={<Icon name="ArrowLeft" />} iconPosition="right">
  הבא
</Button>
```

### 4. **Variants חדשים**
```tsx
// 6 סוגים במקום 3
<Button variant="primary">ראשי</Button>
<Button variant="secondary">משני</Button>
<Button variant="outline">מתאר</Button>
<Button variant="ghost">שקוף</Button>      {/* חדש! */}
<Button variant="danger">מסוכן</Button>     {/* חדש! */}
<Button variant="success">הצלחה</Button>    {/* חדש! */}
```

### 5. **Sizes מורחבים**
```tsx
// 5 גדלים במקום 3
<Button size="xs">זעיר</Button>      {/* חדש! */}
<Button size="sm">קטן</Button>       {/* שינוי מ-small */}
<Button size="md">בינוני</Button>    {/* שינוי מ-medium */}
<Button size="lg">גדול</Button>      {/* שינוי מ-large */}
<Button size="xl">ענק</Button>       {/* חדש! */}
```

### 6. **Modifiers - שינויים מיוחדים**
```tsx
// רוחב מלא
<Button fullWidth>כפתור ברוחב מלא</Button>

// עגול לגמרי
<Button rounded>עגול</Button>

// מורם עם צל חזק
<Button elevated>מורם</Button>
```

### 7. **נגישות מלאה (ARIA)**
```tsx
<Button aria-label="סגור חלון">
  ✕
</Button>

// הכפתור מוסיף אוטומטית:
// - aria-busy={loading}
// - aria-disabled={disabled || loading}
// - focus-visible outline
```

---

## 🔄 שינויים שצריכים עדכון

### ⚠️ שינוי שמות Sizes (חובה!)
```tsx
// ❌ לפני (לא עובד יותר)
<Button size="small">קטן</Button>
<Button size="medium">בינוני</Button>
<Button size="large">גדול</Button>

// ✅ אחרי (נכון)
<Button size="sm">קטן</Button>
<Button size="md">בינוני</Button>
<Button size="lg">גדול</Button>
```

**הערה:** כבר תוקן אוטומטית בכל הפרויקט! ✅

---

## 📖 דוגמאות שימוש מתקדמות

### דוגמה 1: כפתור "הוסף לעגלה" עם loading
```tsx
import { useState } from 'react';
import { Button } from '@ui';
import { Icon } from '@ui';

function AddToCartButton() {
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    setLoading(true);
    await addToCart(productId);
    setLoading(false);
  };

  return (
    <Button 
      variant="primary" 
      size="lg"
      loading={loading}
      icon={<Icon name="ShoppingCart" />}
      onClick={handleAddToCart}
      elevated
    >
      {loading ? 'מוסיף...' : 'הוסף לעגלה'}
    </Button>
  );
}
```

### דוגמה 2: כפתורי פעולה בכרטיס מוצר
```tsx
<div className={styles.productActions}>
  {/* כפתור ראשי גדול */}
  <Button 
    variant="primary" 
    size="lg" 
    fullWidth
    icon={<Icon name="ShoppingCart" />}
    onClick={handleAddToCart}
  >
    הוסף לעגלה
  </Button>

  {/* כפתורים משניים קטנים */}
  <div className={styles.secondaryActions}>
    <Button 
      variant="ghost" 
      size="sm"
      icon={<Icon name="Heart" />}
    >
      אהבתי
    </Button>
    
    <Button 
      variant="ghost" 
      size="sm"
      icon={<Icon name="Share2" />}
    >
      שתף
    </Button>
  </div>
</div>
```

### דוגמה 3: כפתור מסוכן עם אישור
```tsx
<Button 
  variant="danger" 
  size="md"
  icon={<Icon name="Trash2" />}
  onClick={handleDelete}
  aria-label="מחק מוצר"
>
  מחק
</Button>
```

### דוגמה 4: כפתור הצלחה אחרי פעולה
```tsx
const [saved, setSaved] = useState(false);

<Button 
  variant={saved ? "success" : "primary"}
  icon={saved ? <Icon name="Check" /> : <Icon name="Save" />}
  onClick={handleSave}
>
  {saved ? 'נשמר!' : 'שמור'}
</Button>
```

### דוגמה 5: כפתורים בשורה (Group)
```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
  <Button variant="outline" size="sm">
    ביטול
  </Button>
  <Button variant="primary" size="sm" loading={submitting}>
    אישור
  </Button>
</div>
```

---

## 🎨 CSS Design Tokens

הכפתור משתמש במשתני CSS מהמערכת המאוחדת:

```css
/* צבעים */
--brand-primary
--brand-accent
--state-success
--state-error
--state-warning

/* רווחים */
--spacing-xs, --spacing-sm, --spacing-md, --spacing-lg, --spacing-xl

/* צללים */
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl, --shadow-2xl

/* מעברים */
--transition-fast, --transition-normal, --transition-slow

/* טיפוגרפיה */
--font-size-xs, --font-size-sm, --font-size-base, --font-size-lg
--font-weight-semibold, --font-weight-bold
```

---

## 🎯 השוואה: לפני ואחרי

| תכונה | לפני | אחרי |
|-------|------|------|
| **Variants** | 3 | 6 |
| **Sizes** | 3 | 5 |
| **Loading State** | ❌ | ✅ |
| **Icons** | ❌ | ✅ |
| **forwardRef** | ❌ | ✅ |
| **ARIA** | חלקי | מלא |
| **Design Tokens** | חלקי | מלא |
| **Modifiers** | 0 | 3 (fullWidth, rounded, elevated) |
| **Spinner** | ❌ | ✅ |
| **Focus-visible** | ❌ | ✅ |

---

## 🚦 מצבים אוטומטיים

הכפתור מטפל אוטומטית במצבים הבאים:

1. **Disabled** - מושבת לחלוטין (opacity 0.5, no pointer events)
2. **Loading** - cursor: wait, תוכן שקוף, ספינר מסתובב
3. **Hover** - transform, shadow, brightness
4. **Active** - transform מופחת
5. **Focus-visible** - outline כחול לנגישות

---

## ✅ Checklist עדכון

- [x] שינוי `size="small"` → `size="sm"` (בוצע אוטומטית)
- [x] שינוי `size="medium"` → `size="md"` (בוצע אוטומטית)
- [x] שינוי `size="large"` → `size="lg"` (בוצע אוטומטית)
- [ ] הוספת loading states בכפתורי submit
- [ ] הוספת icons לכפתורים מרכזיים
- [ ] שימוש ב-elevated בכפתורים חשובים
- [ ] הוספת aria-label לכפתורים ללא טקסט

---

## 📚 TypeScript Props מלא

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
  elevated?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  // + כל ה-props של HTMLButtonElement (onClick, onBlur, className, ...)
}
```

---

## 🎓 Best Practices

### 1. **השתמש ב-loading state בפעולות async**
```tsx
// ✅ נכון
<Button loading={isSubmitting} onClick={handleSubmit}>שלח</Button>

// ❌ לא נכון
<Button disabled={isSubmitting} onClick={handleSubmit}>שלח</Button>
```

### 2. **הוסף aria-label לכפתורים ללא טקסט**
```tsx
// ✅ נכון
<Button aria-label="סגור">✕</Button>

// ❌ לא נכון
<Button>✕</Button>
```

### 3. **השתמש ב-variant המתאים**
```tsx
// ✅ נכון - פעולה ראשית
<Button variant="primary">הוסף לעגלה</Button>

// ✅ נכון - פעולה משנית
<Button variant="secondary">המשך לגלוש</Button>

// ✅ נכון - פעולה מסוכנת
<Button variant="danger">מחק חשבון</Button>
```

### 4. **שמור על היררכיה חזותית**
```tsx
<div className={styles.actions}>
  {/* כפתור ראשי - גדול ובולט */}
  <Button variant="primary" size="lg" elevated>
    קנה עכשיו
  </Button>
  
  {/* כפתור משני - קטן יותר */}
  <Button variant="outline" size="md">
    הוסף לעגלה
  </Button>
  
  {/* כפתורים טרטיאריים - ghost */}
  <Button variant="ghost" size="sm">שתף</Button>
</div>
```

---

## 🎉 סיכום

הכפתור עכשיו **ברמה אנטרפרייז מלאה** עם:
- ✅ נגישות מלאה
- ✅ Loading states
- ✅ Icons support
- ✅ forwardRef
- ✅ Design tokens מלאים
- ✅ 6 variants + 5 sizes
- ✅ Modifiers (fullWidth, rounded, elevated)
- ✅ TypeScript מלא
- ✅ Responsive

**זה כפתור שמתאים לאתר מכירות מקצועי וגדול!** 🚀
