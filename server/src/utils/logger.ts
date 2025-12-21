import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// פורמט לוגים
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// פורמט לקונסול
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// הגדרת transport לקבצים
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// הגדרת transport לקונסול (רק ב-development)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info'
});

// יצירת logger לאודיט
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    fileRotateTransport,
    consoleTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// יצירת logger כללי
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    consoleTransport
  ]
});

// פונקציות עזר ללוגינג
export const logUserAction = (action: string, userId: string, details: any = {}) => {
  auditLogger.info('USER_ACTION', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logSecurityEvent = (event: string, details: any = {}) => {
  auditLogger.warn('SECURITY_EVENT', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logError = (error: Error, context: any = {}) => {
  logger.error('APPLICATION_ERROR', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
};

export const logApiRequest = (method: string, url: string, userId?: string, ip?: string) => {
  auditLogger.info('API_REQUEST', {
    method,
    url,
    userId: userId || 'anonymous',
    ip: ip || 'unknown',
    timestamp: new Date().toISOString()
  });
};
