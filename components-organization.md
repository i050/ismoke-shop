# ארגון קומפוננטות בפרויקט

## מבנה כללי
לכל קומפוננטה בפרויקט יש תיקייה משלה תחת `client/src/components/...` עם שלושה קבצים קבועים:

## שלושת הקבצים בכל תיקיית קומפוננטה

### 1. Component.tsx
- הקומפוננטה עצמה (JSX ולוגיקה)
- Props ו-export ברירת מחדל
- שם הקובץ תואם לשם הקומפוננטה (PascalCase)

### 2. Component.module.css
- סגנונות מקומיים לקומפוננטה
- מניעת זליגת CSS לקומפוננטות אחרות
- שימוש ב-CSS Modules

### 3. index.ts
- קובץ ייצוא (barrel export)
- מייצא את הקומפוננטה כברירת מחדל
- מאפשר ייבוא נקי: `import Component from '@ui/Component'`

## דוגמה למבנה תיקיות

```
client/src/components/
└─ features/
   └─ products/
      └─ ProductCard/
         ├─ ProductCard.tsx        # רכיב React
         ├─ ProductCard.module.css # סגנונות מקומיים
         └─ index.ts               # export default
```

## יתרונות הארגון
- **בידוד**: כל קומפוננטה מבודדת בתיקייה משלה
- **תחזוקה**: קל למצוא ולערוך קומפוננטות
- **ניוד**: קל להעביר קומפוננטות בין פרויקטים
- **ייבוא נקי**: ייבוא פשוט ללא צורך בנתיבים ארוכים
- **בדיקה**: קל לבדוק קומפוננטות בנפרד</content>
<parameter name="filePath">c:\react-projects\ecommerce-project\components-organization.md