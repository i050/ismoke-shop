/**
 * סקריפט מיגרציה: העברת size -> attributes.size
 * 
 * מטרה: להעביר את שדה size ממאפיין מובנה (top-level) 
 * למאפיין דינמי בתוך attributes
 * 
 * שימוש:
 * npm run migrate:size           # הרצה רגילה
 * npm run migrate:size -- --dry-run  # הרצת ניסיון (לא משנה DB)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Sku } from '../models/Sku';
import connectDB from '../config/database';

// טעינת משתני סביבה
dotenv.config();

interface MigrationStats {
  total: number;
  withSize: number;
  migrated: number;
  skipped: number;
  conflicts: number;
  failed: number;
  errors: Array<{ sku: string; error: string }>;
  conflictDetails: Array<{ sku: string; topLevel: string; attributes: string }>;
}

async function migrateSizeToAttributes() {
  // בדיקה אם זה dry-run
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🚀 מתחיל מיגרציה: size -> attributes.size');
  console.log(isDryRun ? '⚠️  מצב DRY-RUN - לא ישנה נתונים\n' : '✅ מצב הרצה מלא\n');

  try {
    // חיבור למסד נתונים
    await connectDB();
    console.log('✅ התחברות למסד נתונים הצליחה\n');

    const stats: MigrationStats = {
      total: 0,
      withSize: 0,
      migrated: 0,
      skipped: 0,
      conflicts: 0,
      failed: 0,
      errors: [],
      conflictDetails: [],
    };

    // ספירת כלל ה-SKUs
    stats.total = await Sku.countDocuments();
    console.log(`📦 סך הכל SKUs במערכת: ${stats.total}`);

    // מציאת כל SKUs עם שדה size מובנה
    // שימוש ב-lean() כדי לקבל plain JavaScript objects ולא Mongoose documents
    // כך נוכל לגשת ל-size ישירות מבלי שה-virtual property יפריע
    const skusWithSize = await Sku.find({ 
      size: { $exists: true, $ne: null } 
    }).lean();

    stats.withSize = skusWithSize.length;
    console.log(`🔍 נמצאו ${stats.withSize} SKUs עם שדה size\n`);

    if (stats.withSize === 0) {
      console.log('✨ אין SKUs למיגרציה - הכל כבר מעודכן!');
      process.exit(0);
    }

    console.log(isDryRun ? '🔄 מדמה עיבוד...\n' : '🔄 מתחיל עיבוד...\n');

    // עיבוד כל SKU
    for (let i = 0; i < skusWithSize.length; i++) {
      const sku = skusWithSize[i];
      const progress = `[${i + 1}/${stats.withSize}]`;

      try {
        const topLevelSize = (sku as any).size;
        const attributesSize = sku.attributes?.size;

        // דלג על SKUs עם size ריק או null
        if (!topLevelSize || topLevelSize.trim() === '') {
          console.log(`✓ ${progress} SKU ${sku.sku}: size ריק - מדלג`);
          stats.skipped++;
          continue;
        }

        // מקרה 1: יש conflict - גם top-level וגם attributes.size
        if (attributesSize && topLevelSize && attributesSize !== topLevelSize) {
          console.log(`⚠️  ${progress} SKU ${sku.sku}: CONFLICT! top-level="${topLevelSize}" vs attributes="${attributesSize}"`);
          stats.conflicts++;
          stats.conflictDetails.push({
            sku: sku.sku,
            topLevel: topLevelSize,
            attributes: attributesSize,
          });
          
          // מדיניות: נשמור את attributes.size (הוא בעדיפות)
          if (!isDryRun) {
            (sku as any).size = undefined;
            await sku.save();
            console.log(`   → נשמר attributes.size="${attributesSize}", הוסר top-level`);
          }
          stats.migrated++;
          continue;
        }

        // מקרה 2: כבר קיים attributes.size בלבד
        if (attributesSize && !topLevelSize) {
          console.log(`✓ ${progress} SKU ${sku.sku}: כבר קיים attributes.size="${attributesSize}" - מדלג`);
          stats.skipped++;
          continue;
        }

        // מקרה 3: יש רק top-level, צריך להעביר
        if (topLevelSize && !attributesSize) {
          console.log(`✓ ${progress} SKU ${sku.sku}: ${isDryRun ? '[DRY-RUN] היה מעביר' : 'מעביר'} size="${topLevelSize}" -> attributes.size`);
          
          if (!isDryRun) {
            // יצירת attributes אם לא קיים
            if (!sku.attributes) {
              sku.attributes = {};
            }

            // העברת הערך
            sku.attributes.size = topLevelSize;

            // הסרת השדה המובנה
            (sku as any).size = undefined;
            await sku.save();
          }

          stats.migrated++;
        }

        // הצגת התקדמות כל 10 פריטים
        if ((i + 1) % 10 === 0) {
          console.log(`\n📊 התקדמות: ${i + 1}/${stats.withSize} (${Math.round(((i + 1) / stats.withSize) * 100)}%)\n`);
        }

      } catch (error) {
        console.error(`❌ ${progress} SKU ${sku.sku}: שגיאה -`, error);
        stats.failed++;
        stats.errors.push({
          sku: sku.sku,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // סיכום
    console.log('\n' + '='.repeat(60));
    console.log('📊 סיכום מיגרציה:');
    console.log('='.repeat(60));
    console.log(`✅ ${isDryRun ? 'היו מועברים' : 'הועברו'} בהצלחה:     ${stats.migrated}`);
    console.log(`⚠️  דולגו (כבר קיים):             ${stats.skipped}`);
    console.log(`🔀 conflicts (שני ערכים שונים):  ${stats.conflicts}`);
    console.log(`❌ נכשלו:                        ${stats.failed}`);
    console.log(`📦 סה"כ עובדו:                   ${stats.withSize}`);
    console.log('='.repeat(60));

    // הצגת conflicts
    if (stats.conflictDetails.length > 0) {
      console.log('\n🔀 פירוט Conflicts (נשמר attributes.size):');
      stats.conflictDetails.forEach(({ sku, topLevel, attributes }) => {
        console.log(`   - ${sku}: top="${topLevel}" vs attr="${attributes}"`);
      });
    }

    // הצגת שגיאות אם יש
    if (stats.errors.length > 0) {
      console.log('\n❌ שגיאות שנמצאו:');
      stats.errors.forEach(({ sku, error }) => {
        console.log(`   - ${sku}: ${error}`);
      });
    }

    if (!isDryRun) {
      // בדיקת נקיון - ודא שאין יותר SKUs עם size מובנה
      const remainingSize = await Sku.countDocuments({ 
        size: { $exists: true, $ne: null } 
      });

      console.log(`\n🔍 בדיקת נקיון: ${remainingSize} SKUs נותרו עם size מובנה`);

      if (remainingSize === 0) {
        console.log('✨ מיגרציה הושלמה בהצלחה מלאה!');
      } else {
        console.log('⚠️  עדיין יש SKUs עם size מובנה - בדוק שגיאות למעלה');
      }
    } else {
      console.log('\n💡 זה היה dry-run. הרץ ללא --dry-run כדי לבצע את השינויים.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 שגיאה קריטית במיגרציה:', error);
    process.exit(1);
  }
}

// הרצת המיגרציה
migrateSizeToAttributes();
