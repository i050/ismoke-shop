// Load environment variables FIRST - before any imports that use them
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import connectDB from './config/database';
import { logger, logApiRequest } from './utils/logger';
import { checkRedisHealth, getRedisInfo } from './config/redis';
import { checkPaymentHealth } from './services/paymentService';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import authRoutes from './routes/authRoutes';
import customerGroupRoutes from './routes/customerGroupRoutes';
import userRoutes from './routes/userRoutes';
import cartRoutes from './routes/cartRoutes';
import skuRoutes from './routes/skuRoutes';
import webhookRoutes from './routes/webhookRoutes';
import bannerRoutes from './routes/bannerRoutes';
import filterAttributeRoutes from './routes/filterAttributeRoutes';
import adminWarningsRoutes from './routes/adminWarningsRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import settingsRoutes from './routes/settingsRoutes';
import stockAlertRoutes from './routes/stockAlertRoutes';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import maintenanceMiddleware from './middleware/maintenanceMiddleware';
import { getSiteStatus } from './controllers/settingsController';
import { scheduleImageCleanup } from './scripts/cleanupDeletedImages';
import { getQueuesStats, closeQueues } from './queues';
import { startAllWorkers, stopAllWorkers } from './queues/workers';

console.log('Starting server...');

// Connect to database
connectDB();

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setIO } from './socket';

const app = express();
const PORT = process.env.PORT || 5000;

// יצירת httpServer וחיבור socket.io
const httpServer = http.createServer(app);

// הגדרת allowed origins ל-Socket.io (אותם כמו CORS הראשי)
const socketAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // מאפשר requests ללא origin
      if (!origin) return callback(null, true);
      
      // בודק אם ה-origin מותר או מסתיים ב-.railway.app
      if (socketAllowedOrigins.includes(origin) || origin?.endsWith('.railway.app')) {
        callback(null, true);
      } else {
        callback(new Error('Socket CORS: Not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  // הגבלת reconnection attempts
  pingTimeout: 30000,
  pingInterval: 25000
});
setIO(io);
io.on('connection', (socket) => {
  console.log('WebSocket client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected:', socket.id);
  });
});

// Middleware
// הגדרת CORS עם תמיכה ב-credentials וב-Railway domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean); // מסיר undefined values

app.use(cors({
  origin: (origin, callback) => {
    // מאפשר requests ללא origin (כמו Postman, curl)
    if (!origin) return callback(null, true);
    
    // בודק אם ה-origin מותר או מסתיים ב-.railway.app
    if (allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // מאפשר שליחת cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
// הגדלת limit ל-50MB כדי לתמוך בתמונות Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Request Logging Middleware
app.use('/api', (req, res, next) => {
  const userId = (req as any).user?.userId;
  const ip = req.ip || req.connection.remoteAddress;

  logApiRequest(req.method, req.originalUrl, userId, ip);

  // לוגינג של תגובה
  const originalSend = res.send;
  res.send = function(data) {
    logger.info('API_RESPONSE', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userId: userId || 'anonymous',
      responseSize: data ? data.length : 0
    });
    return originalSend.call(this, data);
  };

  next();
});

// החלת Rate Limiter כללי על כל ה-API
app.use('/api', generalLimiter);

// ============================================================================
// Site Status Endpoint - חייב להיות לפני Maintenance Middleware
// ============================================================================

/**
 * GET /api/site-status
 * סטטוס האתר (מצב תחזוקה) - נגיש תמיד
 */
app.get('/api/site-status', getSiteStatus);

// ============================================================================
// Maintenance Mode Middleware - בודק מצב תחזוקה לפני כל הנתיבים
// ============================================================================
app.use('/api', maintenanceMiddleware);

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/customer-groups', customerGroupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/filter-attributes', filterAttributeRoutes);
app.use('/api/admin/warnings', adminWarningsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stock-alerts', stockAlertRoutes);

// =============================================================================
// Health Check Endpoints
// =============================================================================

/**
 * בדיקת בריאות בסיסית
 * GET /api/health
 */
app.get('/api/health', async (req, res) => {
  try {
    // בדיקת חיבור MongoDB
    const mongoConnected = mongoose.connection.readyState === 1;
    
    // בדיקת חיבור Redis
    const redisHealthy = await checkRedisHealth();
    
    // בדיקת שירות תשלומים
    const paymentHealth = await checkPaymentHealth();
    
    // קביעת סטטוס כללי
    const allHealthy = mongoConnected && redisHealthy && paymentHealth.connected;
    const status = allHealthy ? 'healthy' : 'degraded';
    
    res.status(allHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
        payment: paymentHealth.connected ? `${paymentHealth.mode}` : 'disconnected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * בדיקת בריאות מפורטת (לשימוש פנימי/admin)
 * GET /api/health/detailed
 */
app.get('/api/health/detailed', async (req, res) => {
  try {
    // בדיקת MongoDB
    const mongoConnected = mongoose.connection.readyState === 1;
    const mongoHost = mongoose.connection.host || 'unknown';
    
    // בדיקת Redis מפורטת
    const redisInfo = await getRedisInfo();
    
    // בדיקת שירות תשלומים
    const paymentHealth = await checkPaymentHealth();
    
    // מידע על השרת
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: mongoConnected && redisInfo.connected && paymentHealth.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      server: {
        uptime: Math.floor(uptime),
        uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memoryUsage: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      services: {
        mongodb: {
          connected: mongoConnected,
          host: mongoHost,
          database: mongoose.connection.name || 'unknown'
        },
        redis: redisInfo,
        payment: paymentHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'E-commerce API Server is running!' });
});

/**
 * סטטיסטיקות תורים (לשימוש admin)
 * GET /api/admin/queues
 */
app.get('/api/admin/queues', async (req, res) => {
  try {
    const stats = await getQueuesStats();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      queues: stats
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// הפעלת Cron Jobs
scheduleImageCleanup();

// Start server עם httpServer (ולא app.listen)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info('SERVER_STARTED', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  // הפעלת Workers לעיבוד תורים - רק אחרי שהשרת עלה
  try {
    startAllWorkers();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    logger.warn('⚠️ Workers לא הופעלו - האתר יעבוד בלי תורים', { error: errorMessage });
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================
process.on('SIGTERM', async () => {
  logger.info('🔌 SIGTERM signal received. Shutting down gracefully...');
  
  // עצירת Workers
  await stopAllWorkers();
  
  // סגירת תורים
  await closeQueues();
  
  // סגירת חיבור MongoDB
  await mongoose.connection.close();
  
  // סגירת השרת
  httpServer.close(() => {
    logger.info('✅ Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('🔌 SIGINT signal received. Shutting down gracefully...');
  
  await stopAllWorkers();
  await closeQueues();
  await mongoose.connection.close();
  
  httpServer.close(() => {
    logger.info('✅ Server shut down gracefully');
    process.exit(0);
  });
});
