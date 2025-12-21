# תכנית עבודה מפורטת - מערכת סל קניות מתקדם

## סקירה כללית

מסמך זה מהווה **תכנית עבודה הדרגתית ומסודרת** לבניית מערכת סל קניות מקצועית.  
הפרויקט בנוי על: **Node.js + Express + MongoDB** (Backend) | **React + TypeScript** (Frontend)

העבודה מחולקת ל-**5 שלבים (Phases)** עיקריים, כאשר כל שלב בנוי על הקודם ומכיל:
- ✅ משימות ברורות
- 🎯 קריטריוני הצלחה
- 🔗 תלויות בין שלבים

---

## � מצב קיים במערכת - מה כבר מוכן?

### ✅ תשתיות קיימות (ניתן לשימוש מיידי)

#### **Backend Infrastructure**
- ✅ **MongoDB + Mongoose** - מוגדר ב-`server/src/config/database.ts`
- ✅ **Express Server** - `server/src/server.ts` פועל
- ✅ **JWT Authentication** - `server/src/middleware/authMiddleware.ts` מלא
- ✅ **Winston Logger** - `server/src/utils/logger.ts` (לוגים לקבצים + console)
- ✅ **Email Service** - `server/src/services/emailService.ts` (Nodemailer מוכן)
- ✅ **Product Service** - `server/src/services/productService.ts` (לוגיקה עסקית)
- ✅ **Pricing Service** - `server/src/services/pricingService.ts` (חישובי מחירים)
- ✅ **Helmet.js** - אבטחה בסיסית מוגדרת

#### **Frontend Infrastructure**
- ✅ **Redux Store** - `client/src/store/index.ts` מוכן (יש placeholder ל-cartSlice)
- ✅ **Redux Slices קיימים** - authSlice, categoriesSlice, customerGroupsSlice, userManagementSlice, productsSlice
- ✅ **UI Components Library** - `client/src/components/ui/` (Button, Icon, Typography, Card, Modal, Input, Badge, Skeleton)
- ✅ **React Router v7** - ניווט מוגדר ב-`client/src/routes/AppRoutes.tsx`
- ✅ **Socket.io** - `client/src/hooks/useSocket.ts` + `server/src/socket.ts` (WebSocket מוכן)
- ✅ **Axios Interceptors** - `client/src/utils/httpInterceptor.ts` (טיפול בטוקנים ושגיאות)

#### **Product Components (חלקיים - צריכים חיבור)**
- ✅ **ProductCard** - `client/src/components/features/products/ProductCard.tsx` (יש `onAddToCart` handler)
- ✅ **ProductDetail** - `client/src/components/features/products/ProductDetail.tsx` (יש `onAddToCart` handler)
- ✅ **ProductGrid** - `client/src/components/features/products/ProductGrid.tsx` (יש `onAddToCart` handler)
- ✅ **ProductCarousel** - `client/src/components/features/products/ProductCarousel.tsx` (יש `onAddToCart` handler)

#### **Cart UI Placeholders (קיים בUI, צריך חיבור)**
- ✅ **Header with Cart Icon** - `client/src/components/layout/Header/Header.tsx` (אייקון + count סטטי "2")
- ✅ **Footer with Cart Link** - `client/src/components/layout/Footer/Footer.tsx` (לינק ל-`/cart`)

#### **Existing Models**
- ✅ **Product Model** - `server/src/models/Product.ts`
- ✅ **User Model** - `server/src/models/User.ts`
- ✅ **Category Model** - `server/src/models/Category.ts`
- ✅ **CustomerGroup Model** - `server/src/models/CustomerGroup.ts`

---

### ❌ חסר לחלוטין (צריך לבנות מאפס)

#### **Backend - Cart System**
- ❌ **Cart Model** - `server/src/models/Cart.ts` לא קיים
- ❌ **Cart Controller** - `server/src/controllers/cartController.ts` לא קיים
- ❌ **Cart Routes** - `server/src/routes/cartRoutes.ts` לא קיים
- ❌ **Cart Service** - לוגיקת חישובים והמלצות
- ❌ **Coupon Model** - מודל קופונים
- ❌ **Abandoned Cart Logic** - Cron jobs ו-email automation

#### **Frontend - Cart Features**
- ❌ **cartSlice** - `client/src/store/slices/cartSlice.ts` לא קיים (יש רק comment placeholder)
- ❌ **Cart Service** - `client/src/services/cartService.ts` לא קיים (API calls)
- ❌ **MiniCart Component** - Sidebar/Drawer לסל מהיר
- ❌ **CartPage** - דף סל מלא
- ❌ **CartItem Component** - תצוגת פריט בסל
- ❌ **QuantitySelector** - בורר כמות
- ❌ **CouponInput** - שדה קופון
- ❌ **Save for Later** - פיצ'ר שמירה לאחר כך
- ❌ **Recommendations** - המלצות מוצרים

#### **Advanced Features**
- ❌ **Merge Carts** - מיזוג סל אורח→משתמש
- ❌ **Analytics Integration** - Google Analytics events, custom dashboard
- ❌ **A/B Testing** - תשתית ניסויים
- ❌ **E2E Tests** - Playwright/Cypress לזרימת סל
- ❌ **Load Testing** - בדיקות עומס

---

### 🔧 דורש חיבור בלבד (קיים בUI, צריך state/API)

#### **Add to Cart Flow**
- 🔧 **קומפוננטות מוצרים** - יש `onAddToCart` props, צריך handler שמתחבר ל-Redux + API
- 🔧 **Cart Icon** - קיים בHeader, צריך להחליף count סטטי בדינמי מ-Redux
- 🔧 **Cart Link** - קיים בFooter, צריך שהדף `/cart` יעבוד
- 🔧 **Redux Store** - מוכן, צריך רק להוסיף את ה-cartSlice

#### **Infrastructure Ready for Use**
- 🔧 **emailService** - מוכן לשלוח abandoned cart emails
- 🔧 **pricingService** - מוכן לחישובי מחירים בסל
- 🔧 **authMiddleware** - מוכן להגן על endpoints של הסל
- 🔧 **Socket.io** - מוכן לעדכוני מלאי בזמן אמת

---

## �📋 תוכן עניינים

