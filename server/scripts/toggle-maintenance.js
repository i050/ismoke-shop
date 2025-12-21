/**
 * סקריפט להפעלת/כיבוי מצב תחזוקה
 * 
 * Usage:
 *   node toggle-maintenance.js on   - הפעלת מצב תחזוקה
 *   node toggle-maintenance.js off  - כיבוי מצב תחזוקה
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

async function toggleMaintenance() {
  const command = process.argv[2];
  
  if (!command || (command !== 'on' && command !== 'off')) {
    console.log('Usage: node toggle-maintenance.js [on|off]');
    process.exit(1);
  }

  const enabled = command === 'on';
  
  try {
    console.log('מתחבר ל-MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('מחובר!');
    
    const db = mongoose.connection.db;
    
    // עדכון הגדרות החנות
    const result = await db.collection('storesettings').updateOne(
      {},
      { 
        $set: { 
          'maintenance.enabled': enabled,
          'maintenance.message': enabled ? 'האתר במצב פרטי. גישה למשתמשים רשומים בלבד.' : '',
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    
    console.log(`\n✅ מצב תחזוקה ${enabled ? 'הופעל' : 'כובה'}`);
    console.log(`Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);
    
    // בדיקה
    const settings = await db.collection('storesettings').findOne({});
    console.log('\nהגדרות נוכחיות:');
    console.log(JSON.stringify(settings?.maintenance, null, 2));
    
  } catch (error) {
    console.error('שגיאה:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nמתנתק...');
    process.exit(0);
  }
}

toggleMaintenance();
