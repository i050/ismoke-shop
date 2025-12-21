/*
  Script אופציונלי להרצת מיגרציה על מסד הנתונים:
  יעד: עדכן כל מסמכי 'banners' שאין להם שדה textColor ותקבע textColor=null
  שימוש: להפעיל בסביבת ה-staging/prod בזהירות
  הרץ: `node server/scripts/migrate-set-textColor-null.js` מתוך שורש הפרוייקט
*/

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI לא מוגדר בסביבת הריצה');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'ecommerceDB';
    const db = client.db(dbName);

    console.log('מחפש מסמכים ללא textColor...');
    const res = await db.collection('banners').updateMany(
      { textColor: { $exists: false } },
      { $set: { textColor: null } }
    );

    console.log('מעדכן מסמכים:', res.modifiedCount);
    console.log('סיום המיגרציה. אנא בדוק את התוצאות לפני פריסה.' );
  } catch (err) {
    console.error('שגיאה בהרצת המיגרציה:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
