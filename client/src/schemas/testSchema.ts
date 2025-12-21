// קובץ בדיקה זמני לולידציה
import { skuSchema } from './productFormSchema';

async function testValidation() {
  console.log('🧪 בודק ולידציה של SKU עם מחיר ריק...');
  
  // מקרה 1: מחיר ריק (string ריק)
  try {
    const result1 = await skuSchema.validate({
      sku: 'TEST-123',
      name: 'וריאנט בדיקה',
      price: '', // ← string ריק
      stockQuantity: 10,
      attributes: { color: 'כחול' },
      images: [],
      isActive: true
    });
    console.log('✅ מקרה 1: מחיר ריק עבר ולידציה:', result1.price); // צריך להיות null
  } catch (error: any) {
    console.error('❌ מקרה 1: מחיר ריק נכשל:', error.message);
  }

  // מקרה 2: מחיר null
  try {
    const result2 = await skuSchema.validate({
      sku: 'TEST-456',
      name: 'וריאנט בדיקה 2',
      price: null, // ← null מפורש
      stockQuantity: 10,
      attributes: { color: 'אדום' },
      images: [],
      isActive: true
    });
    console.log('✅ מקרה 2: מחיר null עבר ולידציה:', result2.price); // צריך להיות null
  } catch (error: any) {
    console.error('❌ מקרה 2: מחיר null נכשל:', error.message);
  }

  // מקרה 3: מחיר תקין
  try {
    const result3 = await skuSchema.validate({
      sku: 'TEST-789',
      name: 'וריאנט בדיקה 3',
      price: 199.99, // ← מחיר תקין
      stockQuantity: 10,
      attributes: { color: 'ירוק' },
      images: [],
      isActive: true
    });
    console.log('✅ מקרה 3: מחיר תקין עבר ולידציה:', result3.price);
  } catch (error: any) {
    console.error('❌ מקרה 3: מחיר תקין נכשל:', error.message);
  }

  // מקרה 4: מחיר שלילי (צריך להיכשל)
  try {
    const result4 = await skuSchema.validate({
      sku: 'TEST-999',
      name: 'וריאנט בדיקה 4',
      price: -50, // ← מחיר שלילי
      stockQuantity: 10,
      attributes: { color: 'צהוב' },
      images: [],
      isActive: true
    });
    console.log('❌ מקרה 4: מחיר שלילי עבר ולידציה (לא אמור!):', result4.price);
  } catch (error: any) {
    console.log('✅ מקרה 4: מחיר שלילי נכשל כצפוי:', error.message);
  }
}

testValidation();
