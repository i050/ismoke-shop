/**
 * בדיקות יחידה לשירות הזמנות - Order Service
 * Phase 4.1 מתוך ORDERS_SYSTEM_IMPLEMENTATION_PLAN.md
 * 
 * בדיקות אלו מוודאות את הלוגיקה העסקית של מערכת ההזמנות
 * כולל יצירה, ביטול, עדכון סטטוס וטיפול בשגיאות
 * 
 * @module tests/orderService.test
 */

import mongoose from 'mongoose';
import orderService from '../services/orderService';
import Order from '../models/Order';
import Product from '../models/Product';
import Sku from '../models/Sku';
import User from '../models/User';

// ============================================================================
// הגדרות והכנות
// ============================================================================

// Mock לשירות המיילים - לא נרצה לשלוח מיילים אמיתיים בבדיקות
jest.mock('../services/emailService', () => ({
  emailService: {
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(true),
    sendOrderCancellation: jest.fn().mockResolvedValue(true),
  }
}));

// Mock ל-logger - נשתיק את ה-logs בבדיקות
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// ============================================================================
// משתנים גלובליים לבדיקות
// ============================================================================

let testUser: any;
let testProduct: any;
let testSku: any;

// ============================================================================
// Setup ו-Teardown
// ============================================================================

beforeAll(async () => {
  // התחברות למסד נתונים לבדיקות
  const mongoUri = process.env.MONGO_URI || process.env.TEST_MONGO_URI;
  if (!mongoUri) {
    throw new Error('חסר MONGO_URI למסד נתונים');
  }
  
  // אם כבר מחוברים - לא מתחברים שוב
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  
  console.log('✅ מחובר למסד נתונים לבדיקות');
});

afterAll(async () => {
  // סגירת חיבור למסד נתונים
  await mongoose.connection.close();
  console.log('✅ חיבור למסד נתונים נסגר');
});

beforeEach(async () => {
  // יצירת נתוני בדיקה לפני כל בדיקה
  
  // יצירת משתמש בדיקה
  testUser = await User.create({
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'בדיקה',
    lastName: 'משתמש',
    role: 'customer',
    isActive: true
  });
  
  // יצירת מוצר בדיקה
  testProduct = await Product.create({
    name: `מוצר בדיקה ${Date.now()}`,
    description: 'מוצר ליחידת בדיקה',
    basePrice: 100,
    isActive: true
  });
  
  // יצירת SKU בדיקה
  testSku = await Sku.create({
    productId: testProduct._id,
    sku: `TEST-SKU-${Date.now()}`,
    name: `וריאנט בדיקה ${Date.now()}`,
    price: 100,
    stockQuantity: 10,
    isActive: true
  });
});

afterEach(async () => {
  // ניקוי נתוני בדיקה אחרי כל בדיקה
  if (testUser?._id) {
    await User.findByIdAndDelete(testUser._id);
  }
  if (testProduct?._id) {
    await Product.findByIdAndDelete(testProduct._id);
    // מחיקת הזמנות שנוצרו עם המוצר הזה
    await Order.deleteMany({ 'items.productId': testProduct._id });
  }
  if (testSku?._id) {
    await Sku.findByIdAndDelete(testSku._id);
  }
});

// ============================================================================
// בדיקות יצירת הזמנה
// ============================================================================

