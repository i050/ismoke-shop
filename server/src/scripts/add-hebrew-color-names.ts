/**
 * Migration Script - Add Hebrew Display Names to Color Variants
 * מטרה: להוסיף שמות תצוגה בעברית לכל הצבעים הקיימים
 * 
 * שימוש:
 * npx ts-node src/scripts/add-hebrew-color-names.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FilterAttribute from '../models/FilterAttribute';

// טען משתני סביבה
dotenv.config();

/**
 * מיפוי שמות צבעים מאנגלית לעברית
 */
const colorNamesMap: { [key: string]: string } = {
  // שחורים
  'Black': 'שחור',
  'Jet Black': 'שחור פחם',
  'Coal': 'פחמי',
  'Ebony': 'הובני',
  'Midnight': 'חצות',
  'Onyx': 'אוניקס',
  'Charcoal': 'פחמי כהה',
  
  // לבנים
  'White': 'לבן',
  'Ivory': 'שנהב',
  'Cream': 'קרם',
  'Pearl': 'פנינה',
  'Snow': 'שלג',
  'Off-White': 'לבן שבור',
  
  // אפורים
  'Gray': 'אפור',
  'Grey': 'אפור',
  'Silver': 'כסף',
  'Slate': 'צפחה',
  'Ash': 'אפר',
  'Charcoal Gray': 'אפור פחמי',
  'Light Gray': 'אפור בהיר',
  'Dark Gray': 'אפור כהה',
  
  // אדומים
  'Red': 'אדום',
  'Crimson': 'ארגמן',
  'Scarlet': 'שני',
  'Ruby': 'אודם',
  'Burgundy': 'בורדו',
  'Maroon': 'חום אדמדם',
  'Cherry': 'דובדבן',
  'Wine': 'יין',
  'Rose': 'ורדרד',
  'Coral': 'אלמוג',
  
  // כחולים
  'Blue': 'כחול',
  'Navy': 'כחול כהה',
  'Royal Blue': 'כחול מלכותי',
  'Sky Blue': 'תכלת',
  'Azure': 'תכלת בהיר',
  'Cobalt': 'קובלט',
  'Sapphire': 'ספיר',
  'Teal': 'כחול ירקרק',
  'Turquoise': 'טורקיז',
  'Cyan': 'ציאן',
  'Steel Blue': 'כחול פלדה',
  
  // ירוקים
  'Green': 'ירוק',
  'Forest Green': 'ירוק יער',
  'Emerald': 'אמרלד',
  'Lime': 'ליים',
  'Mint': 'מנטה',
  'Olive': 'זית',
  'Sage': 'מרווה',
  'Jade': 'ירקן',
  'Pine': 'אורן',
  
  // צהובים
  'Yellow': 'צהוב',
  'Gold': 'זהב',
  'Mustard': 'חרדל',
  'Lemon': 'לימון',
  'Canary': 'קנרי',
  'Amber': 'ענבר',
  
  // כתומים
  'Orange': 'כתום',
  'Peach': 'אפרסק',
  'Tangerine': 'מנדרינה',
  'Apricot': 'משמש',
  
  // סגולים
  'Purple': 'סגול',
  'Violet': 'סגלגל',
  'Lavender': 'לבנדר',
  'Plum': 'שזיף',
  'Mauve': 'סגול בהיר',
  'Lilac': 'לילך',
  'Magenta': 'מג׳נטה',
  
  // ורודים
  'Pink': 'ורוד',
  'Hot Pink': 'ורוד חם',
  'Fuchsia': 'פוקסיה',
  'Blush': 'סומק',
  'Salmon': 'סלמון',
  
  // חומים
  'Brown': 'חום',
  'Beige': 'בז\'',
  'Tan': 'שיזוף',
  'Taupe': 'חום אפרפר',
  'Chocolate': 'שוקולד',
  'Coffee': 'קפה',
  'Caramel': 'קרמל',
  'Sand': 'חול',
  'Khaki': 'חאקי',
};

