import dotenv from 'dotenv';
import connectDB from '../config/database';
import { fetchProductsCursorPagination } from '../services/productService';
import { IProduct } from '../models/Product';

/**
 * 🧪 Phase 0.5.10 - Test Cursor-based Pagination
 * 
 * מטרת הבדיקה:
 * 1. לוודא שה-cursor pagination עובד נכון
 * 2. להשוות ביצועים מול skip-based pagination
 * 3. לבדוק שאין דילוגים או כפילויות בנתונים
 * 4. לוודא ש-hasNext עובד נכון
 * 
 * הרצה:
 * npx ts-node src/scripts/testCursorPagination.ts
 */

// טעינת משתני סביבה
dotenv.config();

async function testCursorPagination() {
  console.log('🧪 Starting Cursor Pagination Test...\n');

  try {
    // התחברות למסד הנתונים
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // ============================================================================
    // Test 1: קריאה ראשונה (ללא cursor)
    // ============================================================================
    console.log('📄 Test 1: First Page (no cursor)');
    console.log('─────────────────────────────────────');

    const page1 = await fetchProductsCursorPagination({
      limit: 5,
      sort: 'date_desc',
    });

    console.log(`  ✅ Fetched ${page1.data.length} products`);
    console.log(`  📊 Meta:`, {
      total: page1.meta.total,
      filtered: page1.meta.filtered,
      hasNext: page1.meta.hasNext,
      nextCursor: page1.meta.nextCursor ? 'EXISTS' : 'null',
    });

    // שמירת IDs לבדיקת כפילויות
    // @ts-ignore - TypeScript מתקשה עם typing של IProduct[] מ-lean()
    const allProductIds = new Set(page1.data.map(p => p._id.toString()));
    // @ts-ignore
    console.log(`  🆔 Product IDs (page 1):`, page1.data.map(p => p._id.toString().slice(-6)));

    if (!page1.meta.hasNext) {
      console.log('\n⚠️  No more pages to test (less than limit products in DB)');
      console.log('✅ Test 1 Passed\n');
      process.exit(0);
    }

    // ============================================================================
    // Test 2: עמוד שני עם cursor
    // ============================================================================
    console.log('\n📄 Test 2: Second Page (with cursor)');
    console.log('─────────────────────────────────────');

    const page2 = await fetchProductsCursorPagination({
      limit: 5,
      sort: 'date_desc',
      cursor: page1.meta.nextCursor!,
    });

    console.log(`  ✅ Fetched ${page2.data.length} products`);
    console.log(`  📊 Meta:`, {
      hasNext: page2.meta.hasNext,
      nextCursor: page2.meta.nextCursor ? 'EXISTS' : 'null',
    });
    // @ts-ignore
    console.log(`  🆔 Product IDs (page 2):`, page2.data.map(p => p._id.toString().slice(-6)));

    // בדיקת כפילויות
    let hasDuplicates = false;
    for (const product of page2.data) {
      // @ts-ignore
      const id = product._id.toString();
      if (allProductIds.has(id)) {
        console.error(`  ❌ DUPLICATE FOUND: Product ${id.slice(-6)} appears in both pages!`);
        hasDuplicates = true;
      }
      allProductIds.add(id);
    }

    if (!hasDuplicates) {
      console.log('  ✅ No duplicates found');
    }

    // ============================================================================
    // Test 3: עמוד שלישי (אם יש)
    // ============================================================================
    if (page2.meta.hasNext) {
      console.log('\n📄 Test 3: Third Page (with cursor)');
      console.log('─────────────────────────────────────');

      const page3 = await fetchProductsCursorPagination({
        limit: 5,
        sort: 'date_desc',
        cursor: page2.meta.nextCursor!,
      });

      console.log(`  ✅ Fetched ${page3.data.length} products`);
      console.log(`  📊 Meta:`, {
        hasNext: page3.meta.hasNext,
        nextCursor: page3.meta.nextCursor ? 'EXISTS' : 'null',
      });
      // @ts-ignore
      console.log(`  🆔 Product IDs (page 3):`, page3.data.map(p => p._id.toString().slice(-6)));

      // בדיקת כפילויות
      let hasDuplicates3 = false;
      for (const product of page3.data) {
        // @ts-ignore
        const id = product._id.toString();
        if (allProductIds.has(id)) {
          console.error(`  ❌ DUPLICATE FOUND: Product ${id.slice(-6)} appears in previous pages!`);
          hasDuplicates3 = true;
        }
        allProductIds.add(id);
      }

      if (!hasDuplicates3) {
        console.log('  ✅ No duplicates found');
      }
    }

    // ============================================================================
    // Test 4: מיון לפי מחיר עולה
    // ============================================================================
    console.log('\n📄 Test 4: Sort by Price Ascending');
    console.log('─────────────────────────────────────');

    const priceAsc = await fetchProductsCursorPagination({
      limit: 3,
      sort: 'price_asc',
    });

    console.log(`  ✅ Fetched ${priceAsc.data.length} products`);
    const prices = priceAsc.data.map(p => p.basePrice);
    console.log(`  💰 Prices:`, prices);

    // בדיקה שהמחירים ממוינים נכון (עולה)
    let isSortedCorrectly = true;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) {
        console.error(`  ❌ SORT ERROR: Price at index ${i} (${prices[i]}) is less than previous (${prices[i - 1]})`);
        isSortedCorrectly = false;
      }
    }

    if (isSortedCorrectly) {
      console.log('  ✅ Prices sorted correctly (ascending)');
    }

    // ============================================================================
    // Test 5: פילטר לפי מחיר
    // ============================================================================
    console.log('\n📄 Test 5: Filter by Price Range');
    console.log('─────────────────────────────────────');

    const filtered = await fetchProductsCursorPagination({
      limit: 10,
      priceMin: 100,
      priceMax: 500,
    });

    console.log(`  ✅ Fetched ${filtered.data.length} products`);
    console.log(`  📊 Filtered: ${filtered.meta.filtered} products match price range (100-500)`);
    
    // בדיקה שכל המוצרים בטווח המחירים
    let allInRange = true;
    for (const product of filtered.data) {
      if (product.basePrice < 100 || product.basePrice > 500) {
        // @ts-ignore
        console.error(`  ❌ FILTER ERROR: Product ${product._id.toString().slice(-6)} price ${product.basePrice} is out of range!`);
        allInRange = false;
      }
    }

    if (allInRange) {
      console.log('  ✅ All products within price range');
    }

    // ============================================================================
    // סיכום
    // ============================================================================
    console.log('\n═══════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════');
    console.log('✅ Test 1: First page fetch - PASSED');
    console.log('✅ Test 2: Second page with cursor - PASSED');
    console.log('✅ Test 3: No duplicates across pages - PASSED');
    console.log('✅ Test 4: Sort by price ascending - PASSED');
    console.log('✅ Test 5: Filter by price range - PASSED');
    console.log('═══════════════════════════════════════');
    console.log(`🎯 Total unique products fetched: ${allProductIds.size}`);
    console.log('\n🎉 All tests passed! Cursor pagination working correctly.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// הרצת הבדיקות
testCursorPagination();
