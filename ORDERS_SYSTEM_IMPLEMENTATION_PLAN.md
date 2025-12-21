# תוכנית יישום מערכת הזמנות - אינטגרציה מלאה לפרויקט 🛒

**תאריך יצירה**: 23 נובמבר 2025  
**גרסה**: 1.0  
**סטטוס**: מוכן ליישום

---

## תוכן עניינים

1. [מבוא וסקירה כללית](#מבוא-וסקירה-כללית)
2. [דרישות תשתית](#דרישות-תשתית)
3. [Phase 0: הכנות ותשתית](#phase-0-הכנות-ותשתית)
4. [Phase 1: Backend Core (3-4 ימים)](#phase-1-backend-core)
5. [Phase 2: Reliability & Queue System (2-3 ימים)](#phase-2-reliability--queue-system)
6. [Phase 3: Frontend Implementation (3-4 ימים)](#phase-3-frontend-implementation)
7. [Phase 4: Testing & Security (2-3 ימים)](#phase-4-testing--security)
8. [Phase 5: Monitoring & Production (1-2 ימים)](#phase-5-monitoring--production)
9. [נספחים](#נספחים)
   - [נספח A: Security & Production Checklist](#נספח-a-security--production-checklist-)
   - [נספח B: Performance Optimization](#נספח-b-performance-optimization-)
   - [נספח C: Guest Checkout Implementation](#נספח-c-guest-checkout-implementation-)
   - [נספח D: Retry Logic & Circuit Breaker](#נספח-d-retry-logic--circuit-breaker-)
   - [נספח E: Metrics & Monitoring](#נספח-e-metrics--monitoring-)
   - [נספח F: Data Archival Strategy](#נספח-f-data-archival-strategy-)
   - [נספח G: Deployment Guide](#נספח-g-deployment-guide-)
   - [נספח H: MongoDB Local Setup (אופציונלי)](#נספח-h-mongodb-local-setup-אופציונלי)

---

## מבוא וסקירה כללית

### מטרת התוכנית
יישום מערכת הזמנות מלאה ומקצועית לחנות e-commerce עם תמיכה ב:
- ✅ יצירת הזמנות עם transactions אטומיות
- ✅ ניהול מלאי עם optimistic locking
- ✅ אינטגרציית תשלומים (Stripe/PayPal)
- ✅ Webhooks עם idempotency
- ✅ Queue system לעיבוד אסינכרוני
- ✅ Saga pattern לטיפול בכשלים
- ✅ Admin dashboard לניהול הזמנות

### עקרונות מנחים
1. **אטומיות מלאה** - כל פעולה מתבצעת במסגרת transaction או מתבטלת במלואה
2. **Idempotency** - אותה פעולה יכולה להתבצע מספר פעמים עם אותה תוצאה
3. **Security First** - אף פעם לא מאחסנים פרטי כרטיסי אשראי
4. **Observable** - כל פעולה קריטית מתועדת ומנוטרת
5. **Scalable** - התכנון מאפשר גדילה עתידית

### התאמה לפרויקט הקיים
הפרויקט כבר כולל:
- ✅ MongoDB + Mongoose
- ✅ Express.js עם middleware architecture
- ✅ React + Redux
- ✅ TypeScript
- ✅ מבנה תלת-שכבתי (models/services/controllers)
- ✅ Authentication & Authorization
- ✅ Email service
- ✅ Image service (Cloudinary)

נוסיף:
- 🆕 Order model + service + controller + routes
- 🆕 WebhookEvent model לאידמפוטנציה
- 🆕 Queue system (BullMQ + Redis)
- 🆕 Payment integration
- 🆕 Checkout flow בקליינט
- 🆕 Admin orders management

---

## דרישות תשתית

### MongoDB Requirements
```bash
# חובה: MongoDB Replica Set או Atlas Cluster
# Transactions לא עובדות על standalone MongoDB!

# אופציה 1: MongoDB Atlas (מומלץ)
# - צור cluster ב-https://cloud.mongodb.com
# - העתק את ה-connection string

# אופציה 2: Local Replica Set
# קובץ docker-compose.yml:
version: '3.8'
services:
  mongo1:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - 27017:27017
    volumes:
      - mongo1_data:/data/db
    networks:
      - mongo-cluster

volumes:
  mongo1_data:

networks:
  mongo-cluster:
    driver: bridge

# אתחול Replica Set:
# docker exec -it <container_name> mongosh
# rs.initiate()
```

### Redis Requirements
```bash
# דרך 1: Docker (מומלץ לפיתוח)
docker run -d --name redis-queue -p 6379:6379 redis:alpine

# דרך 2: Windows (Memurai)
# הורד מ-https://www.memurai.com/

# דרך 3: Cloud (Redis Labs / Upstash)
# חינמי: https://redis.com/try-free/
```

### Environment Variables
```env
# server/.env
MONGO_URI=mongodb://localhost:27017/ecommerce?replicaSet=rs0
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3

# URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

### Package Dependencies
```bash
# Server
cd server
npm install bull ioredis stripe @paypal/checkout-server-sdk

# Client
cd client
npm install @stripe/react-stripe-js @stripe/stripe-js react-query
```

---

## Phase 0: הכנות ותשתית

### תזמון: יום 0 (4-6 שעות)

### 0.1 וידוא MongoDB Atlas (מוכן!)
```bash
# הפרויקט כבר מחובר ל-MongoDB Atlas ✅
# Atlas תומך אוטומטית ב-transactions
# אין צורך בפעולות נוספות!

# בדיקה מהירה (אופציונלי):
node -e "require('dotenv').config(); console.log('MongoDB URI configured:', process.env.MONGO_URI ? '✅ Yes' : '❌ Missing')"
```

### 0.2 התקנת Redis ובדיקה
```bash
# בדיקת Redis
redis-cli ping
# אמור להחזיר: PONG

# בדיקת חיבור מ-Node.js
node -e "const Redis = require('ioredis'); const redis = new Redis('redis://localhost:6379'); redis.ping().then(r => console.log('Redis OK:', r)).catch(e => console.error('Redis Error:', e))"
```

### 0.3 יצירת Stripe Test Account
1. גש ל-https://dashboard.stripe.com/register
2. עבור ל-Developers > API Keys
3. העתק Secret Key ו-Publishable Key
4. התקן Stripe CLI: https://stripe.com/docs/stripe-cli
5. התחבר: `stripe login`
6. פורוורד webhooks: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
7. העתק את webhook secret (whsec_...)

### 0.4 יצירת מבנה תיקיות
```bash
# Server
mkdir -p server/src/models/orders
mkdir -p server/src/services/orders
mkdir -p server/src/controllers/orders
mkdir -p server/src/routes/orders
mkdir -p server/src/jobs
mkdir -p server/src/jobs/processors
mkdir -p server/src/utils/payment
mkdir -p server/src/middleware/orders

# Client
mkdir -p client/src/pages/CheckoutPage
mkdir -p client/src/pages/OrderSuccessPage
mkdir -p client/src/pages/OrderHistoryPage
mkdir -p client/src/components/features/orders
mkdir -p client/src/api/orders
mkdir -p client/src/store/slices/orders
```

---

## Phase 1: Backend Core

### תזמון: ימים 1-4 (3-4 ימי עבודה)

### 1.1 יצירת Order Model

**קובץ**: `server/src/models/Order.ts`

```typescript
/**
 * מודל הזמנה - שומר snapshot מלא של המוצרים בזמן הרכישה
 * כולל תמיכה ב-transactions ו-optimistic concurrency
 */

import mongoose, { Schema, Document } from 'mongoose';

// ממשק לפריט בהזמנה - snapshot של המוצר
export interface IOrderItem {
  productId: mongoose.Types.ObjectId; // reference למוצר המקורי
  skuId?: mongoose.Types.ObjectId; // reference ל-SKU ספציפי
  name: string; // שם המוצר בזמן ההזמנה
  sku: string; // מק"ט
  price: number; // מחיר ביחידה בזמן ההזמנה
  quantity: number; // כמות
  imageUrl?: string; // תמונה ראשית
  attributes?: Record<string, any>; // מאפיינים (צבע, גודל וכו')
  subtotal: number; // סכום ביניים (price * quantity)
}

// ממשק לכתובת משלוח - embedded document
export interface IShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  notes?: string;
}

// ממשק להיסטוריית סטטוס
export interface IStatusHistory {
  status: string;
  timestamp: Date;
  note?: string;
  updatedBy?: mongoose.Types.ObjectId; // מי ביצע את השינוי (admin/system)
}

// ממשק לפרטי תשלום (רק metadata, לא פרטים רגישים!)
export interface IPaymentInfo {
  gateway: 'stripe' | 'paypal' | 'cash'; // שער התשלום
  transactionId?: string; // מזהה טרנזקציה
  paymentIntentId?: string; // Stripe payment intent ID
  last4?: string; // 4 ספרות אחרונות של כרטיס
  brand?: string; // visa, mastercard וכו'
  method: 'card' | 'paypal' | 'cash' | 'bank_transfer';
  paidAt?: Date; // מתי שולם
}

// ממשק למסמך ההזמנה המלא
export interface IOrder extends Document {
  orderNumber: string; // מספר הזמנה ייחודי (ORD-20251123-0001)
  userId: mongoose.Types.ObjectId; // reference למשתמש
  isGuest: boolean; // האם הזמנת אורח
  guestEmail?: string; // אימייל לאורח
  
  // פריטי ההזמנה
  items: IOrderItem[];
  
  // חישובי מחיר
  subtotal: number; // סכום ביניים (לפני מס ומשלוח)
  tax: number; // מע"ם
  shippingCost: number; // עלות משלוח
  discount: number; // הנחה
  total: number; // סך הכל
  currency: string; // מטבע (ILS, USD וכו')
  
  // כתובת משלוח
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress; // כתובת לחיוב (אופציונלי)
  
  // סטטוסים
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'attention';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  fulfillmentStatus?: 'pending' | 'packed' | 'shipped' | 'delivered';
  
  // תשלום
  payment?: IPaymentInfo;
  
  // היסטוריה
  statusHistory: IStatusHistory[];
  
  // מטא-דאטה
  notes?: string; // הערות מיוחדות
  adminNotes?: string; // הערות פנימיות (מנהל)
  trackingNumber?: string; // מספר מעקב משלוח
  estimatedDelivery?: Date; // תאריך משלוח משוער
  
  // טיימסטמפים
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateStatus(newStatus: string, note?: string, updatedBy?: mongoose.Types.ObjectId): Promise<IOrder>;
  canBeCancelled(): boolean;
  calculateTotals(): void;
}

// סכימת פריט בהזמנה
const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  skuId: { type: Schema.Types.ObjectId, ref: 'Sku' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  imageUrl: { type: String },
  attributes: { type: Schema.Types.Mixed },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

// סכימת כתובת
const AddressSchema = new Schema<IShippingAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'IL' },
  notes: { type: String }
}, { _id: false });

// סכימת היסטוריית סטטוס
const StatusHistorySchema = new Schema<IStatusHistory>({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// סכימת פרטי תשלום
const PaymentInfoSchema = new Schema<IPaymentInfo>({
  gateway: { type: String, enum: ['stripe', 'paypal', 'cash'], required: true },
  transactionId: { type: String },
  paymentIntentId: { type: String },
  last4: { type: String },
  brand: { type: String },
  method: { type: String, enum: ['card', 'paypal', 'cash', 'bank_transfer'], required: true },
  paidAt: { type: Date }
}, { _id: false });

// הסכימה הראשית
const OrderSchema = new Schema<IOrder>({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  isGuest: { type: Boolean, default: false },
  guestEmail: { type: String },
  
  items: { type: [OrderItemSchema], required: true, validate: [(val: any[]) => val.length > 0, 'Order must have at least one item'] },
  
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0, default: 0 },
  shippingCost: { type: Number, required: true, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'ILS' },
  
  shippingAddress: { type: AddressSchema, required: true },
  billingAddress: { type: AddressSchema },
  
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'attention'],
    default: 'pending',
    index: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true 
  },
  fulfillmentStatus: { 
    type: String, 
    enum: ['pending', 'packed', 'shipped', 'delivered']
  },
  
  payment: { type: PaymentInfoSchema },
  
  statusHistory: { type: [StatusHistorySchema], default: [] },
  
  notes: { type: String },
  adminNotes: { type: String },
  trackingNumber: { type: String },
  estimatedDelivery: { type: Date },
  
}, { 
  timestamps: true,
  optimisticConcurrency: true // תמיכה ב-optimistic locking עם __v
});

// אינדקסים נוספים לביצועים
OrderSchema.index({ createdAt: -1 }); // למיון לפי תאריך
OrderSchema.index({ 'payment.transactionId': 1 }); // לחיפוש לפי transaction
OrderSchema.index({ guestEmail: 1 }); // לאורחים
OrderSchema.index({ status: 1, createdAt: -1 }); // למסננים

// Method: עדכון סטטוס עם היסטוריה
OrderSchema.methods.updateStatus = async function(
  this: IOrder,
  newStatus: string,
  note?: string,
  updatedBy?: mongoose.Types.ObjectId
): Promise<IOrder> {
  // שמירת הסטטוס הקודם
  this.statusHistory.push({
    status: this.status,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  // עדכון הסטטוס החדש
  this.status = newStatus as any;
  
  return await this.save();
};

// Method: בדיקה האם ניתן לבטל
OrderSchema.methods.canBeCancelled = function(this: IOrder): boolean {
  return ['pending', 'confirmed'].includes(this.status) && 
         this.paymentStatus !== 'refunded';
};

// Method: חישוב סכומים
OrderSchema.methods.calculateTotals = function(this: IOrder): void {
  // חישוב subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // חישוב total
  this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
};

// Pre-save middleware: יצירת מספר הזמנה ייחודי
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // מציאת המספר הסידורי לאותו יום
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    
    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  
  next();
});

// Pre-save middleware: חישוב totals אוטומטי
OrderSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);
```

### 1.2 יצירת WebhookEvent Model

**קובץ**: `server/src/models/WebhookEvent.ts`

```typescript
/**
 * מודל לאחסון אירועי webhook - מבטיח idempotency
 * כל אירוע נשמר פעם אחת בלבד
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string; // מזהה ייחודי מה-gateway
  gateway: 'stripe' | 'paypal';
  eventType: string; // payment.succeeded, charge.refunded וכו'
  status: 'received' | 'processing' | 'processed' | 'failed';
  payload: any; // הנתונים המלאים שהתקבלו
  orderId?: mongoose.Types.ObjectId; // reference להזמנה (אם רלוונטי)
  attempts: number; // כמה פעמים ניסינו לעבד
  lastError?: string; // שגיאה אחרונה (אם היתה)
  processedAt?: Date; // מתי עובד בהצלחה
  expiresAt: Date; // TTL - מחיקה אוטומטית אחרי 90 יום
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { 
    type: String, 
    required: true, 
    unique: true, // מבטיח שכל אירוע מעובד פעם אחת בלבד!
    index: true 
  },
  gateway: { 
    type: String, 
    enum: ['stripe', 'paypal'], 
    required: true,
    index: true 
  },
  eventType: { 
    type: String, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['received', 'processing', 'processed', 'failed'],
    default: 'received',
    index: true 
  },
  payload: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  orderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Order',
    index: true 
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  lastError: { type: String },
  processedAt: { type: Date },
  expiresAt: { 
    type: Date, 
    // מחיקה אוטומטית אחרי 90 יום
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    index: true 
  }
}, { 
  timestamps: true 
});

// TTL Index - MongoDB ימחק אוטומטית documents עם expiresAt שעבר
WebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// אינדקס מורכב לחיפוש מהיר
WebhookEventSchema.index({ gateway: 1, eventType: 1, status: 1 });

export default mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
```

### 1.3 יצירת Order Service

**קובץ**: `server/src/services/orderService.ts`

```typescript
/**
 * שירות הזמנות - לוגיקה עסקית מרכזית
 * כולל תמיכה ב-transactions, optimistic locking ו-saga pattern
 */

import mongoose from 'mongoose';
import Order, { IOrder, IOrderItem } from '../models/Order';
import Product from '../models/Product';
import Sku from '../models/Sku';
import User from '../models/User';
import { emailService } from './emailService';
import { logger } from '../utils/logger';

// ממשק לנתוני הזמנה חדשה
export interface CreateOrderDTO {
  userId: mongoose.Types.ObjectId;
  isGuest?: boolean;
  guestEmail?: string;
  items: Array<{
    productId: string;
    skuId?: string;
    quantity: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country?: string;
    notes?: string;
  };
  billingAddress?: any;
  paymentIntentId?: string; // מ-Stripe
  notes?: string;
}

class OrderService {
  /**
   * יצירת הזמנה חדשה עם transaction מלא
   * מבטיח אטומיות: או שהכל מצליח או שהכל מתבטל
   */
  async createOrder(data: CreateOrderDTO): Promise<IOrder> {
    const session = await mongoose.startSession();
    
    // רשימת compensations למקרה של שגיאה
    const compensations: Array<() => Promise<void>> = [];
    
    try {
      session.startTransaction();
      
      logger.info('🛒 מתחיל יצירת הזמנה חדשה', { 
        userId: data.userId, 
        itemsCount: data.items.length 
      });
      
      // שלב 1: בדיקה ואיסוף נתוני מוצרים
      const orderItems: IOrderItem[] = [];
      
      for (const item of data.items) {
        // שליפת המוצר
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`המוצר ${item.productId} לא נמצא`);
        }
        
        let sku;
        let price: number;
        let skuCode: string;
        let imageUrl: string | undefined;
        let attributes: any = {};
        
        if (item.skuId) {
          // אם יש SKU ספציפי
          sku = await Sku.findById(item.skuId).session(session);
          if (!sku) {
            throw new Error(`SKU ${item.skuId} לא נמצא`);
          }
          
          // בדיקת מלאי
          if (sku.stock < item.quantity) {
            throw new Error(`אין מספיק במלאי עבור ${product.name} (${sku.sku}). זמין: ${sku.stock}, מבוקש: ${item.quantity}`);
          }
          
          price = sku.price;
          skuCode = sku.sku;
          imageUrl = sku.images?.[0]?.url || product.images?.[0]?.url;
          attributes = sku.attributes || {};
          
          // עדכון מלאי עם optimistic locking
          const updateResult = await Sku.updateOne(
            { 
              _id: sku._id, 
              stock: { $gte: item.quantity },
              __v: sku.__v // בדיקת version למניעת race conditions
            },
            { 
              $inc: { stock: -item.quantity, __v: 1 }
            }
          ).session(session);
          
          if (updateResult.modifiedCount === 0) {
            throw new Error(`לא ניתן לעדכן מלאי עבור ${product.name} - ייתכן שהמלאי השתנה`);
          }
          
          // הוספת compensation - החזרת מלאי במקרה של שגיאה
          compensations.push(async () => {
            await Sku.updateOne(
              { _id: sku._id },
              { $inc: { stock: item.quantity } }
            );
            logger.info('↩️ החזרת מלאי SKU', { skuId: sku._id, quantity: item.quantity });
          });
          
        } else {
          // אם אין SKU - שימוש במחיר הבסיסי של המוצר
          price = product.basePrice;
          skuCode = product.sku || `PROD-${product._id}`;
          imageUrl = product.images?.[0]?.url;
        }
        
        // יצירת פריט ההזמנה (snapshot)
        orderItems.push({
          productId: product._id,
          skuId: sku?._id,
          name: product.name,
          sku: skuCode,
          price,
          quantity: item.quantity,
          imageUrl,
          attributes,
          subtotal: price * item.quantity
        });
      }
      
      // שלב 2: חישוב סכומים
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = subtotal * 0.17; // מע"ם 17%
      const shippingCost = subtotal > 200 ? 0 : 30; // משלוח חינם מעל 200 ש"ח
      const total = subtotal + tax + shippingCost;
      
      // שלב 3: יצירת ההזמנה
      const order = new Order({
        userId: data.userId,
        isGuest: data.isGuest || false,
        guestEmail: data.guestEmail,
        items: orderItems,
        subtotal,
        tax,
        shippingCost,
        discount: 0,
        total,
        currency: 'ILS',
        shippingAddress: {
          ...data.shippingAddress,
          country: data.shippingAddress.country || 'IL'
        },
        billingAddress: data.billingAddress,
        status: 'pending',
        paymentStatus: data.paymentIntentId ? 'pending' : 'pending',
        payment: data.paymentIntentId ? {
          gateway: 'stripe',
          paymentIntentId: data.paymentIntentId,
          method: 'card'
        } : undefined,
        notes: data.notes,
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'הזמנה נוצרה'
        }]
      });
      
      await order.save({ session });
      
      logger.info('✅ הזמנה נוצרה בהצלחה', { 
        orderId: order._id, 
        orderNumber: order.orderNumber,
        total: order.total 
      });
      
      // שלב 4: עדכון סטטיסטיקות משתמש
      await User.findByIdAndUpdate(
        data.userId,
        { 
          $inc: { 
            'stats.totalOrders': 1,
            'stats.totalSpent': total
          },
          $set: {
            'stats.lastOrderDate': new Date()
          }
        },
        { session }
      );
      
      // Commit - כל הפעולות הצליחו!
      await session.commitTransaction();
      
      logger.info('🎉 Transaction הושלם בהצלחה', { orderId: order._id });
      
      // שליחת מייל אסינכרונית (מחוץ ל-transaction)
      setImmediate(async () => {
        try {
          await emailService.sendOrderConfirmation(order._id.toString());
        } catch (emailError) {
          logger.error('❌ שגיאה בשליחת מייל אישור', { 
            orderId: order._id, 
            error: emailError 
          });
          // לא זורקים שגיאה - ההזמנה כבר נוצרה
        }
      });
      
      return order;
      
    } catch (error: any) {
      // Rollback - ביצוע compensations
      await session.abortTransaction();
      
      logger.error('❌ שגיאה ביצירת הזמנה - מבצע rollback', { 
        error: error.message,
        userId: data.userId
      });
      
      // ביצוע כל ה-compensations בסדר הפוך
      for (const compensate of compensations.reverse()) {
        try {
          await compensate();
        } catch (compError) {
          logger.error('🚨 שגיאה קריטית ב-compensation!', { 
            error: compError,
            originalError: error.message 
          });
          // שליחת התראה לצוות
          // await alertTeam({ type: 'COMPENSATION_FAILED', error: compError });
        }
      }
      
      throw error;
      
    } finally {
      session.endSession();
    }
  }
  
  /**
   * שליפת הזמנות של משתמש
   */
  async getUserOrders(
    userId: string, 
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ orders: IOrder[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    
    const filter: any = { userId };
    if (options.status) {
      filter.status = options.status;
    }
    
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);
    
    return {
      orders,
      total,
      pages: Math.ceil(total / limit)
    };
  }
  
  /**
   * שליפת הזמנה לפי ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<IOrder | null> {
    const filter: any = { _id: orderId };
    if (userId) {
      filter.userId = userId;
    }
    
    return await Order.findOne(filter).lean();
  }
  
  /**
   * עדכון סטטוס הזמנה (Admin)
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: string,
    note?: string,
    updatedBy?: mongoose.Types.ObjectId
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('הזמנה לא נמצאה');
    }
    
    await order.updateStatus(newStatus, note, updatedBy);
    
    logger.info('📝 סטטוס הזמנה עודכן', { 
      orderId, 
      oldStatus: order.statusHistory[order.statusHistory.length - 1]?.status,
      newStatus 
    });
    
    return order;
  }
  
  /**
   * ביטול הזמנה
   */
  async cancelOrder(orderId: string, userId?: string, reason?: string): Promise<IOrder> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error('הזמנה לא נמצאה');
      }
      
      // בדיקת הרשאה
      if (userId && order.userId.toString() !== userId) {
        throw new Error('אין הרשאה לבטל הזמנה זו');
      }
      
      // בדיקה אם ניתן לבטל
      if (!order.canBeCancelled()) {
        throw new Error('לא ניתן לבטל הזמנה זו בשלב הנוכחי');
      }
      
      // החזרת מלאי
      for (const item of order.items) {
        if (item.skuId) {
          await Sku.updateOne(
            { _id: item.skuId },
            { $inc: { stock: item.quantity } }
          ).session(session);
        }
      }
      
      // עדכון סטטוס
      await order.updateStatus('cancelled', reason || 'בוטל על ידי המשתמש');
      
      // אם שולם - צריך להחזיר כסף
      if (order.paymentStatus === 'paid') {
        // TODO: אינטגרציה עם refund של Stripe/PayPal
        order.paymentStatus = 'refunded';
      }
      
      await order.save({ session });
      
      await session.commitTransaction();
      
      logger.info('🚫 הזמנה בוטלה', { orderId, reason });
      
      return order;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * שליפת כל ההזמנות (Admin)
   */
  async getAllOrders(options: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ orders: IOrder[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    const filter: any = {};
    
    if (options.status) {
      filter.status = options.status;
    }
    
    if (options.paymentStatus) {
      filter.paymentStatus = options.paymentStatus;
    }
    
    if (options.search) {
      filter.$or = [
        { orderNumber: new RegExp(options.search, 'i') },
        { 'shippingAddress.fullName': new RegExp(options.search, 'i') },
        { guestEmail: new RegExp(options.search, 'i') }
      ];
    }
    
    const sort: any = {};
    const sortBy = options.sortBy || 'createdAt';
    sort[sortBy] = options.sortOrder === 'asc' ? 1 : -1;
    
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean(),
      Order.countDocuments(filter)
    ]);
    
    return {
      orders,
      total,
      pages: Math.ceil(total / limit)
    };
  }
}

export default new OrderService();
```

### 1.4 יצירת Order Controller

**קובץ**: `server/src/controllers/orderController.ts`

```typescript
/**
 * קונטרולר הזמנות - נקודות קצה API
 * מטפל בבקשות HTTP ומעביר ל-service
 */

import { Request, Response } from 'express';
import orderService from '../services/orderService';
import { logger } from '../utils/logger';

/**
 * יצירת הזמנה חדשה
 * POST /api/orders
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id; // מ-auth middleware
    
    const orderData = {
      userId,
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      billingAddress: req.body.billingAddress,
      paymentIntentId: req.body.paymentIntentId,
      notes: req.body.notes,
      isGuest: req.body.isGuest,
      guestEmail: req.body.guestEmail
    };
    
    const order = await orderService.createOrder(orderData);
    
    logger.info('✅ הזמנה נוצרה דרך API', { 
      orderId: order._id, 
      userId 
    });
    
    res.status(201).json({
      success: true,
      data: order
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה ביצירת הזמנה', { 
      error: error.message,
      body: req.body 
    });
    
    res.status(400).json({
      success: false,
      message: error.message || 'שגיאה ביצירת ההזמנה'
    });
  }
};

/**
 * שליפת הזמנות של המשתמש
 * GET /api/orders
 */
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const result = await orderService.getUserOrders(userId, {
      page,
      limit,
      status
    });
    
    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בשליפת הזמנות', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנות'
    });
  }
};

/**
 * שליפת הזמנה ספציפית
 * GET /api/orders/:id
 */
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';
    
    // אם לא אדמין - בדוק שזו הזמנה שלו
    const order = await orderService.getOrderById(
      orderId, 
      isAdmin ? undefined : userId
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'הזמנה לא נמצאה'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בשליפת הזמנה', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנה'
    });
  }
};