1. [Phase 0: הכנה ותשתיות](#phase-0-הכנה-ותשתיות)
2. [Phase 1: Backend - בסיס הסל](#phase-1-backend---בסיס-הסל)
3. [Phase 2: Frontend - ממשק משתמש בסיסי](#phase-2-frontend---ממשק-משתמש-בסיסי)
4. [Phase 3: פיצ'רים מתקדמים](#phase-3-פיצ׳רים-מתקדמים)
5. [Phase 4: אופטימיזציה ואנליטיקה](#phase-4-אופטימיזציה-ואנליטיקה)
6. [Phase 5: הקשחה ו-Production Ready](#phase-5-הקשחה-ו-production-ready)
7. [נספחים: תפקידים ודרישות טכניות](#נספחים)

---

## Phase 0: הקמת סביבת פיתוח
### 🎯 מטרה: הכנת תשתית טכנית לפיתוח

### שלב 0.1: הקמת סביבת פיתוח
**אחראי: Backend Developer**

- [ ] **0.1.1** הגדרת Repository Structure
  ```
  /server
    /src
      /models
      /controllers
      /routes
      /services
      /middleware
      /utils
      /config
    /tests
  /client
    /src
      /components
      /pages
      /services
      /store
      /hooks
      /utils
  ```

- [ ] **0.1.2** הגדרת Environment Variables
  - `.env.development`
  - `.env.production`
  - משתני סביבה: DB_URI, JWT_SECRET, PORT, etc.
  
- [ ] **0.1.3** התקנת Dependencies
  
  **Backend:**
  ```bash
  npm install express mongoose dotenv cors helmet
  npm install bcryptjs jsonwebtoken express-validator
  npm install winston morgan
  npm install --save-dev nodemon typescript @types/node
  ```
  
  **Frontend:**
  ```bash
  npm install @reduxjs/toolkit react-redux axios
  npm install react-router-dom
  npm install framer-motion (animations)
  npm install react-hot-toast (notifications)
  npm install --save-dev @types/react
  ```

- [ ] **0.1.4** הגדרת TypeScript Configs
  - `tsconfig.json` לשרת
  - `tsconfig.json` לקליינט
  - Strict mode enabled
  
- [ ] **0.1.5** הגדרת ESLint + Prettier
  - קונפיגורציה אחידה
  - Code formatting rules
  
- [ ] **0.1.6** הקמת MongoDB
  - Local development database
  - Staging database
  - יצירת indexes בסיסיים

**📤 תוצרים:**
- Repository מאורגן
- Environments מוכנים
- Dependencies מותקנים
- Database מוכנה

---

## Phase 1: Backend - בסיס הסל
### 🎯 מטרה: בניית API פונקציונלי לניהול סל קניות

### שלב 1.1: מודלים ו-Schemas (Backend)
**אחראי: Backend Developer**

- [ ] **1.1.1** יצירת Cart Model
  ```typescript
  // server/src/models/Cart.ts
  interface ICartItem {
    productId: ObjectId;
    name: string;
    price: number;
    quantity: number;
    image: string;
    variant?: {
      color?: string;
      size?: string;
    };
  }

  interface ICart {
    userId: ObjectId;
    sessionId?: string; // למשתמשים אורחים
    items: ICartItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    totalPrice: number;
    coupon?: {
      code: string;
      discountAmount: number;
    };
    status: 'active' | 'abandoned' | 'checkedOut' | 'merged';
    lastActivity: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

- [ ] **1.1.2** יצירת Validation Schemas (Joi/Yup)
  - Validation להוספת פריט
  - Validation לעדכון כמות
  - Validation לקופון
  
- [ ] **1.1.3** יצירת Indexes למהירות
  ```javascript
  cartSchema.index({ userId: 1 });
  cartSchema.index({ sessionId: 1 });
  cartSchema.index({ status: 1, lastActivity: -1 });
  cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  ```

**📤 תוצרים:**
- Cart Model מוגדר
- Validation schemas
- Database indexes

---

### שלב 1.2: API Endpoints - CRUD בסיסי (Backend)
**אחראי: Backend Developer**

- [ ] **1.2.1** GET /api/cart - שליפת סל
  - שליפת סל קיים למשתמש מחובר
  - יצירת סל חדש אם לא קיים
  - תמיכה במשתמשים אורחים (sessionId)
  - החזרת סטטוס 200 + cart object
  
- [ ] **1.2.2** POST /api/cart/items - הוספת פריט
  - קבלת productId, quantity, variant
  - בדיקת מלאי בזמן אמת
  - אם הפריט כבר קיים - עדכון כמות
  - חישוב מחדש של totalPrice
  - החזרת סטטוס 201 + updated cart
  
- [ ] **1.2.3** PUT /api/cart/items/:itemId - עדכון כמות
  - Validation: כמות > 0 וקיימת במלאי
  - עדכון item.quantity
  - חישוב מחדש של סכומים
  - החזרת סטטוס 200 + updated cart
  
- [ ] **1.2.4** DELETE /api/cart/items/:itemId - הסרת פריט
  - מחיקת item מהמערך
  - חישוב מחדש של totalPrice
  - החזרת סטטוס 200 + updated cart
  
- [ ] **1.2.5** DELETE /api/cart - ניקוי סל
  - מחיקת כל הפריטים
  - איפוס סכומים
  - שמירת הסל כריק (לא מחיקה מוחלטת)

**📤 תוצרים:**
- 5 endpoints פועלים
- Error handling בסיסי
- Response format אחיד

---

### שלב 1.3: Business Logic - חישובים (Backend)
**אחראי: Backend Developer**

- [ ] **1.3.1** Cart Service - חישוב Subtotal
  ```typescript
  calculateSubtotal(items: ICartItem[]): number {
    return items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
  }
  ```

- [ ] **1.3.2** חישוב מע"מ (Tax)
  - לפי מדינה/אזור (ברירת מחדל: 17%)
  - שמירה ב-cart.tax
  
- [ ] **1.3.3** חישוב דמי משלוח (Shipping)
  - לוגיקה: משלוח חינם מעל 200₪
  - מתחת - 30₪ דמי משלוח
  - שמירה ב-cart.shippingCost
  
- [ ] **1.3.4** חישוב סה"כ (Total Price)
  ```typescript
  totalPrice = subtotal + tax + shippingCost - discount
  ```

- [ ] **1.3.5** Middleware לעדכון אוטומטי
  - Pre-save hook שמחשב אוטומטית לפני שמירה
  - עדכון lastActivity בכל פעולה

**📤 תוצרים:**
- CartService עם כל החישובים
- Middleware לעדכונים אוטומטיים
- Unit tests לחישובים

---

### שלב 1.4: Authentication & Authorization (Backend)
**אחראי: Backend Developer**

- [ ] **1.4.1** JWT Middleware
  - אימות token בכל request
  - הוספת user.id ל-req.user
  - טיפול במשתמשים אורחים (sessionId)
  
- [ ] **1.4.2** Session Management לאורחים
  - יצירת sessionId ייחודי
  - שמירה ב-cookie
  - TTL של 7 ימים
  
- [ ] **1.4.3** Rate Limiting
  - הגבלה ל-100 requests לדקה למשתמש
  - מניעת abuse
  - החזרת 429 Too Many Requests

**📤 תוצרים:**
- Authentication middleware
- Session management
- Rate limiting

---

### שלב 1.5: Error Handling & Logging (Backend)
**אחראי: Backend Developer**

- [ ] **1.5.1** Global Error Handler
  ```typescript
  app.use((err, req, res, next) => {
    logger.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
  ```

- [ ] **1.5.2** Winston Logger Setup
  - Logs לקובץ (info.log, error.log)
  - Console logs בdevelopment
  - Structured logging (JSON format)
  
- [ ] **1.5.3** Morgan HTTP Logger
  - לוגים לכל HTTP request
  - פורמט: `:method :url :status :response-time ms`

**📤 תוצרים:**
- Error handling מרכזי
- Logging infrastructure
- Log files מאורגנים

---

### שלב 1.6: Testing Backend (QA + Backend)
**אחראי: Backend Developer + QA**

- [ ] **1.6.1** Unit Tests (Jest)
  - טסטים לכל פונקציות החישוב
  - טסטים ל-validation schemas
  - Coverage > 80%
  
- [ ] **1.6.2** Integration Tests (Supertest)
  - טסט לכל endpoint
  - טסטים עם database אמיתי (test DB)
  - Happy path + error cases
  
- [ ] **1.6.3** Manual API Testing (Postman/Insomnia)
  - יצירת Collection עם כל ה-endpoints
  - טסטים ידניים לזרימות מורכבות

**📤 תוצרים:**
- Test suite מקיף
- Postman collection
- Test coverage report

---

## Phase 2: Frontend - ממשק משתמש בסיסי
### 🎯 מטרה: בניית UI פונקציונלי לסל קניות

### שלב 2.1: הקמת Redux Store (Frontend)
**אחראי: Frontend Developer**

- [ ] **2.1.1** Redux Toolkit Setup
  ```typescript
  // client/src/store/index.ts
  import { configureStore } from '@reduxjs/toolkit';
  import cartReducer from './slices/cartSlice';
  
  export const store = configureStore({
    reducer: {
      cart: cartReducer,
    },
  });
  ```

- [ ] **2.1.2** Cart Slice יצירה
  ```typescript
  // client/src/store/slices/cartSlice.ts
  interface CartState {
    items: CartItem[];
    subtotal: number;
    totalPrice: number;
    isLoading: boolean;
    error: string | null;
  }
  
  // Actions: fetchCart, addItem, updateQuantity, removeItem
  ```

- [ ] **2.1.3** RTK Query Setup
  - baseQuery עם axios
  - API endpoints (getCart, addItem, etc.)
  - Auto-caching ו-invalidation
  
- [ ] **2.1.4** LocalStorage Persistence
  - Middleware לשמירה אוטומטית
  - Hydration בטעינת אפליקציה

**📤 תוצרים:**
- Redux store מוכן
- Cart slice מלא
- RTK Query configured
- LocalStorage sync

---

### שלב 2.2: API Service Layer (Frontend)
**אחראי: Frontend Developer**

- [ ] **2.2.1** Axios Instance הקמה
  ```typescript
  // client/src/services/api.ts
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Interceptors לטוקן ו-error handling
  ```

- [ ] **2.2.2** Cart Service
  ```typescript
  // client/src/services/cartService.ts
  export const cartService = {
    getCart: () => api.get('/cart'),
    addItem: (item) => api.post('/cart/items', item),
    updateItem: (id, quantity) => api.put(`/cart/items/${id}`, { quantity }),
    removeItem: (id) => api.delete(`/cart/items/${id}`),
  };
  ```

- [ ] **2.2.3** Error Interceptor
  - טיפול ב-401 (redirect לlogin)
  - טיפול ב-500 (הצגת toast)
  - Retry logic עם exponential backoff

**📤 תוצרים:**
- Axios instance configured
- Cart service מלא
- Error handling

---

### שלב 2.3: קומפוננטות UI בסיסיות (Frontend)
**אחראי: Frontend Developer**

- [ ] **2.3.1** CartIcon Component
  ```tsx
  // client/src/components/CartIcon.tsx
  // אייקון עם badge של מספר פריטים
  // onClick פותח את המיני-קארט
  ```

- [ ] **2.3.2** CartItem Component
  ```tsx
  // תמונה + שם + מחיר + quantity selector + remove button
  // Props: item, onUpdateQuantity, onRemove
  ```

- [ ] **2.3.3** QuantitySelector Component
  ```tsx
  // כפתורי +/- עם input באמצע
  // Validation: min=1, max=stock
  ```

- [ ] **2.3.4** Button Component
  ```tsx
  // Primary, Secondary, Danger variants
  // Loading state עם spinner
  // Disabled state
  ```

- [ ] **2.3.5** Toast Component
  ```tsx
  // React-hot-toast integration
  // Success, Error, Warning styles
  ```

**📤 תוצרים:**
- 5+ reusable components
- TypeScript props מוגדרים
- Storybook stories (אופציונלי)

---

### שלב 2.4: Mini Cart (Sidebar) (Frontend)
**אחראי: Frontend Developer + UI Designer**

- [ ] **2.4.1** MiniCart Component
  - Slide-in drawer מצד ימין
  - רשימת 3-5 פריטים אחרונים
  - סיכום מחיר
  - כפתור "לתשלום"
  - כפתור "צפה בסל המלא"
  
- [ ] **2.4.2** אנימציות (Framer Motion)
  ```tsx
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
  >
    {/* Mini cart content */}
  </motion.div>
  ```

- [ ] **2.4.3** "Flying to Cart" Animation
  - אנימציה של מוצר "עף" לאייקון הסל
  - Particle effect עדין
  
- [ ] **2.4.4** Empty State
  - הודעה "הסל שלך ריק"
  - כפתור "המשך קנייה"
  - המלצות מוצרים (אופציונלי)

**📤 תוצרים:**
- Mini cart פונקציונלי
- אנימציות חלקות
- Empty state מעוצב

---

### שלב 2.5: Full Cart Page (Frontend)
**אחראי: Frontend Developer + UI Designer**

- [ ] **2.5.1** CartPage Component
  ```
  /cart route
  Layout: 
    - רשימת פריטים (שמאל, 70%)
    - סיכום ותשלום (ימין, 30%)
  ```

- [ ] **2.5.2** רשימת פריטים
  - מיפוי cart.items
  - כל פריט עם CartItem component
  - Skeleton loader בזמן טעינה
  
- [ ] **2.5.3** פאנל סיכום (Cart Summary)
  ```tsx
  - Subtotal: XXX₪
  - הנחה: -XX₪
  - משלוח: XX₪ (או "חינם!")
  - מע"מ: XX₪
  ---------------
  - סה"כ: XXX₪
  
  [כפתור "המשך לתשלום"]
  ```

- [ ] **2.5.4** Progress Bar למשלוח חינם
  ```tsx
  "חסרים לך 50₪ למשלוח חינם!"
  [████████░░] 75%
  ```

- [ ] **2.5.5** Responsive Design
  - Mobile: Stack layout (פריטים למעלה, סיכום למטה)
  - Tablet: 60/40 split
  - Desktop: 70/30 split

**📤 תוצרים:**
- Cart page מלאה
- Responsive בכל המסכים
- Loading states

---

### שלב 2.6: הוספה לסל מדף מוצר (Frontend)
**אחראי: Frontend Developer**

- [ ] **2.6.1** AddToCartButton Component
  - כפתור בדף מוצר
  - onClick: dispatch(addItem(product))
  - Loading state בזמן API call
  - Success: הצגת toast + פתיחת mini-cart
  
- [ ] **2.6.2** Optimistic Updates
  - הוספה מיידית ל-UI
  - אם נכשל - rollback + הודעת שגיאה
  
- [ ] **2.6.3** Variant Selection
  - אם למוצר יש variants (צבע, מידה)
  - Dropdown/Radio buttons לבחירה
  - Validation לפני הוספה

**📤 תוצרים:**
- AddToCart button פועל
- Optimistic updates
- Variant support

---

### שלב 2.7: Testing Frontend (QA + Frontend)
**אחראי: Frontend Developer + QA**

- [ ] **2.7.1** Unit Tests (Vitest/Jest)
  - Redux reducers
  - Utility functions
  - Component logic
  
- [ ] **2.7.2** Component Tests (React Testing Library)
  - CartItem component
  - QuantitySelector
  - MiniCart interactions
  
- [ ] **2.7.3** Integration Tests
  - זרימה מלאה: Add → Update → Remove
  - Redux store interactions
  
- [ ] **2.7.4** Manual Testing
  - בדיקה בדפדפנים שונים
  - בדיקה במכשירים שונים
  - Accessibility check (keyboard navigation)

**📤 תוצרים:**
- Test suite
- Coverage > 70%
- QA sign-off

---

## Phase 3: פיצ'רים מתקדמים
### 🎯 מטרה: קופונים, נטישה, המלצות

### שלב 3.1: מערכת קופונים - Backend
**אחראי: Backend Developer**

- [ ] **3.1.1** Coupon Model
  ```typescript
  interface ICoupon {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchase: number;
    maxDiscount?: number;
    validFrom: Date;
    validUntil: Date;
    usageLimit: number;
    usedCount: number;
    applicableCategories?: string[];
  }
  ```

- [ ] **3.1.2** POST /api/cart/coupons - הטמעת קופון
  - Validation: קוד תקין, לא פג תוקף
  - בדיקת סף מינימום
  - חישוב הנחה
  - שמירה ב-cart.coupon
  
- [ ] **3.1.3** DELETE /api/cart/coupons - הסרת קופון
  - מחיקת ההנחה
  - חישוב מחדש של totalPrice

- [ ] **3.1.4** Coupon Service
  - validateCoupon()
  - calculateDiscount()
  - incrementUsage()

**📤 תוצרים:**
- Coupon model
- 2 endpoints
- Validation logic

---

### שלב 3.2: מערכת קופונים - Frontend
**אחראי: Frontend Developer**

- [ ] **3.2.1** CouponInput Component
  ```tsx
  // Input field + "החל" button
  // Validation בזמן אמת
  // הצגת הצלחה/שגיאה
  ```

- [ ] **3.2.2** Applied Coupon Display
  ```tsx
  // "קופון SAVE20 הוחל ✓"
  // "חסכת 40₪!"
  // כפתור X להסרה
  ```

- [ ] **3.2.3** אינטגרציה ב-Cart Page
  - CouponInput בפאנל הסיכום
  - עדכון אוטומטי של המחיר

**📤 תוצרים:**
- Coupon UI פונקציונלי
- Real-time validation
- UX חלק

---

### שלב 3.3: Abandoned Cart Detection (Backend)
**אחראי: Backend Developer**

- [ ] **3.3.1** Cron Job לזיהוי נטישה
  ```typescript
  // כל 15 דקות: סרוק סלים עם lastActivity > 15 min
  // עדכן status ל-'abandoned'
  ```

- [ ] **3.3.2** Email Service Integration
  - Nodemailer / SendGrid setup
  - תבנית email מעוצבת
  - קישור לשחזור סל
  
- [ ] **3.3.3** Email Sequence
  - Email 1: אחרי שעה ("שכחת משהו?")
  - Email 2: אחרי 24 שעות ("קופון 10% במיוחד לך")
  - Email 3: אחרי 3 ימים ("הסל שלך עומד להימחק")

- [ ] **3.3.4** GET /api/cart/recover/:token
  - שחזור סל מטוקן במייל
  - מיזוג עם סל קיים אם יש

**📤 תוצרים:**
- Abandoned cart detection
- Email automation
- Recovery mechanism

---

### שלב 3.4: מיזוג סלים (Backend + Frontend)
**אחראי: Backend + Frontend**

- [ ] **3.4.1** POST /api/cart/merge
  - מקבל: guestSessionId
  - מושך סל אורח + סל משתמש
  - מיזוג חכם:
    - פריטים זהים → חיבור כמויות
    - פריטים שונים → שניהם נשמרים
  - מעדכן status סל אורח ל-'merged'
  
- [ ] **3.4.2** Frontend: Trigger בעת התחברות
  ```typescript
  // אחרי login מוצלח:
  const guestSessionId = localStorage.getItem('guestSession');
  if (guestSessionId) {
    await mergeCart(guestSessionId);
    localStorage.removeItem('guestSession');
  }
  ```

**📤 תוצרים:**
- Merge endpoint
- Frontend integration
- UX חלק במעבר אורח→משתמש

---

### שלב 3.5: המלצות מוצרים (Backend + Frontend)
**אחראי: Backend + Frontend**

- [ ] **3.5.1** GET /api/cart/recommendations
  - אלגוריתם פשוט:
    1. קטגוריות של מוצרים בסל
    2. מוצרים פופולריים באותן קטגוריות
    3. מוצרים שנקנו ביחד לעיתים קרובות
  - החזרת 4-6 מוצרים
  
- [ ] **3.5.2** RecommendationsSection Component
  ```tsx
  // קרוסלה של מוצרים מומלצים
  // "לקוחות שקנו את זה גם קנו..."
  // כפתור "הוסף לסל" מהיר
  ```

- [ ] **3.5.3** אינטגרציה ב-Cart Page
  - מתחת לרשימת הפריטים
  - טעינה אסינכרונית (לא לחסום את הדף)

**📤 תוצרים:**
- Recommendations API
- UI component
- אלגוריתם המלצות פועל

---

### שלב 3.6: Save for Later (Backend + Frontend)
**אחראי: Backend + Frontend**

- [ ] **3.6.1** POST /api/cart/save-for-later/:itemId
  - העברת פריט מ-cart.items ל-cart.savedItems
  - עדכון totalPrice
  
- [ ] **3.6.2** POST /api/cart/move-to-cart/:itemId
  - החזרת פריט מ-savedItems ל-items
  
- [ ] **3.6.3** SavedItems Component
  ```tsx
  // סקשן נפרד ב-Cart Page
  // "שמור לאחר כך (3 פריטים)"
  // לכל פריט: תמונה + שם + "העבר לסל"
  ```

**📤 תוצרים:**
- Save for later API
- UI implementation
- Seamless UX

---

## Phase 4: אופטימיזציה ואנליטיקה
### 🎯 מטרה: ביצועים, אבטחה, מדידה

### שלב 4.1: Performance Optimization (Frontend)
**אחראי: Frontend Developer**

- [ ] **4.1.1** Code Splitting
  ```tsx
  const CartPage = lazy(() => import('./pages/CartPage'));
  ```

- [ ] **4.1.2** Image Optimization
  - Lazy loading לתמונות
  - WebP format
  - Responsive images (srcset)
  
- [ ] **4.1.3** Memoization
  ```tsx
  const MemoizedCartItem = memo(CartItem);
  const subtotal = useMemo(() => calculateSubtotal(items), [items]);
  ```

- [ ] **4.1.4** Debouncing
  - Quantity updates
  - Coupon input
  - Search (אם רלוונטי)
  
- [ ] **4.1.5** Bundle Analysis
  ```bash
  npm run build -- --analyze
  # מזהה dependencies כבדים
  ```

**📤 תוצרים:**
- Lighthouse score > 90
- Bundle size optimized
- Faster load times

---

### שלב 4.2: Backend Optimization
**אחראי: Backend Developer**

- [ ] **4.2.1** Database Indexing
  - Index על userId, sessionId, status
  - Compound indexes למשאילים מורכבים
  
- [ ] **4.2.2** Caching (Redis)
  - Cache למוצרים פופולריים
  - Cache לקופונים תקפים
  - TTL: 5-10 דקות
  
- [ ] **4.2.3** Query Optimization
  - Projection (בחירת שדות ספציפיים)
  - Pagination לרשימות ארוכות
  - Aggregation pipelines ל-analytics
  
- [ ] **4.2.4** Connection Pooling
  - MongoDB connection pool
  - Reuse connections

**📤 תוצרים:**
- API response time < 300ms
- DB queries optimized
- Redis caching

---

### שלב 4.3: Security Hardening (Backend)
**אחראי: Backend Developer**

- [ ] **4.3.1** Helmet.js Integration
  ```typescript
  app.use(helmet());
  // מגן מול XSS, clickjacking, etc.
  ```

- [ ] **4.3.2** Input Sanitization
  - express-validator לכל inputs
  - mongo-sanitize למניעת NoSQL injection
  
- [ ] **4.3.3** CSRF Protection
  - csurf middleware
  - Token בכל form
  
- [ ] **4.3.4** Rate Limiting מתקדם
  - שכבות: IP-based, User-based
  - Sliding window algorithm
  
- [ ] **4.3.5** Security Headers
  ```
  Content-Security-Policy
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  ```

- [ ] **4.3.6** Audit Logging
  - לוג כל פעולה רגישה
  - IP, User-Agent, Timestamp
  - Anomaly detection בסיסי

**📤 תוצרים:**
- Security audit passed
- OWASP Top 10 מטופל
- Penetration test report

---

### שלב 4.4: Analytics Integration (Full Stack)
**אחראי: Frontend + Backend**

- [ ] **4.4.1** Google Analytics 4
  ```tsx
  // Frontend: gtag events
  gtag('event', 'add_to_cart', {
    currency: 'ILS',
    value: item.price,
    items: [{ id: item.productId, name: item.name }]
  });
  ```

- [ ] **4.4.2** Backend Events
  ```typescript
  // לוג events למערכת אנליטיקה
  trackEvent('cart.item_added', { productId, userId, price });
  trackEvent('cart.checkout_started', { cartValue, itemCount });
  ```

- [ ] **4.4.3** Custom Dashboard
  - Grafana / Kibana setup
  - Metrics:
    - Cart abandonment rate
    - Average cart value
    - Top products in carts
    - Conversion funnel
  
- [ ] **4.4.4** Hotjar / Microsoft Clarity
  - Session recordings
  - Heatmaps על Cart Page
  - Feedback widget

**📤 תוצרים:**
- GA4 fully integrated
- Custom dashboard live
- Analytics tracking פעיל

---

### שלב 4.5: A/B Testing Infrastructure (PM + Frontend)
**אחראי: PM + Frontend Developer**

- [ ] **4.5.1** Google Optimize / VWO Setup
  - אינטגרציה באתר
  - הגדרת experiments
  
- [ ] **4.5.2** ניסויים ראשוניים
  - A/B: מיקום כפתור checkout
  - A/B: טקסט CTA ("המשך לתשלום" vs "קנה עכשיו")
  - A/B: מיקום שדה קופון
  
- [ ] **4.5.3** Feature Flags
  ```typescript
  // להפעלה/כיבוי פיצ'רים בקלות
  if (featureFlags.showRecommendations) {
    return <RecommendationsSection />;
  }
  ```

**📤 תוצרים:**
- A/B testing platform
- 3 active experiments
- Data-driven decisions

---

## Phase 5: הקשחה ו-Production Ready
### 🎯 מטרה: הכנה ל-production

### שלב 5.1: בדיקות מקיפות (QA)
**אחראי: QA Team**

- [ ] **5.1.1** E2E Tests (Playwright/Cypress)
  ```typescript
  test('Full cart flow', async () => {
    // Add item → Update quantity → Apply coupon → Checkout
  });
  ```

- [ ] **5.1.2** Cross-Browser Testing
  - Chrome, Firefox, Safari, Edge
  - BrowserStack לבדיקה אוטומטית
  
- [ ] **5.1.3** Cross-Device Testing
  - iOS (Safari, Chrome)
  - Android (Chrome, Samsung Internet)
  - Tablets
  
- [ ] **5.1.4** Accessibility Audit
  - WAVE / axe DevTools
  - Screen reader testing (NVDA)
  - Keyboard-only navigation
  - WCAG 2.1 AA compliance
  
- [ ] **5.1.5** Load Testing
  ```bash
  # Apache JMeter / k6
  # סימולציה של 1000 משתמשים במקביל
  ```

- [ ] **5.1.6** Regression Testing
  - כל הפיצ'רים הקודמים עובדים
  - אין side effects

**📤 תוצרים:**
- E2E test suite
- Accessibility report
- Load test results
- QA sign-off document

---

### שלב 5.2: Documentation
**אחראי: Developers**

- [ ] **5.2.1** API Documentation (Swagger/OpenAPI)
  ```yaml
  /api/cart:
    get:
      summary: Get user's cart
      responses:
        200:
          description: Cart object
  ```

- [ ] **5.2.2** Frontend Component Docs
  - Storybook עם כל הקומפוננטות
  - Props documentation
  - Usage examples
  
- [ ] **5.2.3** README Files
  - Setup instructions
  - Environment variables
  - How to run locally
  - Deployment guide
  
- [ ] **5.2.4** Architecture Diagram
  - מפה של כל המערכת
  - Data flow diagram
  - Database schema

**📤 תוצרים:**
- API docs published
- Component library documented
- Comprehensive README

---

### שלב 5.3: CI/CD Pipeline (DevOps)
**אחראי: DevOps Engineer**

- [ ] **5.3.1** GitHub Actions / GitLab CI
  ```yaml
  # .github/workflows/main.yml
  - name: Run tests
  - name: Build
  - name: Deploy to staging
  ```

- [ ] **5.3.2** Automated Testing in Pipeline
  - Unit tests
  - Integration tests
  - E2E tests (smoke tests)
  - Security scans (Snyk)
  
- [ ] **5.3.3** Staging Environment
  - סביבה זהה ל-production
  - Auto-deploy כל push ל-develop
  
- [ ] **5.3.4** Production Deployment
  - Blue-Green deployment
  - Automatic rollback אם יש שגיאות
  - Health checks

**📤 תוצרים:**
- CI/CD pipeline operational
- Automated deployments
- Zero-downtime deploys

---

### שלב 5.3: Monitoring & Alerting
**אחראי: Backend Developer**

- [ ] **5.4.1** Application Monitoring
  - New Relic / DataDog / Sentry
  - Real-time error tracking
  - Performance monitoring
  
- [ ] **5.4.2** Infrastructure Monitoring
  - Server health (CPU, RAM, Disk)
  - Database performance
  - Network latency
  
- [ ] **5.4.3** Alerting Rules
  - Error rate > 1% → Slack alert
  - Response time > 2s → PagerDuty
  - Server down → SMS to on-call
  
- [ ] **5.4.4** Logging Aggregation
  - ELK Stack (Elasticsearch, Logstash, Kibana)
  - Centralized logs
  - Search & filter capabilities

**📤 תוצרים:**
- Monitoring dashboards
- Alert rules configured
- Logging system פעיל

---

### שלב 5.5: Final QA & UAT (QA + PM + Stakeholders)
**אחראי: QA + PM**

- [ ] **5.5.1** User Acceptance Testing
  - הזמנת 10-20 משתמשים אמיתיים
  - תרחישי שימוש מלאים
  - איסוף פידבק
  
- [ ] **5.5.2** Stakeholder Demo
  - הצגה למנהלים/לקוחות
  - אישור סופי
  
- [ ] **5.5.3** Bug Bash
  - כל הצוות מנסה "לשבור" את המערכת
  - תיקון באגים קריטיים
  
- [ ] **5.5.4** Performance Benchmarks
  - אישור שכל המדדים עומדים ביעדים
  - Lighthouse, WebPageTest

**📤 תוצרים:**
- UAT report
- Stakeholder approval
- Go/No-Go decision

---

### שלב 5.6: Launch! 🚀
**אחראי: כל הצוות**

- [ ] **5.6.1** Soft Launch
  - פתיחה ל-10% מהמשתמשים
  - מעקב צמוד אחרי מדדים
  
- [ ] **5.6.2** Full Launch
  - פתיחה ל-100% משתמשים
  - הודעה לכל הלקוחות
  
- [ ] **5.6.3** Post-Launch Monitoring
  - שעתיים ראשונות: ניטור מתמיד
  - 24 שעות: on-call availability
  
- [ ] **5.6.4** Retrospective Meeting
  - מה עבד טוב?
  - מה ניתן לשפר?
  - לקחים לפרויקט הבא

**📤 תוצרים:**
- Production deployment successful
- Monitoring shows healthy metrics
- Happy users! 🎉

---

## 📊 סיכום Timeline

| Phase | משימות | זמן משוער | תלויות |
|-------|--------|-----------|---------|
| **Phase 0** | הכנה ותשתיות | 3-5 ימים | - |
| **Phase 1** | Backend בסיס | 7-10 ימים | Phase 0 |
| **Phase 2** | Frontend בסיס | 8-12 ימים | Phase 1 |
| **Phase 3** | פיצ'רים מתקדמים | 10-14 ימים | Phase 2 |
| **Phase 4** | אופטימיזציה | 8-10 ימים | Phase 3 |
| **Phase 5** | Production Ready | 7-10 ימים | Phase 4 |
| **סה"כ** | | **43-61 ימי עבודה** | ~2-3 חודשים |

### 🎯 KPIs להצלחה

- ✅ **Cart Abandonment Rate**: < 60%
- ✅ **Conversion Rate**: > 3%
- ✅ **Page Load Time**: < 2 שניות
- ✅ **API Response Time**: < 500ms
- ✅ **Lighthouse Score**: > 90
- ✅ **Test Coverage**: > 80%
- ✅ **Accessibility**: WCAG 2.1 AA
- ✅ **Uptime**: 99.9%

---

## נספחים

## תפקידים ואחריות בפרויקט

### אפיין חווית משתמש (UX Designer)
**אחריות:**
- מחקר קהל היעד והבנת צרכי המשתמשים
- מיפוי זרימות משתמש (User Flows) בעגלת הקניות
- עיצוב wireframes ו-prototypes אינטראקטיביים
- בדיקות שימושיות (Usability Testing) ואיטרציות מבוססות פידבק
- אופטימיזציה לצמצום נטישת סל

**תוצרי עבודה:**
- מפות מסע לקוח (Customer Journey Maps)
- תרשימי זרימה (Flow Charts) לתהליכי הוספה/עדכון/תשלום
- דוחות מחקר משתמשים ותובנות התנהגות
- הצעות לשיפור המרות מבוססות נתונים

### מעצב ממשק משתמש (UI Designer)
**אחריות:**
- בניית מערכת עיצוב (Design System) עקבית
- עיצוב ויזואלי של כל מצבי הסל (ריק, מלא, שגיאות, הצלחה)
- התאמה למיתוג העסק (Brand Guidelines)
- עיצוב רספונסיבי למובייל, טאבלט ודסקטופ
- הנגשה (WCAG 2.1 AA) ונגישות חזותית

**תוצרי עבודה:**
- מערכת עיצוב מלאה (צבעים, טיפוגרפיה, רווחים)
- קבצי Figma/Sketch מפורטים עם כל המצבים
- ספריית אייקונים וגרפיקה
- מדריך סטייל למפתחים

### מתכנת Frontend
**אחריות:**
- מימוש הקומפוננטות בReact עם TypeScript
- ניהול state (Redux Toolkit / Zustand)
- אינטגרציה עם API של הסרבר
- אופטימיזציה לביצועים (lazy loading, memoization)
- שילוב מערכות תשלום (Stripe, PayPal)
- בדיקות יחידה (Unit Tests) ואינטגרציה

**דרישות טכניות:**
- ניסיון ב-React Hooks ו-Context API
- הבנה בניהול state מורכב
- הכרות עם Web Vitals ו-Performance Optimization
- ידע ב-Responsive Design ו-CSS-in-JS

### מתכנת Backend
**אחריות:**
- בניית REST API / GraphQL עבור הסל
- ניהול מודלים ב-MongoDB (Cart, Order, Product)
- לוגיקת מלאים בזמן אמת
- אבטחת נתונים והצפנה (JWT, bcrypt)
- שילוב עם מערכות צד שלישי (תשלומים, משלוחים, CRM)
- טיפול בסקייל וביצועים (caching, indexing)

**דרישות טכניות:**
- ניסיון ב-Node.js + Express
- הבנה מעמיקה ב-MongoDB aggregations
- הכרות עם תקני אבטחה (OWASP, PCI-DSS)
- ניהול transactions ו-error handling מתקדם

### יועץ איקומרס / מנהל מוצר
**אחריות:**
- הגדרת אסטרטגיה עסקית (pricing, promotions, upsells)
- תעדוף פיצ'רים לפי ROI וערך עסקי
- ניתוח מתחרים ומגמות שוק
- הגדרת KPIs ומדדי הצלחה
- ניהול backlog ו-roadmap

**תוצרי עבודה:**
- מסמכי PRD (Product Requirements Document)
- ניתוחי A/B testing ו-conversion optimization
- דוחות ביצועים עסקיים
- המלצות לשיפור עסקי

### QA / בודק איכות
**אחריות:**
- בדיקות פונקציונליות מקיפות
- בדיקות רגרסיה אוטומטיות (Playwright, Cypress)
- בדיקות cross-browser ו-cross-device
- בדיקות אבטחה (penetration testing בסיסי)
- תיעוד באגים ומעקב תקלות
- בדיקות עומס (Load Testing)

**סוגי בדיקות:**
- בדיקות אינטגרציה עם מערכות חיצוניות
- בדיקות נגישות (accessibility)
- בדיקות ביצועים (performance)
- בדיקות חוויית משתמש קצה-לקצה

---

### אפיון Backend (Node.js + Express + MongoDB)

- **מודל נתונים (MongoDB):**
  - אובייקט סל אחד לכל משתמש, נשמר במודל `Cart`
  - שדות עיקריים: userId, items (מערך הכולל productId, quantity, price, name, image, variant), totalPrice, subtotal, tax, shippingCost, discount, dateCreated, dateUpdated, lastActivity, status ("active", "abandoned", "checkedOut", "merged"), coupon, shippingDetails, paymentMethod, sessionId (למשתמשים אורחים)
  - **שיפור מוצע:** הוספת שדה `expiresAt` למניעת סלים ישנים, `mergedFrom` למעקב מיזוג סלים, `metadata` למידע נוסף (מקור, campaign tracking)
- **API endpoints עיקריים:**
  - `GET /api/cart` – שליפת סל קיים/יצירת חדש אוטומטית עבור משתמש מחובר
  - `POST /api/cart/items` – הוספת פריט לסל (עם בדיקת מלאי)
  - `PUT /api/cart/items/:itemId` – עדכון כמות פריט (עם validation)
  - `DELETE /api/cart/items/:itemId` – הסרת פריט מהסל
  - `POST /api/cart/checkout` – תהליך רכישה (סיום סל)
  - `POST /api/cart/coupons` – הטמעת קופון (עם validation ותאריך תפוגה)
  - `DELETE /api/cart/coupons` – הסרת קופון
  - `POST /api/cart/merge` – מיזוג סל אורח עם סל משתמש רשום (לאחר התחברות)
  - `GET /api/cart/abandoned` – שליפת סלים נטושים (למנהלים)
  - `POST /api/cart/save-for-later/:itemId` – שמירת פריט ל"אחר כך"
  - `GET /api/cart/recommendations` – המלצות מוצרים בהתאם לסל
  - `POST /api/cart/validate` – ולידציה של הסל לפני checkout (מחירים, מלאי, קופונים)
- **לוגיקה עסקית:**
  - **בדיקת מלאים:** בדיקה בזמן אמת במעמד הוספה/עדכון + re-validation לפני checkout
  - **חישוב מחירים:** 
    - Subtotal (סכום פריטים)
    - הנחות (קופונים, מבצעים, הנחות נפח)
    - מע"מ (לפי מדינה/אזור)
    - דמי משלוח (דינמיים לפי משקל/מרחק/סף משלוח חינם)
    - סה"כ סופי
  - **שמירה אוטומטית:** 
    - Debounced save כל 2-3 שניות
    - Optimistic UI updates
    - Sync עם localStorage לגיבוי מקומי
  - **טיפול בנטישה:**
    - זיהוי סלים נטושים (15+ דקות ללא פעילות)
    - Email reminder אחרי שעה (עם קישור ישיר לסל)
    - Email שני אחרי 24 שעות (עם קופון עידוד)
    - Push notifications (אם המשתמש אישר)
  - **מיזוג סלים:** 
    - כאשר אורח מתחבר, מיזוג חכם של סל האורח + סל המשתמש
    - שמירת פריטים ייחודיים וחיבור כמויות זהות
  - **Inventory reservation:** שמירת מלאי זמנית (10-15 דקות) בזמן checkout
- **אבטחה:**
  - **אימות ואוטוריזציה:**
    - JWT tokens עם refresh mechanism
    - Rate limiting על כל endpoints (למניעת abuse)
    - CSRF protection
    - Session management מאובטח
  - **הצפנה:**
    - הצפנת נתוני תשלום ב-transit וב-rest
    - Tokenization של פרטי כרטיס אשראי (PCI-DSS compliance)
    - Hashing של מידע רגיש
  - **מניעת התקפות:**
    - Input validation ו-sanitization (Joi/Yup schemas)
    - מניעת NoSQL Injection (parameterized queries)
    - XSS protection (Content Security Policy)
    - הגבלת גודל requests
    - Helmet.js למניעת vulnerabilities נפוצות
  - **Audit trail:** 
    - לוגים מפורטים של כל פעולה על הסל
    - מעקב IP ו-User Agent
    - גילוי חריגות ופעילות חשודה

- **שילוב אנליטיקות:**
  - **Backend Analytics:**
    - לוגים מובנים (Winston/Morgan)
    - מעקב נטישות לפי שלבים
    - ניתוח מוצרים פופולריים בסלים
    - ROI של קופונים ומבצעים
    - זמן ממוצע לרכישה
    - שיעור המרה לפי מקור תעבורה
  - **Events Tracking:**
    - `cart.item_added`
    - `cart.item_removed`
    - `cart.item_quantity_changed`
    - `cart.coupon_applied`
    - `cart.checkout_started`
    - `cart.checkout_completed`
    - `cart.abandoned`
  - **שילוב עם:**
    - Google Analytics 4 (E-commerce tracking)
    - Mixpanel / Amplitude
    - Segment (data pipeline)
    - Custom dashboards (Grafana/Kibana)

***

### אפיון Frontend (React)

- **אזור סל הקניות:**
  - **Mini Cart (Side Drawer/Dropdown):**
    - נגישה מאייקון בראש הדף
    - תצוגה מהירה של 3-5 פריטים אחרונים
    - סיכום מחיר וכפתור "לתשלום"
    - אנימציית הוספה חלקה
  - **Full Cart Page:**
    - תצוגה מפורטת של כל פריט:
      - תמונה איכותית (thumbnails + zoom)
      - שם מוצר + variant (צבע, מידה)
      - מחיר ליחידה + סה"כ
      - בורר כמות (dropdown/stepper עם +/-)
      - כפתור "הסר" / "שמור לאחר כך"
      - אינדיקטור מלאי ("נותרו רק 3 יחידות!")
    - **סיכום מפורט:**
      - Subtotal
      - שדה קופון (עם validation בזמן אמת)
      - הנחות מוחלות
      - דמי משלוח (עם progress bar למשלוח חינם)
      - מע"מ
      - **סה"כ סופי - מודגש**
    - **פעולות נוספות:**
      - כפתור "המשך קנייה"
      - כפתור "המשך לתשלום" (CTA מודגש)
      - כפתור "שתף סל" (ייחודי לפלטפורמות B2B)
      - "שמור סל" (לרכישה מאוחרת יותר)
    - **Trust Elements:**
      - סמלי אבטחה (SSL, מערכות תשלום)
      - מדיניות החזרות
      - זמן אספקה משוער
      - חוות דעת/ביקורות
- **ניהול סטייט:**
  - **Redux Toolkit (מומלץ לפרויקט זה):**
    - `cartSlice` עם actions: addItem, removeItem, updateQuantity, applyCoupon, clearCart
    - RTK Query לניהול API calls (caching, invalidation)
    - Middleware לסנכרון עם localStorage
    - Optimistic updates עם rollback במקרה שגיאה
  - **או Zustand (אלטרנטיבה קלת משקל):**
    - פשוט יותר, פחות boilerplate
    - תמיכה ב-devtools
    - Persist middleware מובנה
  - **Sync Strategy:**
    - State מקומי (instant UI feedback)
    - Debounced sync לשרת (כל 2-3 שניות)
    - WebSocket לעדכונים בזמן אמת (מלאי, מחירים)
    - Polling fallback אם WebSocket לא זמין
  - **Error Handling:**
    - Retry logic עם exponential backoff
    - Fallback למצב offline
    - הודעות שגיאה ידידותיות למשתמש
- **חוויית משתמש (UX):**
  - **מיקרו-אינטראקציות:**
    - אנימציית "flying to cart" בעת הוספת פריט
    - אנימציית slide/fade בעת הסרה
    - Skeleton loaders בזמן טעינה
    - Ripple effect על כפתורים
    - Counter animation במספר הפריטים בסל
  - **הודעות ופידבק:**
    - Toast notifications מעוצבות (success, error, warning)
    - Inline validation בשדות (קופון, כמות)
    - אזהרות על מלאי נמוך ("נותרו רק 2!")
    - התראה אם המחיר השתנה
    - הודעה על פריט לא זמין
  - **המלצות חכמות:**
    - "לקוחות שקנו את זה גם קנו..." (Frequently Bought Together)
    - "השלם את המראה" (עבור אופנה)
    - Upsell למוצר איכותי יותר
    - Cross-sell למוצרים משלימים
    - "חסר לך X₪ למשלוח חינם" (Progress indicator)
  - **עיצוב רספונסיבי:**
    - Mobile-first approach
    - Touch-friendly controls (כפתורים גדולים מספיק)
    - Swipe gestures להסרת פריטים במובייל
    - Bottom sheet למובייל במקום modal
    - Sticky checkout button במובייל
  - **מצבי סל:**
    - סל ריק: הצעות מוצרים פופולריים, המשך קנייה
    - סל עם פריטים: רשימה ברורה + סיכום
    - סל בתהליך checkout: progress stepper (סל → פרטים → תשלום → אישור)
  - **מניעת נטישה:**
    - Exit-intent popup עם הנחה (desktop)
    - שמירה אוטומטית של הסל
    - קישור לשחזור סל במייל
    - אינדיקטור "הסל שלך ממתין לך"
- **נגישות (Accessibility):**
  - **WCAG 2.1 AA Compliance:**
    - Contrast ratio מינימלי של 4.5:1 לטקסט רגיל
    - Focus indicators ברורים
    - תמיכה מלאה בניווט מקלדת (Tab, Enter, Esc)
    - ARIA labels ו-roles מתאימים
  - **Screen Readers:**
    - תיאורים ברורים לכל כפתור ופעולה
    - Live regions להודעות דינמיות
    - Semantic HTML (header, main, section, article)
  - **גדלי פונט:**
    - תמיכה בזום עד 200%
    - יחידות responsive (rem, em)
    - אופציה להגדלת טקסט
  - **צבעים:**
    - לא להסתמך רק על צבעים להעברת מידע
    - High contrast mode
    - Dark mode option
  - **אינטראקציות:**
    - Touch targets מינימום 44x44px
    - אפשרות לבטל פעולות
    - Timeout ארוך מספיק לקריאת הודעות

- **הטמעת כלי אנליטיקה ומדידה:**
  - **Google Analytics 4:**
    - Enhanced E-commerce tracking
    - Events: add_to_cart, remove_from_cart, begin_checkout, purchase
    - Custom dimensions (user type, cart value ranges)
  - **Hotjar / Microsoft Clarity:**
    - Session recordings של זרימת הסל
    - Heatmaps על דף הסל
    - Conversion funnels
  - **A/B Testing:**
    - Google Optimize / VWO
    - בדיקת וריאציות של CTA buttons
    - טסטים על מיקום קופונים
    - טסטים על המלצות מוצרים
  - **Custom Dashboards:**
    - KPIs: Cart abandonment rate, AOV, conversion rate
    - Real-time monitoring
    - Alerts על חריגות
  - **Error Tracking:**
    - Sentry / Rollbar לניטור שגיאות
    - מעקב אחר failed API calls
    - Performance monitoring (loading times)

***

### אפיון תהליכים רוחביים וכללי QA

- **תהליכי בדיקות וחוסן:**
  - **בדיקות פונקציונליות:**
    - הוספת פריט לסל (מוצר פשוט, עם variants, עם אזל מלאי)
    - עדכון כמויות (הגדלה, הקטנה, אפס, מעבר למלאי זמין)
    - הסרת פריט (single, multiple, כל הסל)
    - הוספת קופון (תקין, לא תקין, פג תוקף, שימוש חוזר)
    - מעבר לתשלום (סל ריק, סל מלא, עם/בלי קופון)
    - מיזוג סלים (אורח → משתמש רשום)
    - שמירה ל"אחר כך"
  - **בדיקות Cross-Browser:**
    - Chrome, Firefox, Safari, Edge (גרסאות אחרונות)
    - Mobile browsers (Chrome Mobile, Safari iOS)
    - בדיקת תאימות לדפדפנים ישנים (fallbacks)
  - **בדיקות Cross-Device:**
    - Desktop (1920x1080, 1366x768)
    - Tablet (iPad, Android tablets - portrait/landscape)
    - Mobile (iPhone SE, iPhone 14 Pro, Android - various sizes)
    - Responsive breakpoints
  - **בדיקות ביצועים:**
    - Loading time של דף הסל (< 2 שניות)
    - Time to Interactive (< 3 שניות)
    - API response time (< 500ms)
    - בדיקת memory leaks
    - Lighthouse score (> 90)
  - **בדיקות אבטחה:**
    - SQL/NoSQL Injection attempts
    - XSS attacks
    - CSRF protection
    - Rate limiting validation
    - Authentication bypass attempts
    - PII data exposure
  - **בדיקות נגישות:**
    - WAVE / axe DevTools
    - Screen reader testing (NVDA, JAWS)
    - Keyboard-only navigation
    - Color contrast validation
  - **בדיקות אינטגרציה:**
    - חיבור למערכת מלאי
    - חיבור למערכת תשלומים
    - חיבור ל-email service (abandoned cart)
    - חיבור לאנליטיקה
  - **בדיקות עומס (Load Testing):**
    - Concurrent users (100, 500, 1000)
    - Peak shopping hours simulation
    - Database performance under load
    - API rate limits validation
  - **Automation:**
    - E2E tests (Playwright/Cypress)
    - Unit tests (Jest/Vitest)
    - Integration tests (Supertest)
    - Visual regression tests (Percy/Chromatic)
    - CI/CD pipeline integration
  - **Bug Tracking & Management:**
    - Jira/Linear/GitHub Issues
    - קטגוריזציה לפי severity (Critical, High, Medium, Low)
    - SLA לתיקון באגים קריטיים (< 24 שעות)
    - Regression testing לפני כל release

***

### הערות אסטרטגיות למנהל המוצר/יועץ איקומרס

- **ניהול מוצר ואסטרטגיה:**
  - תעדוף פיצ'רים לפי מדדים עסקיים:
    - ROI צפוי
    - Impact על conversion rate
    - מורכבות טכנית (effort vs. value)
    - דחיפות עסקית
  - **KPIs מרכזיים:**
    - Cart abandonment rate (יעד: < 60%)
    - Conversion rate (יעד: > 3%)
    - Average Order Value (AOV)
    - Time to purchase
    - Coupon usage rate
    - Mobile vs. Desktop conversion
- **אפיון מבצעים וקופונים:**
  - סוגי קופונים:
    - הנחה באחוזים (10%, 20%)
    - הנחה קבועה (50₪ הנחה)
    - משלוח חינם
    - קנה X קבל Y
    - BOGO (Buy One Get One)
  - תנאים:
    - סף מינימלי (מעל 200₪)
    - קטגוריות מסוימות
    - מוצרים ספציפיים
    - לקוחות חדשים בלבד
    - תוקף זמני
    - מגבלת שימושים
- **אופטימיזציית המרות:**
  - Exit-intent popups עם הצעות מיוחדות
  - Abandoned cart emails (שרשרת של 3)
  - Push notifications לאפליקציה
  - SMS reminders (בהסכמה)
  - Retargeting ads (Facebook, Google)
- **ניתוח מתחרים:**
  - Benchmark של זרימת הסל
  - השוואת מחירי משלוח
  - אסטרטגיות קופונים
  - UX best practices
- **החלטות אסטרטגיות:**
  - האם להציע "Buy Now" (קנה עכשיו) לצד "Add to Cart"?
  - האם לאפשר checkout כאורח או לדרוש הרשמה?
  - האם להציע One-Click Checkout?
  - האם לאפשר שיתוף סל (B2B)?
  - האם להוסיף Wishlist / Save for Later?
  - האם להציג "People also bought"?
  - מתי להציג משלוח חינם?
  - מה סף המינימום לרכישה?
- **Roadmap Prioritization:**
  - Phase 1 (MVP): Basic cart, checkout, payments
  - Phase 2: Coupons, abandoned cart emails, recommendations
  - Phase 3: Guest checkout, save for later, advanced analytics
  - Phase 4: One-click checkout, subscription model, B2B features

***

### דגש סופי – אינטגרציה וסינכרון מלאים

- **אינטגרציה מלאה:**
  - כל ממשקי עבודה (API), דגמי המידע והפונקציות בקליינט מחוברים ישירות למנגנוני Node.js/MongoDB
  - טיפול מקיף בשגיאות עם fallbacks ו-retry mechanisms
  - לוגים מפורטים לכל פעולה (Winston/Morgan)
  - מעקב אנליטי חכם עם events ו-metrics
  - Documentation מלאה (Swagger/OpenAPI)
  
- **תקשורת צוותית:**
  - Sprint planning meetings (כל שבועיים)
  - Daily standups (15 דקות)
  - Design reviews לפני implementation
  - Code reviews חובה
  - QA sign-off לפני production
  - Retrospectives לשיפור מתמיד
  - Shared documentation (Confluence/Notion)
  
- **Monitoring & Maintenance:**
  - Health checks לכל services
  - Error alerting (Slack/Email/PagerDuty)
  - Performance monitoring (New Relic/DataDog)
  - Uptime monitoring (Pingdom/UptimeRobot)
  - Monthly analytics reviews
  - Quarterly roadmap updates

---

## דרישות מקצועיות לצוות

### כל חברי הצוות
- ניסיון מוכח בפיתוח חנויות איקומרס
- יכולת עבודה בצוות מולטי-דיסציפלינרי
- הכרות עם מתודולוגיות Agile/Scrum
- דגש על חוויית משתמש שסל הקניות במרכזה
- מחויבות למינימום נטישה ומקסימום המרה

### דרישות ספציפיות
- **Backend Developers:**
  - ניסיון בתקני אבטחה (OWASP Top 10)
  - הכרות עם PCI-DSS compliance
  - ניהול transactions ב-MongoDB
  - ניסיון בשילוב מערכות תשלום
  
- **Frontend Developers:**
  - מומחיות ב-React + TypeScript
  - ניסיון ב-state management (Redux/Zustand)
  - הבנה עמוקה של Web Performance
  - הכרות עם accessibility standards
  
- **UX/UI Designers:**
  - ניסיון במחקר משתמשים
  - בניית prototypes אינטראקטיביים
  - עיצוב responsive ו-mobile-first
  - הבנה במדדי המרה
  
- **QA Engineers:**
  - ניסיון בכתיבת automated tests
  - הכרות עם Playwright/Cypress
  - ניסיון בבדיקות אבטחה
  - הבנה בLoad Testing tools

---

## סיכום ומסקנות

אפיון זה מאפשר המשך בניה, התאמות וסקיילינג לסל הקניות, עם דגש על:

✅ **שילוב UX/UI** - חוויה חלקה וממירה  
✅ **אבטחה** - הגנה מלאה על נתוני משתמשים ותשלומים  
✅ **ביצועים** - זמני טעינה מהירים ותגובתיות גבוהה  
✅ **אנליטיקה** - מעקב ושיפור מתמיד מבוסס נתונים  
✅ **נגישות** - פתיחות לכל המשתמשים  
✅ **סקייל** - יכולת להתרחב עם גידול העסק  

כל מרכיב כאן הוא קריטי למעבר מחנות פשוטה לפלטפורמת איקומרס מקצועית, ידידותית וממירה.

---

---

## 📝 עקרונות עבודה

1. **אל תדלג על שלבים** - כל phase בנוי על הקודם
2. **בדיקות בכל שלב** - אל תעבור הלאה לפני שהכל עובד
3. **Documentation תוך כדי** - תעד את הקוד בזמן כתיבה
4. **טסטים לכל פיצ'ר** - כתוב טסטים לקוד חדש

### Checklist לפני מעבר בין Phases

- [ ] כל המשימות הושלמו
- [ ] בדיקות עברו בהצלחה
- [ ] הקוד מתועד
- [ ] טסטים כתובים ועוברים

---

**מסמך זה הוא תכנית עבודה טכנית - מיועד למפתחים בלבד**

**גרסה:** 2.0  
**עדכון אחרון:** October 9, 2025  
**מחבר:** Development Team

---

**בהצלחה! 🚀**
