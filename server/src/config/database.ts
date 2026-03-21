import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// =============================================================================
// אתחול Replica Set אוטומטי
// נדרש עבור טרנזקציות ב-MongoDB של Railway (שרץ כ-standalone כברירת מחדל)
// =============================================================================
async function ensureReplicaSet(mongoUri: string): Promise<void> {
  // חילוץ host מה-URI לשימוש ב-rs.initiate
  let host: string;
  try {
    const url = new URL(mongoUri);
    host = url.host; // כולל port, למשל: mongodb.railway.internal:27017
  } catch {
    console.log('⚠️ ReplicaSet: לא ניתן לפרסר URI, מדלג על אתחול');
    return;
  }

  // חיבור ישיר (עוקף topology discovery שנתקע בלי primary)
  const directUrl = mongoUri.includes('?')
    ? `${mongoUri}&directConnection=true`
    : `${mongoUri}?directConnection=true`;

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(directUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    const adminDb = client.db('admin');

    // ניסיון אתחול replica set עם host מפורש
    try {
      await adminDb.command({
        replSetInitiate: {
          _id: 'rs0',
          members: [{ _id: 0, host }],
        },
      });
      console.log(`✅ Replica set rs0 אותחל בהצלחה (host: ${host})`);
      // המתנה לבחירת primary
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (initError: any) {
      if (initError.code === 23) {
        // AlreadyInitialized - בדיקה ותיקון hostname אם צריך
        console.log('ℹ️ Replica set כבר מאותחל, בודק hostname...');
        try {
          const { config } = await adminDb.command({ replSetGetConfig: 1 });
          const currentHost = config.members[0]?.host;
          if (currentHost !== host) {
            console.log(`🔧 מתקן hostname: ${currentHost} → ${host}`);
            config.members[0].host = host;
            config.version += 1;
            await adminDb.command({ replSetReconfig: config, force: true });
            console.log('✅ Hostname תוקן בהצלחה');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } else {
            console.log('✅ Replica set תקין, hostname מתאים');
          }
        } catch (reconfigError) {
          console.warn('⚠️ ReplicaSet: לא ניתן לבדוק/לתקן hostname', reconfigError);
        }
      } else if (initError.code === 76) {
        // NoReplicationEnabled - MongoDB רץ ללא --replSet (Atlas או standalone)
        console.log('ℹ️ MongoDB רץ ללא replica set (Atlas/standalone), מדלג');
      } else {
        console.warn('⚠️ ReplicaSet: שגיאת אתחול לא צפויה:', initError.message);
      }
    }
  } catch (connectError) {
    // לא הצלחנו להתחבר בכלל - ממשיכים, mongoose יטפל בשגיאה
    console.warn('⚠️ ReplicaSet: לא ניתן להתחבר לאתחול, ממשיך...', 
      connectError instanceof Error ? connectError.message : connectError);
  } finally {
    if (client) {
      try { await client.close(); } catch { /* התעלמות */ }
    }
  }
}

// =============================================================================
// חיבור ראשי ל-MongoDB
// =============================================================================
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in the environment variables');
      process.exit(1);
    }
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));

    // שלב 1: אתחול replica set (נדרש לטרנזקציות ב-Railway)
    await ensureReplicaSet(mongoUri);

    // שלב 2: חיבור רגיל עם mongoose (עכשיו יש primary אם rs הופעל)
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database name: ${conn.connection.name}`);
  } catch (error) {
    // הדפסת שגיאה מפורטת כדי לאפשר דיבוג מהיר של בעיות חיבור
    console.error('❌ MongoDB connection FAILED:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('An unknown error occurred while connecting to MongoDB', error);
    }
    console.error('🔴 Exiting due to MongoDB connection failure');
    process.exit(1);
  }
};

export default connectDB;