/**
 * עדכון סטטוס הזמנה (Admin)
 * PATCH /api/orders/:id/status
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { status, note } = req.body;
    const adminId = req.user!._id;
    
    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      note,
      adminId
    );
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בעדכון סטטוס', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    res.status(400).json({
      success: false,
      message: error.message || 'שגיאה בעדכון הסטטוס'
    });
  }
};

/**
 * ביטול הזמנה
 * POST /api/orders/:id/cancel
 */
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';
    const reason = req.body.reason;
    
    const order = await orderService.cancelOrder(
      orderId,
      isAdmin ? undefined : userId,
      reason
    );
    
    res.json({
      success: true,
      data: order,
      message: 'ההזמנה בוטלה בהצלחה'
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בביטול הזמנה', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    res.status(400).json({
      success: false,
      message: error.message || 'שגיאה בביטול ההזמנה'
    });
  }
};

/**
 * שליפת כל ההזמנות (Admin)
 * GET /api/admin/orders
 */
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };
    
    const result = await orderService.getAllOrders(options);
    
    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        pages: result.pages
      }
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בשליפת כל ההזמנות', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנות'
    });
  }
};
```

### 1.5 יצירת Orders Routes

**קובץ**: `server/src/routes/orderRoutes.ts`

```typescript
/**
 * ניתובי הזמנות
 * מגדיר את כל נקודות הקצה של ה-API
 */

