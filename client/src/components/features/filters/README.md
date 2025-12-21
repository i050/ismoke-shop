# filters module structure

מבנה לאחר ארגון:
```
filters/
  panel/
    FilterPanel/          # פאנל סינון נשלט (inputs בלבד)
  results/
    ProductsResults/      # הצגת מוצרים + meta + states
  container/
    FiltersContainer/     # קומפוזיציה: state + fetch + שילוב Panel/Results
  hooks/                  # useFiltersState, useFilteredProducts
  core/                   # buildQuery, parseQuery ...
  types/                  # טיפוסי FiltersState וכו'
  index.ts                # Barrel exports
  README.md               # תיעוד זה
```

עקרונות:
- Separation of Concerns: UI לקלט (panel) מופרד מהצגת תוצאות (results).
- Container Orchestration: ריכוז חיבור בין state לבין fetch.
- Expandability: קל להוסיף results/ResultsSummary או panel/AdvancedFilters.
- Barrel: שימוש ב- index.ts לייבוא חיצוני קצר.

שלבים עתידיים:
- הוספת URL sync hook (sync/ למשל) אם יגדל.
- פיצול meta / pagination לרכיבים ייעודיים בתוך results/.
