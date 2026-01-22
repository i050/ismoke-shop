# סיכום מפורט – רכיבי Admin בפרויקט

## צד לקוח (Client)

### דפי Admin ראשיים
- client/src/pages/Admin/Dashboard – דשבורד ניהול ראשי
- client/src/pages/Admin/Products – ניהול מוצרים
- client/src/pages/Admin/Orders – ניהול הזמנות
- client/src/pages/Admin/Categories – ניהול קטגוריות
- client/src/pages/Admin/Customers – ניהול לקוחות
- client/src/pages/Admin/CustomerGroups – ניהול קבוצות לקוחות
- client/src/pages/Admin/UserManagement – ניהול משתמשים
- client/src/pages/Admin/Banners – ניהול באנרים
- client/src/pages/Admin/Inventory – ניהול מלאי
- client/src/pages/Admin/StockAlerts – התראות מלאי
- client/src/pages/Admin/FilterAttributes – ניהול תכונות פילטר
- client/src/pages/Admin/Reports – דוחות
- client/src/pages/Admin/Settings – הגדרות מערכת
- client/src/pages/Admin/Layout – תבנית אזור ניהול (AdminLayout)
- client/src/pages/Admin/components – רכיבי עזר (NavigationPanel, TopBar)

### קומפוננטות Admin (Features)
- client/src/components/features/admin/Products – ProductForm, ProductSKUs, ProductsTable
- client/src/components/features/admin/BannerManagement – ניהול באנרים וטפסים
- client/src/components/features/admin/CustomerGroups – רשימות, טפסים ומודלים
- client/src/components/features/admin/UserManagement – רשימות, מודלים, היסטוריה

### ניתוב והגנות
- client/src/routes/router.tsx
  - נתיב אב: /admin
  - הגנת הרשאות: ProtectedRoute עם requireAdmin
  - נתיבי ילדים: orders, products, categories, customers, customer-groups, user-management, banners, inventory, filter-attributes, reports, settings, stock-alerts, test-products
- client/src/routes/ProtectedRoute.tsx
  - בדיקת תפקידים: admin או super_admin

---

## צד שרת (Server)

### Routes עם הרשאות Admin
- server/src/routes/productRoutes.ts – ניהול מוצרים (כולל /admin)
- server/src/routes/orderRoutes.ts – פעולות ניהול הזמנות
- server/src/routes/bannerRoutes.ts – ניהול באנרים
- server/src/routes/categoryRoutes.ts – ניהול קטגוריות
- server/src/routes/customerGroupRoutes.ts – ניהול קבוצות לקוחות
- server/src/routes/filterAttributeRoutes.ts – ניהול תכונות פילטר
- server/src/routes/stockAlertRoutes.ts – התראות מלאי
- server/src/routes/settingsRoutes.ts – הגדרות מערכת
- server/src/routes/userRoutes.ts – ניהול משתמשים
- server/src/routes/adminWarningsRoutes.ts – התראות ניהול
- server/src/routes/paymentRoutes.ts – פעולות תשלום רגישות
- server/src/routes/skuRoutes.ts – ניהול SKUs

### Middleware הרשאות
- server/src/middleware/roleMiddleware.ts
  - requireAdmin: מאפשר admin ו-super_admin
  - requireSuperAdmin: מאפשר super_admin בלבד
  - requireRole: בדיקת תפקידים גנרית