import express from 'express';
import * as orderController from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { generalLimiter, authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// כל הניתובים דורשים אימות
router.use(authMiddleware);

/**
 * יצירת הזמנה חדשה
 * POST /api/orders
 * Rate limiting מחמיר - 5 הזמנות ל-15 דקות
 */
router.post(
  '/',
  authLimiter, // משתמש ב-limiter הקיים (5 בקשות ל-15 דקות)
  orderController.createOrder
);

/**
 * שליפת הזמנות של המשתמש
 */
router.get('/', orderController.getUserOrders);

/**
 * שליפת הזמנה ספציפית
 */
router.get('/:id', orderController.getOrderById);

/**
 * ביטול הזמנה
 */
router.post('/:id/cancel', orderController.cancelOrder);

/**
 * ניתובי Admin בלבד
 */
router.patch(
  '/:id/status',
  requireAdmin, // משתמש ב-middleware הקיים
  orderController.updateOrderStatus
);

router.get(
  '/admin/all',
  requireAdmin, // משתמש ב-middleware הקיים
  orderController.getAllOrders
);

export default router;
```

### 1.6 הוספת Routes ל-Server

**קובץ**: `server/src/server.ts` (עדכון)

```typescript
// הוסף את הייבוא
import orderRoutes from './routes/orderRoutes';

// הוסף את הניתוב (אחרי שאר הניתובים, לפני app.listen)
app.use('/api/orders', orderRoutes);
```

**⚠️ הערה קריטית לגבי Stripe Webhooks**:
כאשר תגיע ל-Phase 2 (Webhooks), תצטרך לעדכן את `server.ts` כך:

```typescript
// ⚠️ חשוב! Stripe webhook צריך raw body לאימות חתימה
// חובה לרשום אותו לפני express.json()

import { handleStripeWebhook } from './controllers/webhookController';

// לפני express.json - רק לנתיב Stripe
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// עכשיו ניתן להפעיל express.json עבור שאר ה-API
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// שאר ה-webhooks (Cloudinary כבר קיים)
app.use('/api/webhooks', webhookRoutes);
```

---

## Phase 2: Reliability & Queue System

### תזמון: ימים 5-7 (2-3 ימי עבודה)

### 📋 סדר ביצוע מתוקן (Phase 2)

> **עדכון 25.11.2025**: הסדר שונה לאחר ניתוח מקצועי. Redis מותקן ראשון כי Rate Limiting צריך אותו מיד, ו-Stripe מגיע לפני Queue כי Checkout חייב לעבוד בסיס.

| שלב | תיאור | סיבה |
|-----|-------|------|
| 2.1 | Redis Setup + Health Check | Rate limiting צריך אותו מיד |
| 2.2 | Stripe Service | התשלומים הם הבסיס לכל |
| 2.3 | Payment Controller + Routes | API endpoints לתשלומים |
| 2.4 | Webhook Handler (בסיסי, Promise) | טיפול באירועי Stripe |
| 2.5 | Queue System (BullMQ) | עיבוד אסינכרוני (מיילים, וכו') |
| 2.6 | Workers + Refactor Webhook | שדרוג ל-Queue-based processing |

---

### 2.1 Redis Setup + Health Check

**התקנה**:
```bash
# דרך 1: Docker (מומלץ לפיתוח)
docker run -d --name redis-queue -p 6379:6379 redis:alpine

# דרך 2: Windows (Memurai)
# הורד מ-https://www.memurai.com/

# דרך 3: Cloud (Redis Labs / Upstash)
# חינמי: https://redis.com/try-free/
```

**התקנת חבילות**:
```bash
cd server
npm install ioredis
```

**קובץ**: `server/src/config/redis.ts`

```typescript
/**
 * הגדרת חיבור Redis
 * משמש עבור Rate Limiting, Sessions, ו-Queue System
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

// יצירת חיבור Redis
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    // ניסיון חוזר עם backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Event listeners
redis.on('connect', () => {
  logger.info('✅ Redis: מחובר בהצלחה');
});

redis.on('error', (err) => {
  logger.error('❌ Redis: שגיאת חיבור', { error: err.message });
});

redis.on('close', () => {
  logger.warn('⚠️ Redis: החיבור נסגר');
});

/**
 * בדיקת בריאות Redis
 */
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('❌ Redis health check נכשל', { error });
    return false;
  }
};

export default redis;
```

**הוספת Health Check Endpoint** (לקובץ server.ts או routes):

```typescript
// בדיקת בריאות כללית כולל Redis
app.get('/api/health', async (req, res) => {
  const redisHealthy = await checkRedisHealth();
  
  res.json({
    status: redisHealthy ? 'healthy' : 'degraded',
    services: {
      mongodb: mongoose.connection.readyState === 1,
      redis: redisHealthy
    },
    timestamp: new Date().toISOString()
  });
});
```

---

### 2.2 Stripe Service

**התקנה**:
```bash
cd server
npm install stripe
```

**קובץ**: `server/src/services/stripeService.ts`

```typescript
/**
 * שירות אינטגרציה עם Stripe
 * כולל payment intents, webhooks ו-refunds
 */

import Stripe from 'stripe';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

class StripeService {
  /**
   * יצירת Payment Intent
   */
  async createPaymentIntent(amount: number, currency: string = 'ils', metadata?: any) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // המרה לאגורות
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });
      
      logger.info('💳 Payment Intent נוצר', { 
        paymentIntentId: paymentIntent.id,
        amount 
      });
      
      return paymentIntent;
      
    } catch (error: any) {
      logger.error('❌ שגיאה ביצירת Payment Intent', { error: error.message });
      throw error;
    }
  }
  
  /**
   * לכידת תשלום (capture)
   */
  async capturePayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
      
      logger.info('✅ תשלום נלכד', { paymentIntentId });
      
      return paymentIntent;
      
    } catch (error: any) {
      logger.error('❌ שגיאה בלכידת תשלום', { 
        paymentIntentId,
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * החזר כספי (refund)
   */
  async refundPayment(chargeId: string, amount?: number) {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount * 100) : undefined
      });
      
      logger.info('💰 החזר כספי בוצע', { 
        refundId: refund.id,
        chargeId,
        amount 
      });
      
      return refund;
      
    } catch (error: any) {
      logger.error('❌ שגיאה בהחזר כספי', { 
        chargeId,
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * בדיקת סטטוס תשלום
   */
  async getPaymentStatus(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
      
    } catch (error: any) {
      logger.error('❌ שגיאה בבדיקת סטטוס תשלום', { 
        paymentIntentId,
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * אימות webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      return event;
      
    } catch (error: any) {
      logger.error('❌ אימות webhook נכשל', { error: error.message });
      throw new Error('Invalid webhook signature');
    }
  }
}

export const stripeService = new StripeService();
```

---

### 2.3 Payment Controller + Routes

**קובץ**: `server/src/controllers/paymentController.ts`

```typescript
/**
 * קונטרולר תשלומים
 * מטפל ביצירת Payment Intents וניהול תשלומים
 */

import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import Order from '../models/Order';
import { logger } from '../utils/logger';

/**
 * יצירת Payment Intent להזמנה
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, orderId, currency = 'ils' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'סכום תשלום לא תקין'
      });
    }
    
    const paymentIntent = await stripeService.createPaymentIntent(
      amount,
      currency,
      { orderId: orderId || 'pending' }
    );
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה ביצירת Payment Intent', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת תשלום'
    });
  }
};

/**
 * בדיקת סטטוס תשלום
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    
    const status = await stripeService.getPaymentStatus(paymentIntentId);
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בבדיקת סטטוס תשלום', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת סטטוס תשלום'
    });
  }
};
```

**קובץ**: `server/src/routes/paymentRoutes.ts`

```typescript
/**
 * ניתובי תשלומים
 */

import express from 'express';
import * as paymentController from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// יצירת Payment Intent
router.post('/create-intent', authMiddleware, paymentController.createPaymentIntent);

// בדיקת סטטוס תשלום
router.get('/status/:paymentIntentId', authMiddleware, paymentController.getPaymentStatus);

export default router;
```

**הוספה ל-server.ts**:
```typescript
import paymentRoutes from './routes/paymentRoutes';

// הוספת ניתוב תשלומים
app.use('/api/payments', paymentRoutes);
```

---

### 2.4 Webhook Handler (בסיסי, Promise)

**קובץ**: `server/src/controllers/webhookController.ts`

```typescript
/**
 * קונטרולר webhooks - גרסה בסיסית עם Promise
 * מטפל באירועי Stripe
 * הערה: בשלב 2.6 נשדרג לשימוש ב-Queue
 */

import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import WebhookEvent from '../models/WebhookEvent';
import Order from '../models/Order';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';

/**
 * טיפול ב-Stripe webhooks
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).send('Missing stripe-signature header');
  }
  
  try {
    // אימות ה-webhook
    const event = stripeService.verifyWebhookSignature(
      req.body.toString(),
      signature
    );
    
    // בדיקת אידמפוטנציה - האם כבר טיפלנו באירוע זה?
    const existingEvent = await WebhookEvent.findOne({ eventId: event.id });
    if (existingEvent?.status === 'processed') {
      logger.info('⏭️ Webhook כבר עובד, מדלג', { eventId: event.id });
      return res.json({ received: true, skipped: true });
    }
    
    // יצירת רשומת webhook
    const webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId: event.id },
      {
        eventId: event.id,
        gateway: 'stripe',
        eventType: event.type,
        status: 'processing',
        rawPayload: event
      },
      { upsert: true, new: true }
    );
    
    // עיבוד האירוע (Promise-based בשלב זה)
    await processStripeEvent(event, webhookEvent);
    
    res.json({ received: true });
    
  } catch (error: any) {
    logger.error('❌ שגיאה בטיפול ב-webhook', { error: error.message });
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * עיבוד אירועי Stripe
 */
async function processStripeEvent(event: any, webhookEvent: any) {
  const paymentIntent = event.data.object;
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(paymentIntent, webhookEvent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(paymentIntent, webhookEvent);
        break;
        
      case 'charge.refunded':
        await handleRefund(event.data.object, webhookEvent);
        break;
        
      default:
        logger.info('📨 אירוע Stripe לא מטופל', { type: event.type });
    }
    
    // עדכון סטטוס webhook
    webhookEvent.status = 'processed';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
    
  } catch (error: any) {
    webhookEvent.status = 'failed';
    webhookEvent.error = error.message;
    await webhookEvent.save();
    throw error;
  }
}

/**
 * טיפול בתשלום מוצלח
 */
async function handlePaymentSuccess(paymentIntent: any, webhookEvent: any) {
  const orderId = paymentIntent.metadata?.orderId;
  
  if (!orderId || orderId === 'pending') {
    logger.warn('⚠️ Payment Intent ללא orderId', { 
      paymentIntentId: paymentIntent.id 
    });
    return;
  }
  
  const order = await Order.findById(orderId);
  if (!order) {
    logger.error('❌ הזמנה לא נמצאה', { orderId });
    return;
  }
  
  // עדכון סטטוס הזמנה
  order.status = 'confirmed';
  order.payment.status = 'paid';
  order.payment.transactionId = paymentIntent.id;
  order.payment.paidAt = new Date();
  await order.save();
  
  logger.info('✅ הזמנה עודכנה לאחר תשלום', { 
    orderId,
    orderNumber: order.orderNumber 
  });
  
  // שליחת מייל אישור (Promise - לא async!)
  // TODO: בשלב 2.6 נעביר ל-Queue
  emailService.sendOrderConfirmation(orderId).catch(err => {
    logger.error('❌ שגיאה בשליחת מייל אישור', { orderId, error: err.message });
  });
}

/**
 * טיפול בתשלום כושל
 */
async function handlePaymentFailure(paymentIntent: any, webhookEvent: any) {
  const orderId = paymentIntent.metadata?.orderId;
  
  if (!orderId || orderId === 'pending') return;
  
  const order = await Order.findById(orderId);
  if (!order) return;
  
  order.payment.status = 'failed';
  await order.save();
  
  logger.warn('⚠️ תשלום נכשל', { 
    orderId,
    paymentIntentId: paymentIntent.id 
  });
}

/**
 * טיפול בהחזר כספי
 */
async function handleRefund(refund: any, webhookEvent: any) {
  logger.info('💰 החזר כספי', { refundId: refund.id });
  // TODO: מימוש טיפול בהחזר
}
```

**קובץ**: `server/src/routes/webhookRoutes.ts`

```typescript
/**
 * ניתובי webhooks
 * הערה: Stripe webhook חייב raw body לאימות!
 */

import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController';

const router = express.Router();

// Stripe webhook - חייב raw body!
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
```

**עדכון server.ts** (חשוב מאוד!):
```typescript
// ⚠️ Stripe webhook צריך raw body - חייב להיות לפני express.json()!
import { handleStripeWebhook } from './controllers/webhookController';

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// רק אחרי זה - JSON parsing לשאר ה-API
app.use(express.json({ limit: '50mb' }));
```

---

### 2.5 Queue System (BullMQ)

**התקנה**:
```bash
cd server
npm install bull
```

**קובץ**: `server/src/jobs/queue.ts`

```typescript
/**
 * תצורת Queue עם Bull ו-Redis
 * מטפל בעיבוד אסינכרוני של משימות
 */

import Queue from 'bull';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// Queue למיילים
export const emailQueue = new Queue('emails', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 500,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000
    }
  }
});