/**
 * פונקציה ראשית
 */
async function migrateColorNames() {
  try {
    console.log('🚀 Starting color names migration...');
    
    // התחבר ל-MongoDB
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce-db';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // מצא את מאפיין הצבע
    const colorAttribute = await FilterAttribute.findOne({ key: 'color' });
    
    if (!colorAttribute) {
      console.log('⚠️  Color attribute not found - creating default color families...');
      // אם אין מאפיין צבע, צור אחד עם צבעים בסיסיים
      await createDefaultColorAttribute();
      console.log('✅ Default color attribute created');
      return;
    }
    
    console.log(`📊 Found color attribute with ${colorAttribute.colorFamilies?.length || 0} families`);
    
    // עדכן כל משפחה וכל וריאנט
    let totalUpdated = 0;
    
    if (colorAttribute.colorFamilies) {
      for (const family of colorAttribute.colorFamilies) {
        for (const variant of family.variants) {
          // אם אין displayName או שהוא זהה ל-name (באנגלית)
          if (!variant.displayName || variant.displayName === variant.name) {
            // חפש תרגום
            const hebrewName = colorNamesMap[variant.name];
            if (hebrewName) {
              (variant as any).displayName = hebrewName;
              totalUpdated++;
              console.log(`  ✓ ${variant.name} → ${hebrewName}`);
            } else {
              // אם אין תרגום, השאר את השם המקורי
              (variant as any).displayName = variant.name;
              console.log(`  ⚠️  No translation for: ${variant.name}`);
            }
          }
        }
      }
      
      // שמור את השינויים
      await colorAttribute.save();
      console.log(`\n✅ Migration completed! Updated ${totalUpdated} color variants`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

/**
 * יצירת מאפיין צבע ברירת מחדל עם צבעים בסיסיים בעברית
 */
async function createDefaultColorAttribute() {
  await FilterAttribute.create({
    name: 'צבע',
    key: 'color',
    valueType: 'color',
    icon: '🎨',
    showInFilter: true,
    isRequired: false,
    sortOrder: 1,
    colorFamilies: [
      {
        family: 'black',
        displayName: 'שחורים',
        variants: [
          { name: 'Black', displayName: 'שחור', hex: '#000000' },
          { name: 'Charcoal', displayName: 'פחמי', hex: '#36454F' },
        ]
      },
      {
        family: 'white',
        displayName: 'לבנים',
        variants: [
          { name: 'White', displayName: 'לבן', hex: '#FFFFFF' },
          { name: 'Ivory', displayName: 'שנהב', hex: '#FFFFF0' },
        ]
      },
      {
        family: 'gray',
        displayName: 'אפורים',
        variants: [
          { name: 'Gray', displayName: 'אפור', hex: '#808080' },
          { name: 'Silver', displayName: 'כסף', hex: '#C0C0C0' },
        ]
      },
      {
        family: 'red',
        displayName: 'אדומים',
        variants: [
          { name: 'Red', displayName: 'אדום', hex: '#FF0000' },
          { name: 'Crimson', displayName: 'ארגמן', hex: '#DC143C' },
        ]
      },
      {
        family: 'blue',
        displayName: 'כחולים',
        variants: [
          { name: 'Blue', displayName: 'כחול', hex: '#0000FF' },
          { name: 'Navy', displayName: 'כחול כהה', hex: '#000080' },
        ]
      },
      {
        family: 'green',
        displayName: 'ירוקים',
        variants: [
          { name: 'Green', displayName: 'ירוק', hex: '#008000' },
          { name: 'Emerald', displayName: 'אמרלד', hex: '#50C878' },
        ]
      },
    ]
  });
}

// הרץ את הסקריפט
if (require.main === module) {
  migrateColorNames()
    .then(() => {
      console.log('✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { migrateColorNames };
