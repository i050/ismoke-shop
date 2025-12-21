// סקריפט מיגרציה להרצת עדכון צבעי באנר בסביבת staging
// רץ עם: `node scripts/run-migrate-staging.js` מתוך תיקיית server

require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI לא נמצא ב-.env — ביטול המיגרציה');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const dbName = client.db().databaseName;
    console.log('Connected to DB:', dbName);

    const collection = client.db().collection('banners');

    // מגדירים שאילתה לכל אחת מהשדות במידה ו-[field] לא קיים
    const filter = {
      $or: [
        { titleColor: { $exists: false } },
        { descriptionColor: { $exists: false } },
        { ctaTextColor: { $exists: false } },
        { ctaBackgroundColor: { $exists: false } },
      ],
    };

    const update = {
      $set: {
        titleColor: null,
        descriptionColor: null,
        ctaTextColor: null,
        ctaBackgroundColor: null,
      },
    };

    console.log('Running updateMany with filter:', JSON.stringify(filter));
    const result = await collection.updateMany(filter, update);

    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