// Queue לתשלומים
export const paymentQueue = new Queue('payments', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 2000,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// Event listeners לניטור
emailQueue.on('completed', (job) => {
  logger.info('📧 מייל נשלח', { jobId: job.id });
});

emailQueue.on('failed', (job, err) => {
  logger.error('❌ שליחת מייל נכשלה', { jobId: job?.id, error: err.message });
});

paymentQueue.on('completed', (job) => {
  logger.info('💳 משימת תשלום הושלמה', { jobId: job.id });
});

paymentQueue.on('failed', (job, err) => {
  logger.error('❌ משימת תשלום נכשלה', { jobId: job?.id, error: err.message });
});

export default {
  emailQueue,
  paymentQueue
};
```

---

### 2.6 Workers + Refactor Webhook

**קובץ**: `server/src/jobs/processors/emailProcessor.ts`

```typescript
/**
 * Worker לעיבוד משימות מייל
 */

import { Job } from 'bull';
import { sendPasswordResetEmail } from '../../services/emailService';
import { logger } from '../../utils/logger';

interface EmailJobData {
  type: 'orderConfirmation' | 'orderStatusUpdate' | 'orderCancellation';
  orderId: string;
  email?: string;
  additionalData?: any;
}

/**
 * מעבד משימות מייל
 */
export const processEmailJob = async (job: Job<EmailJobData>) => {
  const { type, orderId, email, additionalData } = job.data;
  
  logger.info(`📧 מעבד משימת מייל: ${type}`, { 
    jobId: job.id, 
    orderId 
  });
  
  try {
    switch (type) {
      case 'orderConfirmation':
        await emailService.sendOrderConfirmation(orderId);
        break;
        
      case 'orderStatusUpdate':
        await emailService.sendOrderStatusUpdate(orderId, additionalData);
        break;
        
      case 'orderCancellation':
        await emailService.sendOrderCancellation(orderId);
        break;
        
      default:
        throw new Error(`סוג מייל לא ידוע: ${type}`);
    }
    
    logger.info(`✅ מייל נשלח בהצלחה: ${type}`, { 
      jobId: job.id, 
      orderId 
    });
    
    return { success: true, type, orderId };
    
  } catch (error: any) {
    logger.error(`❌ שגיאה בשליחת מייל: ${type}`, { 
      jobId: job.id, 
      orderId,
      error: error.message 
    });
    
    // זריקת שגיאה תגרום ל-retry אוטומטי
    throw error;
  }
};
```

**קובץ**: `server/src/jobs/processors/paymentProcessor.ts`

```typescript
/**
 * Worker לעיבוד משימות תשלום
 */

import { Job } from 'bull';
import Order from '../../models/Order';
import { stripeService } from '../../services/stripeService';
import { logger } from '../../utils/logger';

interface PaymentJobData {
  type: 'capturePayment' | 'refundPayment' | 'checkPaymentStatus';
  orderId: string;
  paymentIntentId?: string;
  amount?: number;
}

/**
 * מעבד משימות תשלום
 */
export const processPaymentJob = async (job: Job<PaymentJobData>) => {
  const { type, orderId, paymentIntentId, amount } = job.data;
  
  logger.info(`💳 מעבד משימת תשלום: ${type}`, { 
    jobId: job.id, 
    orderId 
  });
  
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('הזמנה לא נמצאה');
    }
    
    switch (type) {
      case 'capturePayment':
        if (!paymentIntentId) {
          throw new Error('חסר payment intent ID');
        }
        const captureResult = await stripeService.capturePayment(paymentIntentId);
        
        // עדכון ההזמנה
        order.paymentStatus = 'paid';
        order.payment = {
          ...order.payment!,
          transactionId: captureResult.id,
          paidAt: new Date()
        };
        await order.save();
        break;
        
      case 'refundPayment':
        if (!order.payment?.transactionId) {
          throw new Error('אין transaction ID להחזר');
        }
        await stripeService.refundPayment(
          order.payment.transactionId,
          amount || order.total
        );
        
        order.paymentStatus = amount && amount < order.total 
          ? 'partially_refunded' 
          : 'refunded';
        await order.save();
        break;
        
      case 'checkPaymentStatus':
        if (!paymentIntentId) {
          throw new Error('חסר payment intent ID');
        }
        const status = await stripeService.getPaymentStatus(paymentIntentId);
        
        if (status.status === 'succeeded' && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.payment = {
            ...order.payment!,
            paidAt: new Date()
          };
          await order.save();
        }
        break;
        
      default:
        throw new Error(`סוג משימה לא ידוע: ${type}`);
    }
    
    logger.info(`✅ משימת תשלום הושלמה: ${type}`, { 
      jobId: job.id, 
      orderId 
    });
    
    return { success: true, type, orderId };
    
  } catch (error: any) {
    logger.error(`❌ שגיאה במשימת תשלום: ${type}`, { 
      jobId: job.id, 
      orderId,
      error: error.message 
    });
    
    throw error;
  }
};
```

**קובץ**: `server/src/jobs/worker.ts`

```typescript
/**
 * הפעלת כל ה-workers
 * יש להריץ בתהליך נפרד או כ-cluster
 */

import { emailQueue, paymentQueue } from './queue';
import { processEmailJob } from './processors/emailProcessor';
import { processPaymentJob } from './processors/paymentProcessor';
import { logger } from '../utils/logger';

// הגדרת concurrency (כמה משימות במקביל)
const EMAIL_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '5');
const PAYMENT_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '3');

/**
 * הפעלת email worker
 */
emailQueue.process(EMAIL_CONCURRENCY, processEmailJob);

/**
 * הפעלת payment worker
 */
paymentQueue.process(PAYMENT_CONCURRENCY, processPaymentJob);

logger.info('🚀 Workers הופעלו בהצלחה', {
  emailConcurrency: EMAIL_CONCURRENCY,
  paymentConcurrency: PAYMENT_CONCURRENCY
});

// טיפול ב-graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('📴 מקבל SIGTERM - סוגר workers...');
  
  await emailQueue.close();
  await paymentQueue.close();
  
  logger.info('✅ Workers נסגרו בהצלחה');
  process.exit(0);
});
```

**שדרוג Webhook Controller לשימוש ב-Queue**:

עדכון ל-`server/src/controllers/webhookController.ts`:

```typescript
// החלף את שליחת המייל ישירות בהוספה ל-Queue:

// במקום זה:
// emailService.sendOrderConfirmation(orderId).catch(...)

// השתמש בזה:
import { emailQueue } from '../jobs/queue';

// בפונקציה handlePaymentSuccess:
await emailQueue.add({
  type: 'orderConfirmation',
  orderId: String(order._id)
});
```

---

## Phase 3: Frontend Implementation

### תזמון: ימים 8-11 (3-4 ימי עבודה)

### 3.1 Stripe Provider Setup

**קובץ**: `client/src/providers/StripeProvider.tsx`

```typescript
/**
 * Stripe Provider - עוטף את האפליקציה
 */

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode } from 'react';

// טעינת Stripe עם המפתח הציבורי
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeProviderProps {
  children: ReactNode;
}

export const StripeProvider = ({ children }: StripeProviderProps) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};
```

### 3.2 Orders API Client

**קובץ**: `client/src/api/orders.ts`

```typescript
/**
 * API client להזמנות
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// יצירת instance של axios עם הגדרות
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor להוספת token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateOrderData {
  items: Array<{
    productId: string;
    skuId?: string;
    quantity: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country?: string;
    notes?: string;
  };
  billingAddress?: any;
  paymentIntentId?: string;
  notes?: string;
}

/**
 * יצירת הזמנה חדשה
 */
export const createOrder = async (data: CreateOrderData) => {
  const response = await api.post('/orders', data);
  return response.data;
};

/**
 * שליפת הזמנות של המשתמש
 */
export const getUserOrders = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

/**
 * שליפת הזמנה ספציפית
 */
export const getOrderById = async (orderId: string) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

/**
 * ביטול הזמנה
 */
export const cancelOrder = async (orderId: string, reason?: string) => {
  const response = await api.post(`/orders/${orderId}/cancel`, { reason });
  return response.data;
};

/**
 * יצירת Payment Intent
 */
export const createPaymentIntent = async (amount: number) => {
  const response = await api.post('/payments/create-intent', { amount });
  return response.data;
};
```

### 3.3 CheckoutPage

**קובץ**: `client/src/pages/CheckoutPage/CheckoutPage.tsx`

```typescript
/**
 * עמוד Checkout - השלמת הזמנה
 * כולל טופס כתובת ותשלום Stripe
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectCartItems, clearCart } from '../../store/slices/cartSlice';
import { createOrder, createPaymentIntent } from '../../api/orders';
import styles from './CheckoutPage.module.css';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useAppDispatch();
  
  const cartItems = useAppSelector(selectCartItems);
  
  // מצבים
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // פרטי כתובת
  const [shippingData, setShippingData] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'IL',
    notes: ''
  });
  
  // חישוב סכומים
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.17;
  const shipping = subtotal > 200 ? 0 : 30;
  const total = subtotal + tax + shipping;
  
  // יצירת Payment Intent בטעינת הדף
  useEffect(() => {
    if (total > 0) {
      createPaymentIntent(total)
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error('שגיאה ביצירת Payment Intent:', err);
          setError('שגיאה בהכנת התשלום');
        });
    }
  }, [total]);
  
  // טיפול בשליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // שלב 1: אישור התשלום
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: shippingData.fullName,
              phone: shippingData.phone
            }
          }
        }
      );
      
      if (stripeError) {
        throw new Error(stripeError.message);
      }
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('התשלום לא אושר');
      }
      
      // שלב 2: יצירת ההזמנה
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          skuId: item.skuId,
          quantity: item.quantity
        })),
        shippingAddress: shippingData,
        paymentIntentId: paymentIntent.id
      };
      
      const response = await createOrder(orderData);
      
      if (!response.success) {
        throw new Error(response.message || 'שגיאה ביצירת ההזמנה');
      }
      
      // שלב 3: ניקוי העגלה ומעבר לעמוד הצלחה
      dispatch(clearCart());
      navigate(`/order-success/${response.data._id}`);
      
    } catch (err: any) {
      console.error('שגיאה בתהליך התשלום:', err);
      setError(err.message || 'שגיאה בתהליך התשלום');
    } finally {
      setLoading(false);
    }
  };
  
  // אם אין פריטים בעגלה
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <h2>העגלה ריקה</h2>
        <button onClick={() => navigate('/products')}>
          חזרה לקניות
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.checkoutPage}>
      <div className={styles.container}>
        <h1>השלמת הזמנה</h1>
        
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        <div className={styles.content}>
          {/* סיכום הזמנה */}
          <div className={styles.orderSummary}>
            <h2>סיכום הזמנה</h2>
            
            <div className={styles.items}>
              {cartItems.map((item) => (
                <div key={item._id} className={styles.item}>
                  <img src={item.imageUrl} alt={item.name} />
                  <div className={styles.itemDetails}>
                    <h3>{item.name}</h3>
                    <p>כמות: {item.quantity}</p>
                    <p className={styles.price}>
                      ₪{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.totals}>
              <div className={styles.row}>
                <span>סכום ביניים:</span>
                <span>₪{subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.row}>
                <span>מע"מ:</span>
                <span>₪{tax.toFixed(2)}</span>
              </div>
              <div className={styles.row}>
                <span>משלוח:</span>
                <span>{shipping === 0 ? 'חינם' : `₪${shipping.toFixed(2)}`}</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>סה"כ:</span>
                <span>₪{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* טופס תשלום */}
          <form onSubmit={handleSubmit} className={styles.checkoutForm}>
            <h2>פרטי משלוח</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="fullName">שם מלא *</label>
              <input
                id="fullName"
                type="text"
                value={shippingData.fullName}
                onChange={(e) => setShippingData({
                  ...shippingData,
                  fullName: e.target.value
                })}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="phone">טלפון *</label>
              <input
                id="phone"
                type="tel"
                value={shippingData.phone}
                onChange={(e) => setShippingData({
                  ...shippingData,
                  phone: e.target.value
                })}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="street">כתובת *</label>
              <input
                id="street"
                type="text"
                value={shippingData.street}
                onChange={(e) => setShippingData({
                  ...shippingData,
                  street: e.target.value
                })}
                required
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city">עיר *</label>
                <input
                  id="city"
                  type="text"
                  value={shippingData.city}
                  onChange={(e) => setShippingData({
                    ...shippingData,
                    city: e.target.value
                  })}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="postalCode">מיקוד *</label>
                <input
                  id="postalCode"
                  type="text"
                  value={shippingData.postalCode}
                  onChange={(e) => setShippingData({
                    ...shippingData,
                    postalCode: e.target.value
                  })}
                  required
                />
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="notes">הערות</label>
              <textarea
                id="notes"
                value={shippingData.notes}
                onChange={(e) => setShippingData({
                  ...shippingData,
                  notes: e.target.value
                })}
                rows={3}
              />
            </div>
            
            <h2>פרטי תשלום</h2>
            
            <div className={styles.cardElement}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
            
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !stripe || !clientSecret}
            >
              {loading ? 'מעבד תשלום...' : `שלם ₪${total.toFixed(2)}`}
            </button>
            
            <p className={styles.secure}>
              🔒 תשלום מאובטח דרך Stripe
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 CheckoutPage Styles

**קובץ**: `client/src/pages/CheckoutPage/CheckoutPage.module.css`

```css
/* עמוד Checkout - סגנונות */

.checkoutPage {
  min-height: 100vh;
  background: var(--color-bg-secondary, #f5f5f5);
  padding: 2rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.container h1 {
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  color: var(--color-text-primary, #333);
}

.error {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
}

.emptyCart {
  text-align: center;
  padding: 4rem 2rem;
}

.emptyCart h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #666;
}

.emptyCart button {
  background: var(--color-primary, #007bff);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.emptyCart button:hover {
  background: var(--color-primary-dark, #0056b3);
}

.content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 968px) {
  .content {
    grid-template-columns: 1fr;
  }
}

.orderSummary {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;
}

.orderSummary h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary, #333);
}

.items {
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 1.5rem 0;
  margin-bottom: 1.5rem;
}

.item {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.item:last-child {
  margin-bottom: 0;
}

.item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.itemDetails {
  flex: 1;
}

.itemDetails h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary, #333);
}

.itemDetails p {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.price {
  font-weight: 600;
  color: var(--color-primary, #007bff);
}

.totals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  color: #666;
}

.row.total {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary, #333);
  padding-top: 0.75rem;
  border-top: 2px solid #eee;
  margin-top: 0.75rem;
}

.checkoutForm {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.checkoutForm h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary, #333);
  border-bottom: 2px solid var(--color-primary, #007bff);
  padding-bottom: 0.5rem;
}

.formGroup {
  margin-bottom: 1.5rem;
}

.formGroup label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary, #333);
}

.formGroup input,
.formGroup textarea {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.3s;
}

.formGroup input:focus,
.formGroup textarea:focus {
  outline: none;
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .formRow {
    grid-template-columns: 1fr;
  }
}

.cardElement {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  background: #fafafa;
}

.submitButton {
  width: 100%;
  background: var(--color-primary, #007bff);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.submitButton:hover:not(:disabled) {
  background: var(--color-primary-dark, #0056b3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.submitButton:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secure {
  text-align: center;
  font-size: 0.875rem;
  color: #666;
  margin-top: 1rem;
}
```

### 3.5 OrderSuccessPage

**קובץ**: `client/src/pages/OrderSuccessPage/OrderSuccessPage.tsx`

```typescript
/**
 * עמוד הצלחת הזמנה
 * מציג סיכום ההזמנה ומספר הזמנה
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrderById } from '../../api/orders';
import styles from './OrderSuccessPage.module.css';

interface Order {
  _id: string;
  orderNumber: string;
  items: any[];
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  shippingAddress: any;
  createdAt: string;
}

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }
    
    // שליפת פרטי ההזמנה
    getOrderById(orderId)
      .then((response) => {
        if (response.success) {
          setOrder(response.data);
        } else {
          setError('לא ניתן למצוא את ההזמנה');
        }
      })
      .catch((err) => {
        console.error('שגיאה בשליפת הזמנה:', err);
        setError('שגיאה בטעינת פרטי ההזמנה');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, navigate]);
  
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>טוען פרטי הזמנה...</p>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className={styles.error}>
        <h2>שגיאה</h2>
        <p>{error || 'הזמנה לא נמצאה'}</p>
        <Link to="/" className={styles.homeButton}>
          חזרה לדף הבית
        </Link>
      </div>
    );
  }
  
  return (
    <div className={styles.successPage}>
      <div className={styles.container}>
        {/* אייקון הצלחה */}
        <div className={styles.successIcon}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <h1>ההזמנה בוצעה בהצלחה!</h1>
        <p className={styles.subtitle}>
          תודה רבה על הקנייה. קיבלנו את ההזמנה שלך ונתחיל לעבד אותה בקרוב.
        </p>
        
        {/* פרטי הזמנה */}
        <div className={styles.orderDetails}>
          <div className={styles.detailRow}>
            <span className={styles.label}>מספר הזמנה:</span>
            <span className={styles.value}>{order.orderNumber}</span>
          </div>
          
          <div className={styles.detailRow}>
            <span className={styles.label}>סטטוס:</span>
            <span className={`${styles.badge} ${styles[order.status]}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          
          <div className={styles.detailRow}>
            <span className={styles.label}>סטטוס תשלום:</span>
            <span className={`${styles.badge} ${styles[order.paymentStatus]}`}>
              {getPaymentStatusText(order.paymentStatus)}
            </span>
          </div>
          
          <div className={styles.detailRow}>
            <span className={styles.label}>סכום כולל:</span>
            <span className={styles.total}>
              {order.currency === 'ILS' ? '₪' : '$'}
              {order.total.toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* כתובת משלוח */}
        <div className={styles.section}>
          <h2>כתובת משלוח</h2>
          <div className={styles.address}>
            <p><strong>{order.shippingAddress.fullName}</strong></p>
            <p>{order.shippingAddress.street}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
            <p>{order.shippingAddress.phone}</p>
          </div>
        </div>
        
        {/* פריטי הזמנה */}
        <div className={styles.section}>
          <h2>פריטים בהזמנה</h2>
          <div className={styles.items}>
            {order.items.map((item, index) => (
              <div key={index} className={styles.item}>
                <img src={item.imageUrl} alt={item.name} />
                <div className={styles.itemDetails}>
                  <h3>{item.name}</h3>
                  <p className={styles.sku}>מק"ט: {item.sku}</p>
                  <div className={styles.itemFooter}>
                    <span className={styles.quantity}>כמות: {item.quantity}</span>
                    <span className={styles.price}>
                      ₪{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Link to={`/orders/${order._id}`} className={styles.viewButton}>
            צפה בהזמנה
          </Link>
          <Link to="/products" className={styles.continueButton}>
            המשך קניות
          </Link>
        </div>
        
        {/* הודעת מייל */}
        <p className={styles.emailNote}>
          📧 שלחנו אימייל עם פרטי ההזמנה לכתובת המייל שלך
        </p>
      </div>
    </div>
  );
}

// פונקציות עזר לתרגום סטטוסים
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'ממתין',
    confirmed: 'אושר',
    processing: 'בעיבוד',
    shipped: 'נשלח',
    delivered: 'נמסר',
    cancelled: 'בוטל',
    returned: 'הוחזר',
    attention: 'דורש טיפול'
  };
  return statusMap[status] || status;
}

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'ממתין לתשלום',
    paid: 'שולם',
    failed: 'נכשל',
    refunded: 'הוחזר',
    partially_refunded: 'הוחזר חלקית'
  };
  return statusMap[status] || status;
}
```

### 3.6 OrderSuccessPage Styles

**קובץ**: `client/src/pages/OrderSuccessPage/OrderSuccessPage.module.css`

```css
/* עמוד הצלחת הזמנה */

