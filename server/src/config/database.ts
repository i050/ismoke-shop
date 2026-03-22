import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// =============================================================================
// אתחול Replica Set אוטומטי
// נדרש עבור טרנזקציות ב-MongoDB של Railway (שרץ כ-standalone כברירת מחדל)
// כולל retry למקרה ש-MongoDB עדיין עולה מחדש (בעיית תזמון ב-Railway)
// =============================================================================

const RS_MAX_RETRIES = 3;
const RS_RETRY_DELAY_MS = 5000;

async function tryInitReplicaSet(mongoUri: string): Promise<boolean> {
  // חילוץ host מה-URI לשימוש ב-rs.initiate
  let host: string;
  try {
    const url = new URL(mongoUri);
    host = url.host;
  } catch {
    console.log('⚠️ ReplicaSet: לא ניתן לפרסר URI, מדלג');
    return false;
  }

  // חיבור ישיר (עוקף topology discovery שנתקע בלי primary)
  const directUrl = mongoUri.includes('?')
    ? `${mongoUri}&directConnection=true`
    : `${mongoUri}?directConnection=true`;

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(directUrl, {
      serverSelectionTimeoutMS: 10000,
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
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return true;
    } catch (initError: any) {
      console.log(`🔍 ReplicaSet initiate error: code=${initError.code}, codeName=${initError.codeName}, message=${initError.message}`);

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
        return true;
      } else if (initError.code === 76) {
        // NoReplicationEnabled - MongoDB עדיין ללא --replSet, ננסה שוב
        console.log('⏳ MongoDB עדיין ללא replica set, ננסה שוב...');
        return false;
      } else {
        console.warn('⚠️ ReplicaSet: שגיאה לא צפויה, ממשיך...', initError.message);
        return true; // לא חוסמים את ההפעלה
      }
    }
  } catch (connectError) {
    console.warn('⚠️ ReplicaSet: לא ניתן להתחבר, ננסה שוב...',
      connectError instanceof Error ? connectError.message : connectError);
    return false;
  } finally {
    if (client) {
      try { await client.close(); } catch { /* התעלמות */ }
    }
  }
}

async function ensureReplicaSet(mongoUri: string): Promise<void> {
  for (let attempt = 1; attempt <= RS_MAX_RETRIES; attempt++) {
    console.log(`🔄 ReplicaSet: ניסיון ${attempt}/${RS_MAX_RETRIES}...`);
    const success = await tryInitReplicaSet(mongoUri);
    if (success) return;

    if (attempt < RS_MAX_RETRIES) {
      console.log(`⏳ ממתין ${RS_RETRY_DELAY_MS / 1000} שניות לפני ניסיון נוסף...`);
      await new Promise((resolve) => setTimeout(resolve, RS_RETRY_DELAY_MS));
    }
  }
  console.warn('⚠️ ReplicaSet: כל הניסיונות נכשלו, ממשיך בלי replica set (טרנזקציות לא יעבדו!)');
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
