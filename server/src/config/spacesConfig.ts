/**
 * 🌐 DigitalOcean Spaces Configuration
 * 
 * קובץ זה מגדיר את החיבור ל-DigitalOcean Spaces (S3-compatible storage)
 * ומספק client מרכזי לכל פעולות האחסון.
 * 
 * @module spacesConfig
 * @requires @aws-sdk/client-s3
 */

import { S3Client } from '@aws-sdk/client-s3';

/**
 * וידוא שכל משתני הסביבה הנדרשים קיימים
 * @throws {Error} אם חסר משתנה סביבה קריטי
 */
function validateSpacesConfig(): void {
  const requiredVars = [
    'DO_SPACES_KEY',
    'DO_SPACES_SECRET',
    'DO_SPACES_ENDPOINT',
    'DO_SPACES_BUCKET',
    'DO_SPACES_REGION',
    'DO_SPACES_CDN_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `❌ Missing required DigitalOcean Spaces environment variables: ${missingVars.join(', ')}\n` +
      `Please add them to your .env file.`
    );
  }

  console.log('✅ DigitalOcean Spaces configuration validated');
}

// בדיקת תצורה בזמן טעינת המודול
validateSpacesConfig();

/**
 * S3 Client מוגדר עם credentials של DigitalOcean Spaces
 * משמש לכל פעולות ה-upload/delete
 */
export const spacesClient = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION || 'fra1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  // הגדרות נוספות לביצועים
  maxAttempts: 3, // ניסיונות חוזרים במקרה של כשל
  requestHandler: {
    connectionTimeout: 30000, // 30 שניות timeout
    socketTimeout: 30000,
  },
});

/**
 * הגדרות כלליות של Spaces
 */
export const SPACES_CONFIG = {
  bucket: process.env.DO_SPACES_BUCKET || 'ismoke-images',
  cdnUrl: process.env.DO_SPACES_CDN_URL || '',
  region: process.env.DO_SPACES_REGION || 'fra1',
} as const;

/**
 * Logging של תצורה (ללא סודות!)
 */
console.log('📦 Spaces Configuration:', {
  bucket: SPACES_CONFIG.bucket,
  region: SPACES_CONFIG.region,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  cdnUrl: SPACES_CONFIG.cdnUrl,
});