.successPage {
  min-height: 100vh;
  background: var(--color-bg-secondary, #f5f5f5);
  padding: 3rem 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 3rem 2rem;
}

.successIcon {
  width: 80px;
  height: 80px;
  margin: 0 auto 2rem;
  color: #28a745;
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.successIcon svg {
  width: 100%;
  height: 100%;
}

.container h1 {
  font-size: 2rem;
  text-align: center;
  color: var(--color-text-primary, #333);
  margin-bottom: 1rem;
}

.subtitle {
  text-align: center;
  font-size: 1.125rem;
  color: #666;
  margin-bottom: 2rem;
}

.orderDetails {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.detailRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.detailRow:last-child {
  border-bottom: none;
}

.label {
  font-size: 1rem;
  color: #666;
}

.value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #333);
}

.total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary, #007bff);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge.pending {
  background: #ffc107;
  color: #856404;
}

.badge.confirmed,
.badge.paid {
  background: #28a745;
  color: white;
}

.badge.processing {
  background: #17a2b8;
  color: white;
}

.badge.shipped {
  background: #007bff;
  color: white;
}

.badge.delivered {
  background: #28a745;
  color: white;
}

.badge.cancelled,
.badge.failed {
  background: #dc3545;
  color: white;
}

.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-text-primary, #333);
  border-bottom: 2px solid var(--color-primary, #007bff);
  padding-bottom: 0.5rem;
}

.address {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.address p {
  margin-bottom: 0.5rem;
  color: #666;
}

.address p:last-child {
  margin-bottom: 0;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.item img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.itemDetails {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.itemDetails h3 {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary, #333);
}

.sku {
  font-size: 0.875rem;
  color: #999;
  margin-bottom: auto;
}

.itemFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.quantity {
  font-size: 0.875rem;
  color: #666;
}

.price {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary, #007bff);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (max-width: 640px) {
  .actions {
    flex-direction: column;
  }
}

.viewButton,
.continueButton {
  flex: 1;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s;
}

.viewButton {
  background: var(--color-primary, #007bff);
  color: white;
}

.viewButton:hover {
  background: var(--color-primary-dark, #0056b3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.continueButton {
  background: white;
  color: var(--color-primary, #007bff);
  border: 2px solid var(--color-primary, #007bff);
}

.continueButton:hover {
  background: var(--color-primary, #007bff);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.emailNote {
  text-align: center;
  font-size: 0.875rem;
  color: #666;
  font-style: italic;
}

.loading,
.error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--color-primary, #007bff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.homeButton {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: var(--color-primary, #007bff);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.3s;
}

.homeButton:hover {
  background: var(--color-primary-dark, #0056b3);
}
```

### 3.7 הוספת Routes בקליינט

**קובץ**: `client/src/routes/router.tsx` או `AppRoutes.tsx` (עדכון)

```typescript
// הוסף את הייבואים
import CheckoutPage from '../pages/CheckoutPage/CheckoutPage';
import OrderSuccessPage from '../pages/OrderSuccessPage/OrderSuccessPage';

// הוסף את הניתובים
<Route path="/checkout" element={<CheckoutPage />} />
<Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
```

### 3.8 עדכון App.tsx עם Stripe Provider

**קובץ**: `client/src/App.tsx` (עדכון)

```typescript
import { StripeProvider } from './providers/StripeProvider';

function App() {
  return (
    <StripeProvider>
      {/* שאר האפליקציה */}
      <RouterProvider router={router} />
    </StripeProvider>
  );
}
```

---

## Phase 4: Testing & Security

### תזמון: ימים 12-14 (2-3 ימי עבודה)

### 4.1 Unit Tests - Order Service

**קובץ**: `server/src/tests/orderService.test.ts`

```typescript
/**
 * בדיקות יחידה לשירות הזמנות
 */

import mongoose from 'mongoose';
import orderService from '../services/orderService';
import Order from '../models/Order';
import Product from '../models/Product';
import Sku from '../models/Sku';
import User from '../models/User';

// Mock setup
jest.mock('../services/emailService');

describe('OrderService', () => {
  beforeAll(async () => {
    // התחברות ל-test DB
    await mongoose.connect(process.env.TEST_MONGO_URI!);
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    // ניקוי לפני כל בדיקה
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Sku.deleteMany({});
    await User.deleteMany({});
  });
  
  describe('createOrder', () => {
    it('צריך ליצור הזמנה בהצלחה עם transaction', async () => {
      // Arrange: יצירת מוצר ומשתמש
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        basePrice: 100,
        sku: 'TEST-001'
      });
      
      const sku = await Sku.create({
        productId: product._id,
        sku: 'TEST-SKU-001',
        price: 100,
        stock: 10
      });
      
      // Act: יצירת הזמנה
      const orderData = {
        userId: user._id,
        items: [{
          productId: product._id.toString(),
          skuId: sku._id.toString(),
          quantity: 2
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '0501234567',
          street: 'Test St 1',
          city: 'Test City',
          postalCode: '12345',
          country: 'IL'
        }
      };
      
      const order = await orderService.createOrder(orderData);
      
      // Assert
      expect(order).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.status).toBe('pending');
      expect(order.paymentStatus).toBe('pending');
      
      // בדיקת עדכון מלאי
      const updatedSku = await Sku.findById(sku._id);
      expect(updatedSku!.stock).toBe(8); // 10 - 2
    });
    
    it('צריך לבצע rollback אם המלאי לא מספיק', async () => {
      // Arrange
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      const product = await Product.create({
        name: 'Test Product',
        basePrice: 100,
        sku: 'TEST-001'
      });
      
      const sku = await Sku.create({
        productId: product._id,
        sku: 'TEST-SKU-001',
        price: 100,
        stock: 1 // מלאי מועט
      });
      
      // Act & Assert
      const orderData = {
        userId: user._id,
        items: [{
          productId: product._id.toString(),
          skuId: sku._id.toString(),
          quantity: 5 // מבקש יותר מהמלאי
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '0501234567',
          street: 'Test St 1',
          city: 'Test City',
          postalCode: '12345',
          country: 'IL'
        }
      };
      
      await expect(orderService.createOrder(orderData))
        .rejects
        .toThrow('אין מספיק במלאי');
      
      // בדיקה שהמלאי לא השתנה
      const unchangedSku = await Sku.findById(sku._id);
      expect(unchangedSku!.stock).toBe(1);
      
      // בדיקה שלא נוצרה הזמנה
      const orders = await Order.find({});
      expect(orders).toHaveLength(0);
    });
  });
  
  describe('cancelOrder', () => {
    it('צריך לבטל הזמנה ולהחזיר מלאי', async () => {
      // Arrange: יצירת הזמנה
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      const product = await Product.create({
        name: 'Test Product',
        basePrice: 100,
        sku: 'TEST-001'
      });
      
      const sku = await Sku.create({
        productId: product._id,
        sku: 'TEST-SKU-001',
        price: 100,
        stock: 10
      });
      
      const order = await orderService.createOrder({
        userId: user._id,
        items: [{
          productId: product._id.toString(),
          skuId: sku._id.toString(),
          quantity: 3
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '0501234567',
          street: 'Test St 1',
          city: 'Test City',
          postalCode: '12345',
          country: 'IL'
        }
      });
      
      // Act: ביטול ההזמנה
      const cancelledOrder = await orderService.cancelOrder(
        order._id.toString(),
        user._id.toString(),
        'Test cancellation'
      );
      
      // Assert
      expect(cancelledOrder.status).toBe('cancelled');
      
      // בדיקת החזרת מלאי
      const restoredSku = await Sku.findById(sku._id);
      expect(restoredSku!.stock).toBe(10); // חזר למלאי המקורי
    });
    
    it('לא צריך לאפשר ביטול הזמנה שכבר נשלחה', async () => {
      // Arrange
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      const order = await Order.create({
        orderNumber: 'ORD-TEST-0001',
        userId: user._id,
        items: [],
        subtotal: 100,
        tax: 17,
        shippingCost: 0,
        total: 117,
        shippingAddress: {
          fullName: 'Test',
          phone: '123',
          street: 'Test',
          city: 'Test',
          postalCode: '12345',
          country: 'IL'
        },
        status: 'shipped', // כבר נשלח!
        paymentStatus: 'paid'
      });
      
      // Act & Assert
      await expect(
        orderService.cancelOrder(order._id.toString(), user._id.toString())
      ).rejects.toThrow('לא ניתן לבטל הזמנה זו');
    });
  });
});
```

### 4.2 Integration Tests - API Endpoints

**קובץ**: `server/src/tests/orderEndpoints.test.ts`

```typescript
/**
 * בדיקות אינטגרציה ל-API של הזמנות
 */

import request from 'supertest';
import app from '../server';
import mongoose from 'mongoose';
import User from '../models/User';
import Product from '../models/Product';
import Sku from '../models/Sku';

describe('Orders API Endpoints', () => {
  let authToken: string;
  let userId: string;
  let productId: string;
  let skuId: string;
  
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI!);
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    // יצירת משתמש ו-token
    const user = await User.create({
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User'
    });
    userId = user._id.toString();
    
    // התחברות
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!'
      });
    
    authToken = loginResponse.body.token;
    
    // יצירת מוצר
    const product = await Product.create({
      name: 'Test Product',
      basePrice: 100,
      sku: 'TEST-001'
    });
    productId = product._id.toString();
    
    const sku = await Sku.create({
      productId: product._id,
      sku: 'TEST-SKU-001',
      price: 100,
      stock: 10
    });
    skuId = sku._id.toString();
  });
  
  describe('POST /api/orders', () => {
    it('צריך ליצור הזמנה חדשה', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId,
            skuId,
            quantity: 2
          }],
          shippingAddress: {
            fullName: 'Test User',
            phone: '0501234567',
            street: 'Test St 1',
            city: 'Test City',
            postalCode: '12345'
          }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.items).toHaveLength(1);
    });
    
    it('צריך לדחות בקשה ללא authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [],
          shippingAddress: {}
        });
      
      expect(response.status).toBe(401);
    });
    
    it('צריך לדחות הזמנה עם מוצר שלא קיים', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId: new mongoose.Types.ObjectId().toString(),
            quantity: 1
          }],
          shippingAddress: {
            fullName: 'Test',
            phone: '123',
            street: 'Test',
            city: 'Test',
            postalCode: '12345'
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/orders', () => {
    it('צריך להחזיר את הזמנות המשתמש', async () => {
      // יצירת הזמנה
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId,
            skuId,
            quantity: 1
          }],
          shippingAddress: {
            fullName: 'Test',
            phone: '123',
            street: 'Test',
            city: 'Test',
            postalCode: '12345'
          }
        });
      
      // שליפת הזמנות
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});
```

### 4.3 Rate Limiter Middleware

**קובץ**: `server/src/middleware/rateLimiter.ts`

```typescript
/**
 * Rate limiting middleware
 * מגבלת קצב בקשות למניעת abuse
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

/**
 * יצירת rate limiter עם אפשרויות
 */