describe('OrderService - יצירת הזמנה (createOrder)', () => {
  
  it('צריך ליצור הזמנה בהצלחה עם נתונים תקינים', async () => {
    // Arrange - הכנת נתוני הזמנה
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 2
      }],
      shippingAddress: {
        fullName: 'ישראל ישראלי',
        phone: '0501234567',
        street: 'הרצל 1',
        city: 'תל אביב',
        postalCode: '6100001',
        country: 'IL'
      }
    };
    
    // Act - יצירת ההזמנה
    const order = await orderService.createOrder(orderData);
    
    // Assert - בדיקת התוצאה
    expect(order).toBeDefined();
    expect(order._id).toBeDefined();
    expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.status).toBe('pending');
    expect(order.userId.toString()).toBe(testUser._id.toString());
    
    // בדיקת סכומים
    expect(order.subtotal).toBeGreaterThan(0);
    expect(order.total).toBeGreaterThan(0);
    
    // ניקוי - מחיקת ההזמנה שנוצרה
    await Order.findByIdAndDelete(order._id);
  });
  
  it('צריך לעדכן את המלאי לאחר יצירת הזמנה', async () => {
    // Arrange
    const initialStock = testSku.stockQuantity; // 10
    const orderQuantity = 3;
    
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: orderQuantity
      }],
      shippingAddress: {
        fullName: 'בדיקת מלאי',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act
    const order = await orderService.createOrder(orderData);
    
    // Assert - בדיקת המלאי המעודכן
    const updatedSku = await Sku.findById(testSku._id);
    expect(updatedSku?.stockQuantity).toBe(initialStock - orderQuantity);
    
    // ניקוי
    await Order.findByIdAndDelete(order._id);
    // שחזור המלאי
    await Sku.findByIdAndUpdate(testSku._id, { stockQuantity: initialStock });
  });
  
  it('צריך לזרוק שגיאה אם אין מספיק במלאי', async () => {
    // Arrange - מבקשים יותר מהמלאי
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 999 // הרבה יותר מהמלאי (10)
      }],
      shippingAddress: {
        fullName: 'בדיקת חוסר מלאי',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act & Assert
    await expect(orderService.createOrder(orderData))
      .rejects
      .toThrow(); // צריך לזרוק שגיאה על חוסר מלאי
    
    // בדיקה שהמלאי לא השתנה (rollback)
    const unchangedSku = await Sku.findById(testSku._id);
    expect(unchangedSku?.stockQuantity).toBe(10);
  });
  
  it('צריך לזרוק שגיאה אם חסרת כתובת משלוח', async () => {
    // Arrange - ללא כתובת משלוח
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 1
      }],
      shippingAddress: null as any // חסר!
    };
    
    // Act & Assert
    await expect(orderService.createOrder(orderData))
      .rejects
      .toThrow();
  });
  
  it('צריך לזרוק שגיאה אם רשימת הפריטים ריקה', async () => {
    // Arrange - ללא פריטים
    const orderData = {
      userId: testUser._id,
      items: [], // ריק!
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act & Assert
    await expect(orderService.createOrder(orderData))
      .rejects
      .toThrow();
  });
  
});

// ============================================================================
// בדיקות ביטול הזמנה
// ============================================================================

describe('OrderService - ביטול הזמנה (cancelOrder)', () => {
  
  let testOrder: any;
  
  beforeEach(async () => {
    // יצירת הזמנה לבדיקה
    testOrder = await Order.create({
      orderNumber: `ORD-TEST-${Date.now()}`,
      userId: testUser._id,
      items: [{
        productId: testProduct._id,
        name: testProduct.name,  // שם המוצר - חובה
        sku: testSku.sku,        // מק"ט - חובה
        skuId: testSku._id,
        price: 100,
        quantity: 2,
        subtotal: 200
      }],
      subtotal: 200,
      tax: 34,
      shippingCost: 0,
      total: 234,
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001',
        country: 'IL'
      },
      status: 'pending',
      payment: {
        gateway: 'mock',
        status: 'pending'
      }
    });
  });
  
  afterEach(async () => {
    if (testOrder?._id) {
      await Order.findByIdAndDelete(testOrder._id);
    }
  });
  
  it('צריך לבטל הזמנה בסטטוס pending', async () => {
    // Act
    const cancelledOrder = await orderService.cancelOrder(
      testOrder._id.toString(),
      testUser._id.toString(),
      'בדיקת ביטול'
    );
    
    // Assert
    expect(cancelledOrder.status).toBe('cancelled');
    expect(cancelledOrder.statusHistory).toBeDefined();
    expect(cancelledOrder.statusHistory.length).toBeGreaterThan(0);
  });
  
  it('לא צריך לאפשר ביטול הזמנה שכבר נשלחה', async () => {
    // Arrange - עדכון סטטוס ל-shipped
    await Order.findByIdAndUpdate(testOrder._id, { status: 'shipped' });
    
    // Act & Assert
    await expect(
      orderService.cancelOrder(
        testOrder._id.toString(),
        testUser._id.toString(),
        'ניסיון ביטול לא חוקי'
      )
    ).rejects.toThrow();
  });
  
  it('לא צריך לאפשר ביטול הזמנה שכבר בוטלה', async () => {
    // Arrange - עדכון סטטוס ל-cancelled
    await Order.findByIdAndUpdate(testOrder._id, { status: 'cancelled' });
    
    // Act & Assert
    await expect(
      orderService.cancelOrder(
        testOrder._id.toString(),
        testUser._id.toString(),
        'ניסיון ביטול כפול'
      )
    ).rejects.toThrow();
  });
  
});

