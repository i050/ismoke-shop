import dotenv from 'dotenv';
import connectDB from '../config/database';
import Product from '../models/Product';

/**
 * 🚀 Phase 0.5.10 - Migration Script: יצירת Performance Indexes למוצרים
 * 
 * Script זה יוצר indexes במודל Product לשיפור ביצועי השאילתות:
 * - Text index לחיפוש
 * - Single indexes למיון וסינון (basePrice, categoryId, createdAt, etc.)
 * - Compound indexes לשאילתות נפוצות (isActive + createdAt, etc.)
 * 
 * הרצה:
 * npx ts-node src/scripts/createProductIndexes.ts
 */

// טעינת משתני סביבה
dotenv.config();

async function createProductIndexes() {
  console.log('🚀 Starting Product Indexes Creation...\n');

  try {
    // התחברות למסד הנתונים
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // בדיקה אם יש indexes קיימים
    console.log('🔍 Checking for existing indexes...');
    const existingIndexes = await Product.collection.getIndexes();
    
    // מחיקת כל ה-indexes למעט _id (שהוא חובה)
    console.log('🗑️  Dropping old indexes...');
    for (const [name] of Object.entries(existingIndexes)) {
      if (name !== '_id_') { // אסור למחוק את _id index
        try {
          console.log(`   - Dropping index: ${name}`);
          await Product.collection.dropIndex(name);
        } catch (err) {
          console.log(`   ⚠️  Could not drop ${name}: ${err}`);
        }
      }
    }

    // יצירת כל ה-indexes החדשים
    console.log('\n📊 Creating new indexes for Product collection...');
    
    // MongoDB יוצר את כל ה-indexes שמוגדרים ב-schema
    // הפונקציה createIndexes() יוצרת אותם אם הם לא קיימים
    await Product.createIndexes();
    
    console.log('✅ Indexes created successfully!\n');

    // הצגת רשימת כל ה-indexes שנוצרו
    console.log('📋 Current indexes in Product collection:');
    const indexes = await Product.collection.getIndexes();
    
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`  - ${name}:`, JSON.stringify(spec));
    });

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 Migration Complete!');
    console.log('═══════════════════════════════════════');
    console.log('✅ All product indexes created');
    console.log('🚀 Query performance optimized');
    console.log('💡 Tip: Use .explain() to verify index usage');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

// הרצת ה-migration
createProductIndexes();