export const rateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:'
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 דקות
    max: options.max || 100, // מקסימום בקשות
    message: options.message || 'יותר מדי בקשות. נסה שוב מאוחר יותר',
    standardHeaders: true,
    legacyHeaders: false,
    // פונקציה מותאמת להחזרת שגיאה
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: options.message || 'יותר מדי בקשות. נסה שוב מאוחר יותר'
      });
    }
  });
};

/**
 * Rate limiter מחמיר לפעולות רגישות (הזמנות, תשלומים)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'עברת את מגבלת הבקשות. נסה שוב בעוד 15 דקות'
});

/**
 * Rate limiter כללי ל-API
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // דקה
  max: 60,
  message: 'יותר מדי בקשות. נסה שוב בעוד דקה'
});
```

---

## Phase 5: Monitoring & Production

### תזמון: ימים 15-16 (1-2 ימי עבודה)

### 5.1 Logger Configuration

**קובץ**: `server/src/utils/logger.ts`

```typescript
/**
 * מערכת logging עם Winston
 * כולל רמות שונות ושמירה לקבצים
 */

import winston from 'winston';
import path from 'path';

// הגדרת פורמט
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// יצירת logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ecommerce-orders' },
  transports: [
    // שגיאות לקובץ נפרד
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // הזמנות לקובץ נפרד
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/orders.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 10
    }),
    
    // הכל ל-combined
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// בסביבת development - גם ל-console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

### 5.2 Admin Orders Dashboard

**קובץ**: `client/src/pages/Admin/Orders/OrdersPage.tsx`

```typescript
/**
 * דף ניהול הזמנות לאדמין
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styles from './OrdersPage.module.css';

interface Order {
  _id: string;
  orderNumber: string;
  userId: any;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: any[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    search: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    page: 1
  });
  
  // שליפת הזמנות
  useEffect(() => {
    fetchOrders();
  }, [filters]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('/api/admin/orders', {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setOrders(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('שגיאה בשליפת הזמנות:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await axios.patch(
        `/api/orders/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // רענון הרשימה
        fetchOrders();
      }
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
    }
  };
  
  return (
    <div className={styles.ordersPage}>
      <div className={styles.header}>
        <h1>ניהול הזמנות</h1>
        
        {/* מסננים */}
        <div className={styles.filters}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="confirmed">אושר</option>
            <option value="processing">בעיבוד</option>
            <option value="shipped">נשלח</option>
            <option value="delivered">נמסר</option>
            <option value="cancelled">בוטל</option>
          </select>
          
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value, page: 1 })}
          >
            <option value="">כל סטטוסי תשלום</option>
            <option value="pending">ממתין</option>
            <option value="paid">שולם</option>
            <option value="failed">נכשל</option>
            <option value="refunded">הוחזר</option>
          </select>
          
          <input
            type="text"
            placeholder="חיפוש לפי מספר הזמנה או שם לקוח..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
      </div>
      
      {loading ? (
        <div className={styles.loading}>טוען...</div>
      ) : (
        <>
          <div className={styles.ordersTable}>
            <table>
              <thead>
                <tr>
                  <th>מספר הזמנה</th>
                  <th>לקוח</th>
                  <th>סכום</th>
                  <th>סטטוס</th>
                  <th>תשלום</th>
                  <th>תאריך</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/admin/orders/${order._id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {order.userId?.firstName} {order.userId?.lastName}
                    </td>
                    <td>₪{order.total.toFixed(2)}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className={styles.statusSelect}
                      >
                        <option value="pending">ממתין</option>
                        <option value="confirmed">אושר</option>
                        <option value="processing">בעיבוד</option>
                        <option value="shipped">נשלח</option>
                        <option value="delivered">נמסר</option>
                        <option value="cancelled">בוטל</option>
                      </select>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[order.paymentStatus]}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </span>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('he-IL')}
                    </td>
                    <td>
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className={styles.viewButton}
                      >
                        צפה
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                הקודם
              </button>
              <span>
                עמוד {filters.page} מתוך {pagination.pages}
              </span>
              <button
                disabled={filters.page === pagination.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                הבא
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getPaymentStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: 'ממתין',
    paid: 'שולם',
    failed: 'נכשל',
    refunded: 'הוחזר'
  };
  return map[status] || status;
}
```

---

## סיכום והערות סופיות

### ✅ מה הושלם בתוכנית

1. **Phase 0**: הכנות תשתית - **הפרויקט כבר מוכן עם MongoDB Atlas!**
2. **Phase 1**: Backend Core מלא - Models, Services, Controllers, Routes
3. **Phase 2**: Reliability - Queue System, Webhooks, Stripe Integration  
4. **Phase 3**: Frontend - Checkout, OrderSuccess, API Client
5. **Phase 4**: Testing - Unit Tests, Integration Tests, Security
6. **Phase 5**: Production - Logging, Monitoring, Admin Dashboard

### 🎯 נקודות מרכזיות ליישום

1. **✅ MongoDB Atlas מוכן** - הפרויקט כבר עובד עם Atlas (תומך transactions)
2. **Redis** - נדרש ל-Queue System (יש להתקין)
3. **Stripe Test Mode** - להתחיל עם test keys
4. **Environment Variables** - להוסיף משתנים חדשים (Stripe, Redis)
5. **Workers** - להריץ בתהליך נפרד (`node dist/jobs/worker.js`)
6. **Logging** - השתמש ב-logger הקיים של הפרויקט
7. **Middleware** - השתמש ב-middleware הקיים (authMiddleware, requireAdmin)

### 📋 Checklist לפני Production

- [x] MongoDB Atlas מוגדר (\u2705 **כבר מוכן!**)
- [ ] Redis מותקן ופועל
- [ ] Stripe webhooks מוגדר
- [ ] Environment variables כולם מוגדרים (Stripe, Redis)
- [ ] Dependencies מותקנים (`bull`, `ioredis`, `stripe`, `@stripe/react-stripe-js`)
- [ ] בדיקות Unit + Integration עוברות
- [ ] Rate limiting פעיל (משתמש ב-middleware קיים)
- [ ] Logging מוגדר (\u2705 **כבר קיים!**)
- [ ] Workers פועלים בתהליך נפרד
- [ ] Backup policy מוגדר
- [ ] Error monitoring (Sentry) מוגדר (אופציונלי)
- [ ] SSL/TLS מוגדר

### 🚀 צעדים ראשונים מומלצים

1. התחל ב-Phase 0 - וודא שיש תשתית
2. יישם Phase 1 - בנה את הבסיס
3. בדוק שהכל עובד עם בדיקות Unit
4. עבור ל-Phase 2 - הוסף אמינות
5. יישם Frontend ב-Phase 3
6. הוסף בדיקות ב-Phase 4
7. הכן לפרודקשן ב-Phase 5

### 📞 תמיכה נוספת

אם נתקלת בבעיות:
1. בדוק logs ב-`server/logs/`
2. בדוק Redis status: `redis-cli ping`
3. בדוק MongoDB transactions: `rs.status()`
4. בדוק Stripe webhooks ב-dashboard
5. הרץ בדיקות: `npm test`

---

**סיימנו! 🎉**

התוכנית מלאה ומוכנה ליישום. כל קובץ כולל הערות בעברית, קוד מלא ומדוייק לפי הסיכום שלנו.

**זמן משוער**: 12-16 ימי עבודה מלאים
**קושי**: בינוני-גבוה
**תלויות**: MongoDB Replica Set, Redis, Stripe

---

## נספח A: Security & Production Checklist ✅

### רשימת ביקורת אבטחה לפני Production

#### 🔐 Authentication & Authorization
- [ ] JWT secrets חזקים (256-bit minimum)
- [ ] Token expiration מוגדר (15 דקות לaccess, 7 ימים לrefresh)
- [ ] Refresh token rotation מיושם
- [ ] Password policy: מינימום 8 תווים, אותיות גדולות/קטנות, מספרים
- [ ] Rate limiting על login endpoint (5 ניסיונות / 15 דקות)
- [ ] HTTPS בלבד בפרודקשן
- [ ] Secure cookies: httpOnly, secure, sameSite
- [ ] Admin endpoints מוגנים בזכויות מתאימות

#### 🛡️ Input Validation & Sanitization
- [ ] Joi/Zod validation על כל input
- [ ] MongoDB injection prevention (mongoose escaping)
- [ ] XSS protection (helmet middleware)
- [ ] CSRF tokens למבצעי forms
- [ ] File upload validation (type, size, content)
- [ ] SQL injection N/A (NoSQL only)

#### 💳 Payment Security (PCI Compliance)
- [ ] **אף פעם לא מאחסנים פרטי כרטיס אשראי**
- [ ] רק Stripe tokens/payment methods
- [ ] רק 4 ספרות אחרונות לתצוגה
- [ ] Webhook signature verification תמיד פעיל
- [ ] SSL/TLS לכל תקשורת תשלומים
- [ ] Logs לא מכילים מידע רגיש

#### 🔒 API Security
- [ ] Rate limiting גלובלי (100 req/min למשתמש)
- [ ] Rate limiting מחמיר (5 req/15min להזמנות)
- [ ] CORS מוגדר נכון (רק domains מורשים)
- [ ] Helmet.js מותקן ומוגדר
- [ ] Request size limits (100kb לJSON)
- [ ] Error messages לא חושפים מידע מערכת

#### 📊 Data Privacy
- [ ] GDPR compliance: right to deletion
- [ ] הצפנת שדות רגישים ב-DB
- [ ] Logs לא מכילים PII (Personal Identifiable Information)
- [ ] Backup encryption
- [ ] Data retention policy מוגדר (90 ימים להזמנות ישנות)

#### 🔍 Monitoring & Alerting
- [ ] Error tracking (Sentry) מוגדר
- [ ] Failed payment alerts
- [ ] High error rate alerts
- [ ] Unusual order volume alerts
- [ ] Security breach detection

---

## נספח B: Performance Optimization 🚀

### Database Indexes

**קובץ**: `server/scripts/createIndexes.js`

```javascript
/**
 * יצירת indexes לביצועים אופטימליים
 * הרץ פעם אחת בפרודקשן
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const db = mongoose.connection.db;
  
  console.log('🔨 יוצר indexes...');
  
  // Orders Collection
  await db.collection('orders').createIndex(
    { userId: 1, createdAt: -1 },
    { name: 'user_orders' }
  );
  
  await db.collection('orders').createIndex(
    { orderNumber: 1 },
    { unique: true, name: 'order_number_unique' }
  );
  
  await db.collection('orders').createIndex(
    { 'payment.transactionId': 1 },
    { sparse: true, name: 'payment_transaction' }
  );
  
  await db.collection('orders').createIndex(
    { status: 1, createdAt: -1 },
    { name: 'status_date' }
  );
  
  await db.collection('orders').createIndex(
    { guestEmail: 1 },
    { sparse: true, name: 'guest_email' }
  );
  
  // Products Collection
  await db.collection('products').createIndex(
    { name: 'text', description: 'text' },
    { name: 'product_search' }
  );
  
  await db.collection('products').createIndex(
    { categoryId: 1, isActive: 1 },
    { name: 'category_active' }
  );
  
  // SKUs Collection
  await db.collection('skus').createIndex(
    { productId: 1, isActive: 1 },
    { name: 'product_skus' }
  );
  
  await db.collection('skus').createIndex(
    { sku: 1 },
    { unique: true, name: 'sku_unique' }
  );
  
  // WebhookEvents Collection
  await db.collection('webhookevents').createIndex(
    { eventId: 1, gateway: 1 },
    { unique: true, name: 'event_unique' }
  );
  
  await db.collection('webhookevents').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'ttl_cleanup' }
  );
  
  console.log('✅ כל ה-indexes נוצרו בהצלחה!');
  
  // הצגת רשימת indexes
  const collections = ['orders', 'products', 'skus', 'webhookevents'];
  for (const coll of collections) {
    const indexes = await db.collection(coll).indexes();
    console.log(`\n${coll}:`, indexes.map(i => i.name).join(', '));
  }
  
  await mongoose.disconnect();
}

createIndexes().catch(console.error);
```

**הרצה**:
```bash
node server/scripts/createIndexes.js
```

### Caching Strategy

**קובץ**: `server/src/middleware/cacheMiddleware.ts`

```typescript
/**
 * Caching middleware עם Redis
 * לשיפור ביצועי API
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

/**
 * Cache middleware גנרי
 */