// ============================================================================
// בדיקות שליפת הזמנות
// ============================================================================

describe('OrderService - שליפת הזמנות', () => {
  
  let testOrders: any[] = [];
  
  beforeEach(async () => {
    // יצירת מספר הזמנות לבדיקה
    for (let i = 0; i < 3; i++) {
      const order = await Order.create({
        orderNumber: `ORD-TEST-${Date.now()}-${i}`,
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          name: `מוצר ${i}`,        // שם המוצר - חובה
          sku: `SKU-TEST-${i}`,     // מק"ט - חובה
          price: 100 + i * 10,
          quantity: 1,
          subtotal: 100 + i * 10
        }],
        subtotal: 100 + i * 10,
        tax: 17,
        shippingCost: 0,
        total: 117 + i * 10,
        shippingAddress: {
          fullName: 'בדיקה',
          phone: '0501234567',
          street: 'בדיקה 1',
          city: 'תל אביב',
          postalCode: '6100001',
          country: 'IL'
        },
        status: i === 0 ? 'pending' : i === 1 ? 'confirmed' : 'shipped',
        payment: {
          gateway: 'mock',
          status: 'pending'
        }
      });
      testOrders.push(order);
    }
  });
  
  afterEach(async () => {
    // מחיקת הזמנות הבדיקה
    for (const order of testOrders) {
      await Order.findByIdAndDelete(order._id);
    }
    testOrders = [];
  });
  
  it('צריך להחזיר את כל הזמנות המשתמש', async () => {
    // Act
    const result = await orderService.getUserOrders(testUser._id.toString());
    
    // Assert
    expect(result).toBeDefined();
    expect(result.orders).toBeDefined();
    expect(result.orders.length).toBeGreaterThanOrEqual(3);
  });
  
  it('צריך לתמוך בסינון לפי סטטוס', async () => {
    // Act
    const result = await orderService.getUserOrders(
      testUser._id.toString(),
      { status: 'pending' as any }
    );
    
    // Assert
    expect(result.orders.every((o: any) => o.status === 'pending')).toBe(true);
  });
  
  it('צריך להחזיר הזמנה לפי ID', async () => {
    // Act
    const order = await orderService.getOrderById(
      testOrders[0]._id.toString(),
      testUser._id.toString()
    );
    
    // Assert
    expect(order).toBeDefined();
    expect(order).not.toBeNull();
    expect((order as any)._id.toString()).toBe(testOrders[0]._id.toString());
  });
  
  it('צריך להחזיר null אם ההזמנה לא שייכת למשתמש', async () => {
    // Arrange - יצירת משתמש אחר
    const otherUser = await User.create({
      email: `other-${Date.now()}@example.com`,
      password: 'Test123!@#',
      firstName: 'אחר',
      lastName: 'משתמש',
      role: 'customer'
    });
    
    // Act - משתמש אחר מנסה לקרוא הזמנה שלא שלו
    const result = await orderService.getOrderById(
      testOrders[0]._id.toString(),
      (otherUser as any)._id.toString()
    );
    
    // Assert - צריך להחזיר null כי ההזמנה לא שייכת לו
    expect(result).toBeNull();
    
    // ניקוי
    await User.findByIdAndDelete((otherUser as any)._id);
  });
  
});

