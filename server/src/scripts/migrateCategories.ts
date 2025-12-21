/**
 * סקריפט מיגרציה: הוספת level ו-path לקטגוריות קיימות
 * 
 * מטרה: להוסיף את שדות level (עומק בעץ) ו-path (נתיב מלא) 
 * לכל הקטגוריות הקיימות במערכת
 * 
 * שימוש:
 * npm run migrate:categories           # הרצה רגילה
 * npm run migrate:categories -- --dry-run  # הרצת ניסיון (לא משנה DB)
 * 
 * הסקריפט בטוח להרצה חוזרת (idempotent) - יעדכן רק מה שצריך
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from '../models/Category';
import connectDB from '../config/database';

// טעינת משתני סביבה
dotenv.config();

// טיפוס לקטגוריה מה-DB (lean object)
interface CategoryDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  parentId: mongoose.Types.ObjectId | null;
  level?: number;
  path?: string;
}

interface CategoryNode {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  parentId: mongoose.Types.ObjectId | null;
  level: number;
  path: string;
  children: CategoryNode[];
}

interface MigrationStats {
  total: number;
  needUpdate: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; name: string; error: string }>;
}

/**
 * בונה עץ קטגוריות מרשימה שטוחה
 */
function buildTree(categories: CategoryDoc[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  // יצירת nodes לכל הקטגוריות
  categories.forEach(cat => {
    nodeMap.set(cat._id.toString(), {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      level: 0,
      path: '',
      children: [],
    });
  });

  // בניית קשרי הורה-ילד
  categories.forEach(cat => {
    const node = nodeMap.get(cat._id.toString())!;
    
    if (cat.parentId) {
      const parent = nodeMap.get(cat.parentId.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        // אם ההורה לא נמצא, נתייחס כקטגוריה ראשית
        console.warn(`⚠️  קטגוריה "${cat.name}" - הורה ${cat.parentId} לא נמצא, מתייחס כראשית`);
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * מחשב level ו-path באופן רקורסיבי
 */
function calculateHierarchy(
  nodes: CategoryNode[], 
  parentPath: string = '', 
  level: number = 0
): void {
  nodes.forEach(node => {
    node.level = level;
    node.path = parentPath ? `${parentPath}/${node.slug}` : `/${node.slug}`;
    
    // עיבוד ילדים
    if (node.children.length > 0) {
      calculateHierarchy(node.children, node.path, level + 1);
    }
  });
}

/**
 * מחזיר רשימה שטוחה של כל ה-nodes
 */
function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  
  function traverse(nodeList: CategoryNode[]) {
    nodeList.forEach(node => {
      result.push(node);
      traverse(node.children);
    });
  }
  
  traverse(nodes);
  return result;
}

async function migrateCategories() {
  // בדיקה אם זה dry-run
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🚀 מתחיל מיגרציה: הוספת level ו-path לקטגוריות');
  console.log(isDryRun ? '⚠️  מצב DRY-RUN - לא ישנה נתונים\n' : '✅ מצב הרצה מלא\n');

  try {
    // חיבור למסד נתונים
    await connectDB();
    console.log('✅ התחברות למסד נתונים הצליחה\n');

    const stats: MigrationStats = {
      total: 0,
      needUpdate: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // שליפת כל הקטגוריות
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories: CategoryDoc[] = await Category.find({}).lean() as any;
    stats.total = categories.length;
    
    console.log(`📂 סך הכל קטגוריות במערכת: ${stats.total}\n`);

    if (stats.total === 0) {
      console.log('✨ אין קטגוריות במערכת - אין מה לעדכן!');
      process.exit(0);
    }

    // בניית עץ הקטגוריות
    console.log('🌳 בונה עץ קטגוריות...');
    const tree = buildTree(categories);
    console.log(`   נמצאו ${tree.length} קטגוריות ראשיות\n`);

    // חישוב level ו-path
    console.log('🔢 מחשב level ו-path...');
    calculateHierarchy(tree);

    // המרה לרשימה שטוחה
    const flatList = flattenTree(tree);
    
    // הצגת מבנה העץ
    console.log('\n📊 מבנה העץ המחושב:');
    console.log('='.repeat(60));
    flatList.forEach(node => {
      const indent = '  '.repeat(node.level);
      console.log(`${indent}├─ ${node.name}`);
      console.log(`${indent}   level: ${node.level}, path: ${node.path}`);
    });
    console.log('='.repeat(60) + '\n');

    // בדיקה מה צריך עדכון
    console.log('🔍 בודק אילו קטגוריות צריכות עדכון...\n');
    
    const toUpdate: CategoryNode[] = [];
    flatList.forEach(node => {
      const original = categories.find(c => c._id.toString() === node._id.toString());
      if (!original) return;
      
      const needsUpdate = 
        original.level !== node.level || 
        original.path !== node.path ||
        original.level === undefined ||
        original.path === undefined ||
        original.path === '';
      
      if (needsUpdate) {
        toUpdate.push(node);
        console.log(`   📝 "${node.name}" - level: ${original.level || '(חסר)'} → ${node.level}, path: "${original.path || '(חסר)'}" → "${node.path}"`);
      }
    });

    stats.needUpdate = toUpdate.length;
    console.log(`\n📋 סיכום: ${stats.needUpdate} קטגוריות צריכות עדכון\n`);

    if (stats.needUpdate === 0) {
      console.log('✨ כל הקטגוריות כבר מעודכנות!');
      process.exit(0);
    }

    // ביצוע העדכון
    if (!isDryRun) {
      console.log('🔄 מעדכן קטגוריות...\n');
      
      for (let i = 0; i < toUpdate.length; i++) {
        const node = toUpdate[i];
        const progress = `[${i + 1}/${toUpdate.length}]`;
        
        try {
          await Category.findByIdAndUpdate(node._id, {
            level: node.level,
            path: node.path,
          });
          
          console.log(`✅ ${progress} עודכן: "${node.name}" (level: ${node.level}, path: ${node.path})`);
          stats.updated++;
        } catch (error) {
          console.error(`❌ ${progress} נכשל: "${node.name}" -`, error);
          stats.failed++;
          stats.errors.push({
            id: node._id.toString(),
            name: node.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      stats.updated = toUpdate.length; // בדרי-ראן - "היו מתעדכנים"
    }

    stats.skipped = stats.total - stats.needUpdate;

    // סיכום
    console.log('\n' + '='.repeat(60));
    console.log('📊 סיכום מיגרציה:');
    console.log('='.repeat(60));
    console.log(`📂 סה"כ קטגוריות:              ${stats.total}`);
    console.log(`✅ ${isDryRun ? 'היו מתעדכנות' : 'עודכנו'} בהצלחה:      ${stats.updated}`);
    console.log(`⏭️  דולגו (כבר תקינות):          ${stats.skipped}`);
    console.log(`❌ נכשלו:                        ${stats.failed}`);
    console.log('='.repeat(60));

    // הצגת שגיאות אם יש
    if (stats.errors.length > 0) {
      console.log('\n❌ שגיאות שנמצאו:');
      stats.errors.forEach(({ id, name, error }) => {
        console.log(`   - ${name} (${id}): ${error}`);
      });
    }

    // וידוא סופי
    if (!isDryRun && stats.failed === 0) {
      console.log('\n🔍 בדיקת וידוא סופית...');
      
      const withoutPath = await Category.countDocuments({ 
        $or: [
          { path: { $exists: false } },
          { path: '' },
          { path: null },
        ]
      });
      
      const withoutLevel = await Category.countDocuments({ 
        level: { $exists: false }
      });

      if (withoutPath === 0 && withoutLevel === 0) {
        console.log('✨ מיגרציה הושלמה בהצלחה מלאה!');
        console.log('   כל הקטגוריות מכילות level ו-path תקינים');
      } else {
        console.log(`⚠️  נותרו ${withoutPath} ללא path, ${withoutLevel} ללא level`);
      }
    }

    if (isDryRun) {
      console.log('\n💡 זה היה dry-run. הרץ ללא --dry-run כדי לבצע את השינויים.');
    }

    // הצגת סטטיסטיקות נוספות
    console.log('\n📈 סטטיסטיקות עץ:');
    const levelCounts = new Map<number, number>();
    flatList.forEach(node => {
      levelCounts.set(node.level, (levelCounts.get(node.level) || 0) + 1);
    });
    
    Array.from(levelCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, count]) => {
        const label = level === 0 ? 'ראשיות' : level === 1 ? 'תת-קטגוריות' : `רמה ${level}`;
        console.log(`   רמה ${level} (${label}): ${count} קטגוריות`);
      });

    process.exit(0);

  } catch (error) {
    console.error('\n💥 שגיאה קריטית במיגרציה:', error);
    process.exit(1);
  }
}

// הרצת המיגרציה
migrateCategories();