export const cacheMiddleware = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // רק GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // יצירת cache key מה-URL והפרמטרים
    const key = `cache:${req.originalUrl}`;
    
    try {
      // בדיקה אם קיים ב-cache
      const cached = await redis.get(key);
      
      if (cached) {
        logger.debug('📦 Cache hit', { key });
        return res.json(JSON.parse(cached));
      }
      
      // שמירת הפונקציה המקורית
      const originalJson = res.json.bind(res);
      
      // override של res.json
      res.json = function(data: any) {
        // שמירה ב-cache
        redis.setex(key, duration, JSON.stringify(data))
          .catch(err => logger.error('Cache set error', err));
        
        // קריאה לפונקציה המקורית
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      next();
    }
  };
};

/**
 * ניקוי cache
 */
export const clearCache = async (pattern: string) => {
  const keys = await redis.keys(`cache:${pattern}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info('🗑️ Cache cleared', { pattern, count: keys.length });
  }
};

/**
 * שימוש:
 * router.get('/products', cacheMiddleware(600), getProducts);
 * clearCache('/api/products'); // לאחר עדכון מוצרים
 */
```

### Query Optimization

**דוגמאות לשאילתות מיטביות:**

```typescript
/**
 * ❌ לא יעיל - N+1 queries
 */
const orders = await Order.find({ userId });
for (const order of orders) {
  const user = await User.findById(order.userId);
}

/**
 * ✅ יעיל - populate עם select
 */
const orders = await Order.find({ userId })
  .populate('userId', 'firstName lastName email')
  .populate('items.productId', 'name imageUrl')
  .lean() // מחזיר plain objects במקום Mongoose documents
  .select('-__v'); // לא להחזיר __v

/**
 * ❌ לא יעיל - טעינת כל השדות
 */
const products = await Product.find({ categoryId });

/**
 * ✅ יעיל - projection לשדות נחוצים בלבד
 */
const products = await Product.find(
  { categoryId, isActive: true },
  'name price imageUrl sku' // רק שדות אלו
).lean();

/**
 * ❌ לא יעיל - בלי pagination
 */
const orders = await Order.find().sort({ createdAt: -1 });

/**
 * ✅ יעיל - עם pagination
 */
const page = 1;
const limit = 20;
const orders = await Order.find()
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
```

---

## נספח C: Guest Checkout Implementation 👤

### עדכון Order Model

**קובץ**: `server/src/models/Order.ts` (השלמה)

```typescript
// הוסף לממשק IOrder:
export interface IOrder extends Document {
  // ... שדות קיימים
  
  isGuest: boolean; // האם הזמנה של אורח
  guestEmail?: string; // מייל לאורחים
  guestToken?: string; // טוקן לצפייה בהזמנה
  
  // ... שאר השדות
}

// בסכימה:
const OrderSchema = new Schema<IOrder>({
  // ... שדות קיימים
  
  isGuest: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  guestEmail: { 
    type: String,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return !this.isGuest || (v && /^\S+@\S+\.\S+$/.test(v));
      },
      message: 'כתובת מייל לא תקינה'
    }
  },
  guestToken: { 
    type: String,
    unique: true,
    sparse: true 
  },
  
  // ... שאר השדות
});

// Pre-save: יצירת guest token
OrderSchema.pre('save', function(next) {
  if (this.isNew && this.isGuest && !this.guestToken) {
    this.guestToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});
```

### Guest Checkout Service

**קובץ**: `server/src/services/guestOrderService.ts`

```typescript
/**
 * שירות הזמנות לאורחים
 */

import crypto from 'crypto';
import Order, { IOrder } from '../models/Order';
import { emailService } from './emailService';
import { logger } from '../utils/logger';

class GuestOrderService {
  /**
   * יצירת הזמנת אורח
   */
  async createGuestOrder(orderData: {
    items: any[];
    shippingAddress: any;
    email: string;
    currency?: string;
  }): Promise<IOrder> {
    
    // יצירת הזמנה עם transaction (כמו ב-orderService)
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // ... לוגיקת יצירת הזמנה (זהה ל-createOrder)
      
      const order = await Order.create([{
        ...orderData,
        isGuest: true,
        guestEmail: orderData.email,
        userId: null, // אין משתמש רשום
        // ... שאר הפרטים
      }], { session });
      
      await session.commitTransaction();
      
      // שליחת מייל עם לינק לצפייה
      await this.sendGuestOrderEmail(order[0]);
      
      logger.info('👤 הזמנת אורח נוצרה', {
        orderId: order[0]._id,
        email: orderData.email
      });
      
      return order[0];
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * שליפת הזמנה עם guest token
   */
  async getGuestOrder(token: string): Promise<IOrder | null> {
    const order = await Order.findOne({ guestToken: token });
    
    if (!order) {
      throw new Error('הזמנה לא נמצאה');
    }
    
    return order;
  }
  
  /**
   * שליחת מייל לאורח
   */
  private async sendGuestOrderEmail(order: IOrder) {
    const viewLink = `${process.env.CLIENT_URL}/guest-order/${order.guestToken}`;
    
    await emailService.sendEmail({
      to: order.guestEmail!,
      subject: `אישור הזמנה ${order.orderNumber}`,
      html: `
        <h1>תודה על ההזמנה!</h1>
        <p>מספר הזמנה: <strong>${order.orderNumber}</strong></p>
        <p>סכום: ₪${order.total}</p>
        <p><a href="${viewLink}">צפה בהזמנה שלך</a></p>
        <p><strong>שמור לינק זה!</strong> זו הדרך היחידה לצפות בהזמנה.</p>
      `
    });
  }
}

export default new GuestOrderService();
```

### Guest Checkout Frontend

**קובץ**: `client/src/pages/GuestCheckoutPage/GuestCheckoutPage.tsx`

```typescript
/**
 * Checkout לאורחים - ללא צורך בהרשמה
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import styles from './GuestCheckoutPage.module.css';

export default function GuestCheckoutPage() {
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: ''
  });
  
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    try {
      // יצירת payment intent
      const { data: intentData } = await axios.post('/api/payments/guest-intent', {
        amount: cartTotal,
        email
      });
      
      // אישור התשלום
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              email,
              name: shippingAddress.fullName
            }
          }
        }
      );
      
      if (error) {
        throw new Error(error.message);
      }
      
      // יצירת הזמנה
      const { data } = await axios.post('/api/orders/guest', {
        email,
        items: cartItems,
        shippingAddress,
        paymentIntentId: paymentIntent.id
      });
      
      // ניווט לעמוד אישור עם token
      navigate(`/guest-order/${data.data.guestToken}`);
      
    } catch (error) {
      console.error(error);
      alert('שגיאה בביצוע ההזמנה');
    }
  };
  
  return (
    <div className={styles.guestCheckout}>
      <h1>השלמת הזמנה</h1>
      <p className={styles.guestNote}>
        💡 טיפ: <a href="/register">הירשם</a> כדי לעקוב אחר ההזמנות שלך
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className={styles.formGroup}>
          <label>כתובת מייל *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />
          <small>נשלח אישור והזמנה ללינק זה</small>
        </div>
        
        {/* שאר הטופס זהה ל-CheckoutPage */}
        {/* ... */}
        
        <button type="submit">
          שלם והשלם הזמנה
        </button>
      </form>
    </div>
  );
}
```

---

## נספח D: Retry Logic בקליינט 🔄

**קובץ**: `client/src/utils/apiRetry.ts`

```typescript
/**
 * Retry logic לבקשות API
 * מטפל ב-network errors ו-timeouts
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

/**
 * בקשה עם retry אוטומטי
 */
export async function apiWithRetry<T>(
  config: AxiosRequestConfig,
  retryConfig: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = defaultRetryCondition
  } = retryConfig;
  
  let lastError: AxiosError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios(config);
      return response.data;
      
    } catch (error) {
      lastError = error as AxiosError;
      
      // האם כדאי לנסות שוב?
      if (attempt < maxRetries && retryCondition(lastError)) {
        // חישוב delay עם exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        
        console.log(`🔄 ניסיון ${attempt + 1}/${maxRetries} נכשל, ממתין ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // אין טעם לנסות שוב
      throw lastError;
    }
  }
  
  throw lastError!;
}

/**
 * תנאי ברירת מחדל - מתי לנסות שוב
 */
function defaultRetryCondition(error: AxiosError): boolean {
  // Retry על network errors
  if (!error.response) {
    return true;
  }
  
  // Retry על 5xx errors (שרת)
  const status = error.response.status;
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // Retry על 429 (Too Many Requests)
  if (status === 429) {
    return true;
  }
  
  // Retry על timeouts
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  
  return false;
}

/**
 * דוגמת שימוש:
 */
export async function createOrderWithRetry(orderData: any) {
  return apiWithRetry({
    method: 'POST',
    url: '/api/orders',
    data: orderData,
    timeout: 10000
  }, {
    maxRetries: 3,
    retryDelay: 1000
  });
}
```

**שימוש ב-CheckoutPage:**

```typescript
import { createOrderWithRetry } from '../../utils/apiRetry';

// במקום:
const response = await axios.post('/api/orders', orderData);

// השתמש ב:
const response = await createOrderWithRetry(orderData);
```

---

## נספח E: Metrics & Monitoring 📊

### Winston Logger עם Metrics

**קובץ**: `server/src/utils/metricsLogger.ts`

```typescript
/**
 * Metrics collection למעקב אחר ביצועים
 */

import { logger } from './logger';

interface OrderMetrics {
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  averageOrderValue: number;
  averageCheckoutTime: number;
  paymentSuccessRate: number;
}

class MetricsCollector {
  private metrics: Map<string, any> = new Map();
  
  /**
   * רישום הזמנה חדשה
   */
  recordOrder(data: {
    orderId: string;
    amount: number;
    checkoutTime: number; // במילישניות
    success: boolean;
    paymentMethod: string;
  }) {
    logger.info('📊 Order Metric', data);
    
    // שמירה ב-memory לדוח יומי
    const key = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dayMetrics = this.metrics.get(key) || {
      orders: [],
      totalRevenue: 0,
      successCount: 0,
      failCount: 0
    };
    
    dayMetrics.orders.push(data);
    dayMetrics.totalRevenue += data.success ? data.amount : 0;
    dayMetrics.successCount += data.success ? 1 : 0;
    dayMetrics.failCount += !data.success ? 1 : 0;
    
    this.metrics.set(key, dayMetrics);
  }
  
  /**
   * דוח יומי
   */
  async getDailyReport(date: string): Promise<OrderMetrics> {
    const dayMetrics = this.metrics.get(date) || {
      orders: [],
      totalRevenue: 0,
      successCount: 0,
      failCount: 0
    };
    
    const orders = dayMetrics.orders;
    const totalOrders = orders.length;
    
    if (totalOrders === 0) {
      return {
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        averageOrderValue: 0,
        averageCheckoutTime: 0,
        paymentSuccessRate: 0
      };
    }
    
    const successfulOrders = dayMetrics.successCount;
    const failedOrders = dayMetrics.failCount;
    
    const averageOrderValue = dayMetrics.totalRevenue / successfulOrders || 0;
    
    const totalCheckoutTime = orders.reduce((sum, o) => sum + o.checkoutTime, 0);
    const averageCheckoutTime = totalCheckoutTime / totalOrders;
    
    const paymentSuccessRate = (successfulOrders / totalOrders) * 100;
    
    return {
      totalOrders,
      successfulOrders,
      failedOrders,
      averageOrderValue,
      averageCheckoutTime,
      paymentSuccessRate
    };
  }
  
  /**
   * התראה על anomaly
   */
  checkAnomalies(metrics: OrderMetrics) {
    // Success rate נמוך
    if (metrics.paymentSuccessRate < 80) {
      logger.error('⚠️ ALERT: Low payment success rate', {
        rate: metrics.paymentSuccessRate
      });
      // שלח התראה (email, Slack, etc.)
    }
    
    // Checkout time ארוך מדי
    if (metrics.averageCheckoutTime > 60000) { // מעל דקה
      logger.warn('⚠️ ALERT: Slow checkout time', {
        time: metrics.averageCheckoutTime
      });
    }
  }
}

export default new MetricsCollector();
```

**שימוש ב-orderService:**

```typescript
import metricsCollector from '../utils/metricsLogger';

// אחרי יצירת הזמנה:
const startTime = Date.now();
// ... יצירת הזמנה
const checkoutTime = Date.now() - startTime;

metricsCollector.recordOrder({
  orderId: order._id.toString(),
  amount: order.total,
  checkoutTime,
  success: true,
  paymentMethod: 'stripe'
});
```

### Dashboard Endpoint

**קובץ**: `server/src/controllers/metricsController.ts`

```typescript
/**
 * API למטריקות (Admin בלבד)
 */

import { Request, Response } from 'express';
import metricsCollector from '../utils/metricsLogger';
import Order from '../models/Order';

/**
 * דוח יומי
 */
export const getDailyMetrics = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const metrics = await metricsCollector.getDailyReport(targetDate);
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת מטריקות'
    });
  }
};

/**
 * Dashboard overview
 */
export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // הזמנות היום
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    // הזמנות ממתינות
    const pendingOrders = await Order.countDocuments({
      status: 'pending'
    });
    
    // הכנסות חודש נוכחי
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // הזמנות לפי סטטוס
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        todayOrders,
        pendingOrders,
        monthRevenue: monthRevenue[0]?.total || 0,
        ordersByStatus
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת נתונים'
    });
  }
};
```

---

## נספח F: Data Archival Strategy 📦

### Archival Job

**קובץ**: `server/src/jobs/archivalJob.ts`

```typescript
/**
 * Job לארכוב הזמנות ישנות
 * רץ פעם ביום (cron)
 */

import mongoose from 'mongoose';
import Order from '../models/Order';
import { logger } from '../utils/logger';

/**
 * ארכוב הזמנות מעל 90 ימים
 */