// ============================================================================
// בדיקות עדכון סטטוס (Admin)
// ============================================================================

describe('OrderService - עדכון סטטוס (Admin)', () => {
  
  let testOrder: any;
  
  beforeEach(async () => {
    testOrder = await Order.create({
      orderNumber: `ORD-ADMIN-${Date.now()}`,
      userId: testUser._id,
      items: [{
        productId: testProduct._id,
        name: 'מוצר אדמין',      // שם המוצר - חובה
        sku: 'SKU-ADMIN-001',    // מק"ט - חובה
        price: 100,
        quantity: 1,
        subtotal: 100
      }],
      subtotal: 100,
      tax: 17,
      shippingCost: 0,
      total: 117,
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001',
        country: 'IL'
      },
      status: 'pending',
      payment: {
        gateway: 'mock',
        status: 'pending'
      }
    });
  });
  
  afterEach(async () => {
    if (testOrder?._id) {
      await Order.findByIdAndDelete(testOrder._id);
    }
  });
  
  it('צריך לעדכן סטטוס הזמנה', async () => {
    // Act
    const updatedOrder = await orderService.updateOrderStatus(
      testOrder._id.toString(),
      'confirmed',
      'הזמנה אושרה על ידי מנהל'
    );
    
    // Assert
    expect(updatedOrder.status).toBe('confirmed');
    expect(updatedOrder.statusHistory.length).toBeGreaterThan(0);
  });
  
  it('צריך לשמור היסטוריית סטטוסים', async () => {
    // Act - מספר עדכוני סטטוס
    await orderService.updateOrderStatus(testOrder._id.toString(), 'confirmed', 'אושר');
    await orderService.updateOrderStatus(testOrder._id.toString(), 'processing', 'בעיבוד');
    const finalOrder = await orderService.updateOrderStatus(testOrder._id.toString(), 'shipped', 'נשלח');
    
    // Assert
    expect(finalOrder.statusHistory.length).toBeGreaterThanOrEqual(3);
    expect(finalOrder.status).toBe('shipped');
  });
  
});

// ============================================================================
// בדיקות חישובים
// ============================================================================

describe('OrderService - חישובי סכומים', () => {
  
  it('צריך לחשב סכום ביניים נכון', async () => {
    // Arrange
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 3 // 3 * 100 = 300
      }],
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act
    const order = await orderService.createOrder(orderData);
    
    // Assert
    expect(order.subtotal).toBe(300); // 3 * 100
    
    // ניקוי
    await Order.findByIdAndDelete(order._id);
  });
  
  it('צריך לחשב מעמ 17%', async () => {
    // Arrange
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 1 // 100 ש"ח
      }],
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act
    const order = await orderService.createOrder(orderData);
    
    // Assert
    expect(order.tax).toBe(17); // 17% מ-100
    
    // ניקוי
    await Order.findByIdAndDelete(order._id);
  });
  
  it('צריך לתת משלוח חינם מעל 200 ש"ח', async () => {
    // Arrange - הזמנה של 3 יחידות = 300 ש"ח
    const orderData = {
      userId: testUser._id,
      items: [{
        productId: testProduct._id.toString(),
        skuId: testSku._id.toString(),
        quantity: 3
      }],
      shippingAddress: {
        fullName: 'בדיקה',
        phone: '0501234567',
        street: 'בדיקה 1',
        city: 'תל אביב',
        postalCode: '6100001'
      }
    };
    
    // Act
    const order = await orderService.createOrder(orderData);
    
    // Assert
    expect(order.shippingCost).toBe(0); // משלוח חינם מעל 200
    
    // ניקוי
    await Order.findByIdAndDelete(order._id);
  });
  
});
