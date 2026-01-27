// סקריפט מהיר למחיקת index
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('מחובר');
    
    const db = mongoose.connection.db;
    const collection = db.collection('brands');
    
    // הצגת indexes
    const indexes = await collection.indexes();
    console.log('Indexes לפני:', indexes.map(i => i.name));
    
    // מחיקת slug_1
    try {
      await collection.dropIndex('slug_1');
      console.log('✅ slug_1 נמחק');
    } catch (e) {
      console.log('slug_1 לא קיים:', e.message);
    }
    
    // הצגת indexes אחרי
    const indexesAfter = await collection.indexes();
    console.log('Indexes אחרי:', indexesAfter.map(i => i.name));
    
    await mongoose.disconnect();
    console.log('סיים');
    process.exit(0);
  } catch (error) {
    console.error('שגיאה:', error);
    process.exit(1);
  }
})();