export async function archiveOldOrders() {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // מציאת הזמנות ישנות שהושלמו או בוטלו
    const oldOrders = await Order.find({
      createdAt: { $lt: ninetyDaysAgo },
      status: { $in: ['delivered', 'cancelled', 'returned'] },
      archived: { $ne: true }
    }).session(session);
    
    if (oldOrders.length === 0) {
      logger.info('📦 אין הזמנות לארכוב');
      await session.commitTransaction();
      return;
    }
    
    // העברה ל-collection נפרד
    const ArchivedOrder = mongoose.model('ArchivedOrder', Order.schema);
    
    await ArchivedOrder.insertMany(
      oldOrders.map(o => o.toObject()),
      { session }
    );
    
    // סימון כמו-archived
    await Order.updateMany(
      { _id: { $in: oldOrders.map(o => o._id) } },
      { $set: { archived: true } },
      { session }
    );
    
    await session.commitTransaction();
    
    logger.info('📦 ארכוב הושלם', {
      count: oldOrders.length,
      oldestOrder: oldOrders[0].createdAt
    });
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ שגיאה בארכוב', error);
    throw error;
    
  } finally {
    session.endSession();
  }
}

/**
 * ניקוי webhooks ישנים (מעל 90 ימים)
 */
export async function cleanupOldWebhooks() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const result = await mongoose.model('WebhookEvent').deleteMany({
    createdAt: { $lt: ninetyDaysAgo }
  });
  
  logger.info('🗑️ ניקוי webhooks', { deleted: result.deletedCount });
}
```

**הוספה ל-`server/src/jobs/scheduler.ts`:**

```typescript
/**
 * Cron jobs scheduling
 */

import cron from 'node-cron';
import { archiveOldOrders, cleanupOldWebhooks } from './archivalJob';
import metricsCollector from '../utils/metricsLogger';
import { logger } from '../utils/logger';

/**
 * הפעלת כל ה-scheduled jobs
 */
export function startScheduledJobs() {
  
  // ארכוב יומי בחצות
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ מפעיל archival job');
    try {
      await archiveOldOrders();
      await cleanupOldWebhooks();
    } catch (error) {
      logger.error('❌ Archival job failed', error);
    }
  });
  
  // דוח מטריקות יומי ב-23:59
  cron.schedule('59 23 * * *', async () => {
    logger.info('⏰ מפעיל daily metrics report');
    try {
      const today = new Date().toISOString().split('T')[0];
      const metrics = await metricsCollector.getDailyReport(today);
      metricsCollector.checkAnomalies(metrics);
      
      logger.info('📊 Daily Metrics', metrics);
    } catch (error) {
      logger.error('❌ Metrics report failed', error);
    }
  });
  
  logger.info('✅ Scheduled jobs started');
}
```

**התקנה**:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

---

## נספח G: Deployment Guide 🚀

### Checklist לפני Deploy

#### 1. Environment Setup
```bash
# ייצוא variables לסביבת production
export NODE_ENV=production
export MONGO_URI="mongodb+srv://..."
export REDIS_URL="redis://..."
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export JWT_SECRET="<256-bit-secret>"
export CLIENT_URL="https://yourdomain.com"
```

#### 2. Database Preparation
```bash
# הרצת indexes
node server/scripts/createIndexes.js

# בדיקת replica set
mongosh "$MONGO_URI"
> rs.status()

# יצירת admin user
> use admin
> db.createUser({
  user: "admin",
  pwd: "<strong-password>",
  roles: ["root"]
})
```

#### 3. Build Process
```bash
# Server
cd server
npm run build
# יוצר dist/

# Client
cd client
npm run build
# יוצר dist/

# בדיקה local של production build
npm run preview
```

#### 4. Redis Configuration
```bash
# בדיקת חיבור
redis-cli -u $REDIS_URL ping

# הגדרת maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 256mb
```

#### 5. Stripe Configuration
```bash
# עבור ל-Live mode
# Dashboard > API Keys > Reveal live key

# הגדר webhooks ל-production URL
# https://yourdomain.com/api/webhooks/stripe

# אירועים להאזין להם:
# - payment_intent.succeeded
# - payment_intent.payment_failed
# - charge.refunded
```

### Docker Deployment

**קובץ**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # Server
  api:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=redis://redis:6379
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  # Workers (נפרד מה-API)
  worker:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    command: node dist/jobs/worker.js
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - api
    restart: unless-stopped
    deploy:
      replicas: 2
  
  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
  
  # Client (Nginx)
  client:
    build:
      context: ./client
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  redis_data:
```

**Dockerfile.prod (Server)**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

### Nginx Configuration

**קובץ**: `nginx.conf`

```nginx
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  include mime.types;
  default_type application/octet-stream;
  
  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/plain text/css text/xml text/javascript 
             application/x-javascript application/xml+rss 
             application/json application/javascript;
  
  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=checkout:10m rate=5r/m;
  
  upstream api_backend {
    server api:5000;
    keepalive 32;
  }
  
  server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
  }
  
  server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Client files
    root /usr/share/nginx/html;
    index index.html;
    
    # API proxy
    location /api {
      limit_req zone=api burst=20 nodelay;
      
      proxy_pass http://api_backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache_bypass $http_upgrade;
      
      # Timeouts
      proxy_connect_timeout 60s;
      proxy_send_timeout 60s;
      proxy_read_timeout 60s;
    }
    
    # Webhook endpoint (no rate limiting)
    location /api/webhooks {
      proxy_pass http://api_backend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Checkout (stricter rate limiting)
    location /api/orders {
      limit_req zone=checkout burst=3 nodelay;
      
      proxy_pass http://api_backend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Static files
    location / {
      try_files $uri $uri/ /index.html;
      
      # Cache static assets
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
      }
    }
  }
}
```

### Health Check Endpoint

**קובץ**: `server/src/routes/healthRoutes.ts`

```typescript
/**
 * Health check endpoint לload balancers
 */

import express from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';

const router = express.Router();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379')
});

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: 'unknown',
      redis: 'unknown'
    }
  };
  
  // בדיקת MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = 'connected';
    } else {
      health.services.mongodb = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.mongodb = 'error';
    health.status = 'unhealthy';
  }
  
  // בדיקת Redis
  try {
    await redis.ping();
    health.services.redis = 'connected';
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

### Monitoring with PM2

**קובץ**: `ecosystem.config.js`

```javascript
/**
 * PM2 configuration לניהול processes
 */

module.exports = {
  apps: [
    {
      name: 'ecommerce-api',
      script: 'dist/server.js',
      instances: 'max', // כמה CPUs
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    },
    {
      name: 'ecommerce-worker',
      script: 'dist/jobs/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      max_memory_restart: '300M',
      autorestart: true
    }
  ]
};
```

**הרצה**:
```bash
npm install -g pm2

# התחלה
pm2 start ecosystem.config.js

# מעקב
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart all

# Auto-start on reboot
pm2 startup
pm2 save
```

---

## נספח H: MongoDB Local Setup (אופציונלי)

**הערה**: הפרויקט הנוכחי כבר מחובר ל-MongoDB Atlas שתומך באופן מלא ב-transactions. נספח זה מיועד למפתחים שרוצים להריץ MongoDB מקומי לצורכי פיתוח.

### דרישות מקדימות
- Docker Desktop מותקן במחשב
- 2GB RAM פנויים למינימום
- יציאות 27017-27019 פנויות

### התקנה באמצעות Docker Compose

**קובץ**: `docker-compose.mongodb.yml`

```yaml
version: '3.8'

services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27017"]
    ports:
      - 27017:27017
    volumes:
      - mongo1_data:/data/db
      - mongo1_config:/data/configdb
    networks:
      - mongo-cluster
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27018"]
    ports:
      - 27018:27018
    volumes:
      - mongo2_data:/data/db
      - mongo2_config:/data/configdb
    networks:
      - mongo-cluster
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27018/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s

  mongo3:
    image: mongo:7.0
    container_name: mongo3
    command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27019"]
    ports:
      - 27019:27019
    volumes:
      - mongo3_data:/data/db
      - mongo3_config:/data/configdb
    networks:
      - mongo-cluster
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27019/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s

volumes:
  mongo1_data:
  mongo1_config:
  mongo2_data:
  mongo2_config:
  mongo3_data:
  mongo3_config:

networks:
  mongo-cluster:
    driver: bridge
```

### הפעלה

```bash
# הפעלת כל ה-containers
docker-compose -f docker-compose.mongodb.yml up -d

# המתנה ל-containers להיות healthy
docker ps

# התחברות ל-mongo1 ואתחול Replica Set
docker exec -it mongo1 mongosh

# בתוך mongosh:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27018", priority: 1 },
    { _id: 2, host: "mongo3:27019", priority: 1 }
  ]
})

# המתנה 10-15 שניות ובדיקת סטטוס
rs.status()

# צריך לראות:
# - mongo1 כ-PRIMARY
# - mongo2 ו-mongo3 כ-SECONDARY

# יציאה
exit
```

### עדכון .env לשימוש מקומי

```env
# Development - Local MongoDB Replica Set
MONGO_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/ecommerceDB?replicaSet=rs0&retryWrites=true&w=majority

# Production - MongoDB Atlas (ברירת מחדל)
# MONGO_URI=mongodb+srv://...
```

### בדיקת Transactions

```javascript
// test-transactions.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0';
const client = new MongoClient(uri);

async function testTransactions() {
  try {
    await client.connect();
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        const db = client.db('ecommerceDB');
        await db.collection('test').insertOne({ test: 'transaction' }, { session });
        console.log('✅ Transaction works!');
      });
    } finally {
      await session.endSession();
    }
  } finally {
    await client.close();
  }
}

testTransactions().catch(console.error);
```

```bash
# הרצת הבדיקה
node test-transactions.js
```

### ניהול יומיומי

```bash
# עצירת כל ה-containers
docker-compose -f docker-compose.mongodb.yml down

# עצירה + מחיקת data (reset מלא)
docker-compose -f docker-compose.mongodb.yml down -v

# צפייה ב-logs
docker-compose -f docker-compose.mongodb.yml logs -f

# כניסה ל-mongo shell
docker exec -it mongo1 mongosh

# backup של ה-data
docker exec mongo1 mongodump --out /data/backup
docker cp mongo1:/data/backup ./mongodb-backup
```

### טיפים לפיתוח

1. **Performance**: 3 nodes זה לפיתוח - ניתן להשתמש ב-1 node בלבד אם צריך חיסכון במשאבים
2. **Hot Reload**: השינויים בקוד לא משפיעים על MongoDB - אין צורך ב-restart
3. **Data Persistence**: ה-volumes שומרים את הנתונים גם אחרי restart
4. **Windows Users**: וודאו ש-Docker Desktop מוגדר ל-WSL2 backend

### חזרה ל-Atlas

כדי לחזור לעבודה עם Atlas:

1. עצרו את ה-containers המקומיים
2. שנו חזרה את `MONGO_URI` ב-`.env` ל-Atlas URI
3. הריצו מחדש את ה-server

---

## סיכום השיפורים ✨

### ✅ מה נוסף ותוקן:

1. **⚠️ MongoDB Atlas Integration** - הודגש שהפרויקט כבר מוכן עם Atlas Replica Set
2. **🔧 Code Integration Fixes** - תוקנו כל ייבואי ה-middleware והלוגר להתאמה מלאה לפרויקט הקיים:
   - `authMiddleware` במקום `validateAccessToken`
   - `requireAdmin` מ-`roleMiddleware` במקום `checkAdmin`
   - `{ logger }` named import במקום default import
   - `authLimiter` ו-`generalLimiter` מה-`rateLimiter` הקיים
3. **🔐 Security Checklist** - רשימת ביקורת מלאה לפני production
4. **🚀 Performance Optimization** - Indexes, caching, query optimization
5. **👤 Guest Checkout** - מימוש מלא לאורחים כולל frontend
6. **🔄 Retry Logic** - מנגנון retry חכם בקליינט
7. **📊 Metrics & Monitoring** - מערכת מטריקות מלאה עם alerts
8. **📦 Data Archival** - אסטרטגיה מפורטת עם cron jobs
9. **🚀 Deployment Guide** - Docker, Nginx, PM2, health checks
10. **💾 MongoDB Local Setup** - נספח מפורט להרצה מקומית (אופציונלי)

### 📋 Checklist סופי להטמעה:

- [x] MongoDB Atlas פועל ומאומת ✅
- [x] Logging system (Winston) מוכן ✅
- [x] Authentication & Authorization middleware קיימים ✅
- [x] Rate limiting מוכן ✅
- [ ] Redis מותקן ופועל
- [ ] כל ה-indexes נוצרו
- [ ] Caching middleware מיושם
- [ ] Guest checkout פועל
- [ ] Retry logic בקליינט
- [ ] Metrics collection פעיל
- [ ] Archival job מתוזמן
- [ ] Security checklist הושלם
- [ ] Docker images נבנו
- [ ] Nginx מוגדר עם SSL
- [ ] Health checks עוברים
- [ ] PM2/Docker Compose פועל
- [ ] Monitoring & Alerts פעילים

### 🎯 אינטגרציה מלאה עם הפרויקט הקיים

התוכנית עודכנה להשתמש ב:
- ✅ **Middleware קיים**: `authMiddleware`, `requireAdmin`, `requireSuperAdmin` מ-`roleMiddleware.ts`
- ✅ **Rate Limiters קיימים**: `authLimiter`, `generalLimiter` מ-`rateLimiter.ts`
- ✅ **Logger קיים**: `{ logger, auditLogger, logUserAction }` מ-`logger.ts`
- ✅ **Email Service קיים**: `emailService` עם `sendPasswordResetEmail`, `sendVerificationEmail`
- ✅ **MongoDB Atlas**: חיבור קיים ומוכן ל-transactions
- ✅ **WebhookRoutes קיים**: עדכון הקובץ הקיים במקום יצירת חדש

התוכנית כעת **מותאמת 100% לפרויקט הקיים ומוכנה להתחלת יישום מ-Phase 1**! 🎉

---

## מה הלאה? 🚀

1. **Phase 1 מוכן להתחלה** - כל הקוד מותאם לפרויקט
2. **התקנת Redis** - הצעד הראשון (Phase 0.2)
3. **התקנת Stripe CLI** - לפיתוח webhooks (Phase 0.3)
4. **יצירת Order Model** - תחילת Phase 1

### פקודות להתחלה:

```bash
# התקנת dependencies
cd server
npm install bull ioredis stripe @paypal/checkout-server-sdk

cd ../client
npm install @stripe/react-stripe-js @stripe/stripe-js react-query

# הפעלת Redis (Docker)
docker run -d --name redis-queue -p 6379:6379 redis:alpine

# התחלת הפיתוח
cd server
npm run dev
```

**בהצלחה ביישום! 💪**
