import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Product from './models/Product';
import Category from './models/Category';
import Sku from './models/Sku';
import FilterAttribute from './models/FilterAttribute';
import * as fs from 'fs';
import * as path from 'path';

// טעינת משתני סביבה
dotenv.config();

/**
 * יצירת מאפייני סינון בסיסיים
 * מוסיף 3 מאפיינים: צבע, גודל, חומר
 */
async function seedFilterAttributes() {
  console.log('🌱 Seeding filter attributes...');

  // טעינת נתוני משפחות הצבעים מה-JSON
  const colorFamiliesPath = path.join(__dirname, 'data', 'colorFamilies.json');
  const colorFamiliesData = JSON.parse(fs.readFileSync(colorFamiliesPath, 'utf-8'));

  // מחיקת מאפיינים קיימים
  await FilterAttribute.deleteMany({});

  // מאפיין צבע (עם משפחות)
  await FilterAttribute.create({
    name: 'צבע',
    key: 'color',
    valueType: 'color',
    icon: '🎨',
    showInFilter: true,
    isRequired: false,
    sortOrder: 1,
    colorFamilies: colorFamiliesData,
  });

  // מאפיין גודל
  await FilterAttribute.create({
    name: 'גודל',
    key: 'size',
    valueType: 'text',
    icon: '📏',
    showInFilter: true,
    isRequired: false,
    sortOrder: 2,
    values: [
      { value: 'XS', displayName: 'XS' },
      { value: 'S', displayName: 'S' },
      { value: 'M', displayName: 'M' },
      { value: 'L', displayName: 'L' },
      { value: 'XL', displayName: 'XL' },
      { value: 'XXL', displayName: 'XXL' },
    ],
  });

  // מאפיין חומר
  await FilterAttribute.create({
    name: 'חומר',
    key: 'material',
    valueType: 'text',
    icon: '🧵',
    showInFilter: true,
    isRequired: false,
    sortOrder: 3,
    values: [
      { value: 'cotton', displayName: 'כותנה' },
      { value: 'polyester', displayName: 'פוליאסטר' },
      { value: 'wool', displayName: 'צמר' },
      { value: 'silk', displayName: 'משי' },
      { value: 'nylon', displayName: 'ניילון' },
      { value: 'linen', displayName: 'פשתן' },
    ],
  });

  console.log('✅ Filter attributes seeded successfully (3 attributes)');
}

/**
 * ממשק לווריאנט במערך המוצרים
 * Base Price Override Pattern: price יכול להיות null/undefined או מחיר מפורש
 */
interface ProductVariant {
  name: string;
  price?: number | null; // מחיר מפורש - אם null/undefined ישתמש ב-basePrice
  priceModifier?: number; // תאימות לאחור - basePrice + modifier
  stockQuantity: number;
  color?: string;
  size?: string;
  sku: string;
  images: Array<{ url: string; public_id: string; width?: number; height?: number; format?: string }>;
   
}

/**
 * פונקציית עזר להמרת URL רגיל ל-IImage object
 * Phase 1.4: תמונות נשמרות כ-{url, public_id} במקום string
 */
function convertToIImage(url: string) {
  return {
    url,
    public_id: '', // ריק כי אלו תמונות חיצוניות (Unsplash/Cloudinary)
    width: undefined,
    height: undefined,
    format: undefined
  };
}

// נתוני קטגוריות - עד 3 רמות: אבא > בן > נכד > מוצר
const categories = [
  {
    name: 'ערכות',
    slug: 'kits',
    description: 'ערכות סיגריות אלקטרוניות מוכנות לשימוש',
    isActive: true,
    sortOrder: 1,
    subcategories: [
      { name: 'ערכות פוד', slug: 'pod-kits', description: 'ערכות פוד קטנות ונוחות למתחילים ומתקדמים' },
      { name: 'ערכות מתקדמות', slug: 'advanced-kits', description: 'ערכות מתקדמות עם בקרת הספק ומסכים' },
      { name: 'ערכות חד פעמיות', slug: 'disposable-kits', description: 'ערכות חד פעמיות ונוחות עם טעמים מגוונים' }
    ]
  },
  {
    name: 'מודים',
    slug: 'mods',
    description: 'מודים מתקדמים לחובבי ווייפינג',
    isActive: true,
    sortOrder: 2,
    subcategories: [
      { name: 'Pod Mods', slug: 'pod-mods', description: 'מודים לפודים עם בקרת הספק', subcategories: [ { name: 'Aspire BP', slug: 'aspire-bp', description: 'מוצרי Aspire תחת Pod Mods' } ] },
      { name: 'Box Mods', slug: 'box-mods', description: 'מודים מרובעים עם סוללות נפרדות' }
    ]
  },
  {
    name: 'סלילים ופודים',
    slug: 'coils-pods',
    description: 'סלילי החלפה ופודים לכל הדגמים',
    isActive: true,
    sortOrder: 3,
    subcategories: [
      { name: 'Aspire', slug: 'aspire-coils', description: 'סלילים ופודים של Aspire' },
      { name: 'Voopoo', slug: 'voopoo-coils', description: 'סלילים ופודים של Voopoo' },
      { name: 'Vaporesso', slug: 'vaporesso-coils', description: 'סלילים ופודים של Vaporesso' },
      { name: 'SMOK', slug: 'smok-coils', description: 'סלילים ופודים של SMOK' }
    ]
  },
  {
    name: 'טנקים',
    slug: 'tanks',
    description: 'טנקים ומיכלי נוזל מתקדמים',
    isActive: true,
    sortOrder: 4,
    subcategories: [
      { name: 'Sub-Ohm Tanks', slug: 'sub-ohm-tanks', description: 'טנקים לעישון ישיר לריאות' },
      { name: 'MTL Tanks', slug: 'mtl-tanks', description: 'טנקים לעישון לפה' },
      { name: 'RTA Tanks', slug: 'rta-tanks', description: 'טנקים הניתנים לבניה עצמית' }
    ]
  },
  {
    name: 'אביזרים',
    slug: 'accessories',
    description: 'אביזרים וחלקי חילוף לסיגריות אלקטרוניות',
    isActive: true,
    sortOrder: 5,
    subcategories: [
      { name: 'סוללות', slug: 'batteries', description: 'סוללות נטענות 18650, 21700 וסוגים נוספים' },
      { name: 'מטענים', slug: 'chargers', description: 'מטעני סוללות חכמים ובטוחים' },
      { name: 'חלקי חילוף', slug: 'replacement-parts', description: 'זכוכיות, O-Rings ואביזרי החלפה' }
    ]
  }
];

const products = [
  // ערכות פוד
  {
    name: 'ASPIRE NEXI PRO KIT',
    description: 'ערכת פוד מתקדמת עם סוללה 350mAh + 1650mAh ופוד 2ml רחב למילוי',
    price: 120,
    compareAtPrice: 140,
    images: [convertToIImage('https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800&q=80&fm=jpg')],
    inStock: 25,
    featured: true,
    tags: ['Aspire', 'פוד קיט', 'מתחילים'],
    categorySlug: 'pod-kits',
    brand: 'Aspire',
    sku: 'ASP-NEXI-PRO-001',
    weight: 0.15,
    dimensions: { length: 10.2, width: 2.8, height: 1.6 }
  },
  {
    name: 'VOOPOO ARGUS G3 KIT',
    description: 'ערכת פוד עם סוללה 1500mAh, מסך צבעוני וטכנולוגיית GENE.TT 2.0',
    price: 152,
    compareAtPrice: 180,
    images: [convertToIImage('https://images.unsplash.com/photo-1526928281700-dd60567049cb?w=800&q=80&fm=jpg')],
    inStock: 18,
    featured: true,
    tags: ['Voopoo', 'פוד קיט', 'מתקדם'],
    categorySlug: 'pod-kits',
    brand: 'Voopoo',
    sku: 'VPO-ARGUS-G3-001',
    weight: 0.2,
    dimensions: { length: 11.5, width: 4.2, height: 2.5 }
  },
  // ערכות מתקדמות
  {
    name: 'VAPORESSO LUXE XR MAX KIT',
    description: 'ערכה מתקדמת עם הספק עד 80W, מסך TFT וטכנולוגיית AXON',
    price: 250,
    compareAtPrice: 299,
    images: [convertToIImage('https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800&q=80&fm=jpg')],
    inStock: 12,
    featured: true,
    tags: ['Vaporesso', 'מתקדם', '80W'],
    categorySlug: 'advanced-kits',
    brand: 'Vaporesso',
    sku: 'VAP-LUXE-XR-MAX-001',
    weight: 0.35,
    dimensions: { length: 13.2, width: 4.8, height: 3.2 }
  },
  // ערכות חד פעמיות
  {
    name: 'CIGGY BAR 5K DISPOSABLE',
    description: 'סיגריה חד פעמית עם 5000 שאיפות, 20mg ניקוטין בטעמים שונים',
    price: 25,
    compareAtPrice: 35,
    images: [convertToIImage('https://images.unsplash.com/photo-1563906267088-b029e7101114?w=800&q=80&fm=jpg')],
    inStock: 50,
    featured: false,
    tags: ['חד פעמי', '5000 שאיפות', 'נוח'],
    categorySlug: 'disposable-kits',
    brand: 'Ciggy',
    sku: 'CIG-BAR-5K-001',
    weight: 0.08,
    dimensions: { length: 11, width: 2.2, height: 1.8 }
  },
  // Pod Mods
  {
    name: 'VOOPOO DRAG M100S MOD',
    description: 'מוד פוד מתקדם עם הספק עד 80W, מסך צבעוני וטכנולוגיית GENE',
    price: 225,
    compareAtPrice: 260,
    images: [convertToIImage('https://images.unsplash.com/photo-1548192746-dd526f154ed9?w=800&q=80&fm=jpg')],
    inStock: 8,
    featured: true,
    tags: ['Voopoo', 'Pod Mod', 'GENE'],
    categorySlug: 'pod-mods',
    brand: 'Voopoo',
    sku: 'VPO-DRAG-M100S-001',
    weight: 0.18,
    dimensions: { length: 11.8, width: 4.5, height: 2.8 }
  },
  // Box Mods
  {
    name: 'ASPIRE ROVER PLUS MOD',
    description: 'מוד בוקס עם סוללה 2600mAh, מסך TFT צבעוני ועד 100W',
    price: 136,
    compareAtPrice: 160,
    images: [convertToIImage('https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80&fm=jpg')],
    inStock: 6,
    featured: false,
    tags: ['Aspire', 'Box Mod', 'TFT מסך'],
    categorySlug: 'box-mods',
    brand: 'Aspire',
    sku: 'ASP-ROVER-PLUS-001',
    weight: 0.28,
    dimensions: { length: 14, width: 5.2, height: 3.5 }
  },
  // סלילי Aspire
  {
    name: 'ASPIRE NAUTILUS BVC COILS',
    description: 'סלילי החלפה לטנק Nautilus עם טכנולוגיית BVC, 5 יחידות',
    price: 60,
    compareAtPrice: 72,
    images: [convertToIImage('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80&fm=jpg')],
    inStock: 35,
    featured: false,
    tags: ['Aspire', 'Nautilus', 'BVC'],
    categorySlug: 'aspire-coils',
    brand: 'Aspire',
    sku: 'ASP-NAUTILUS-BVC-001',
    weight: 0.05,
    dimensions: { length: 2.5, width: 1.8, height: 1.8 }
  },
  // סלילי Voopoo
  {
    name: 'VOOPOO PNP COILS',
    description: 'סלילי PnP תואמים למערכת Voopoo בהתנגדויות שונות, 5 יחידות',
    price: 75,
    compareAtPrice: 85,
    images: [convertToIImage('https://images.unsplash.com/photo-1516975484552-1e5323e1938e?w=800&q=80&fm=jpg')],
    inStock: 45,
    featured: true,
    tags: ['Voopoo', 'PNP', 'DTL'],
    categorySlug: 'voopoo-coils',
    brand: 'Voopoo',
    sku: 'VPO-PNP-COILS-001',
    weight: 0.04,
    dimensions: { length: 2.2, width: 1.5, height: 1.5 }
  },
  // סלילי Vaporesso
  {
    name: 'VAPORESSO GTX COILS',
    description: 'סלילי GTX עם טכנולוגיית Mesh מתקדמת לטעם מעולה, 5 יחידות',
    price: 65,
    compareAtPrice: 75,
    images: [convertToIImage('https://images.unsplash.com/photo-1593642532973-d31b6557fa68?w=800&q=80&fm=jpg')],
    inStock: 32,
    featured: false,
    tags: ['Vaporesso', 'GTX', 'Mesh'],
    categorySlug: 'vaporesso-coils',
    brand: 'Vaporesso',
    sku: 'VAP-GTX-COILS-001',
    weight: 0.06,
    dimensions: { length: 2.8, width: 1.6, height: 1.6 }
  },
  // סלילי SMOK
  {
    name: 'SMOK RPM COILS',
    description: 'סלילי RPM לערכות SMOK עם התנגדויות מגוונות, 5 יחידות',
    price: 68,
    compareAtPrice: 78,
    images: [convertToIImage('https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&q=80&fm=jpg')],
    inStock: 28,
    featured: false,
    tags: ['SMOK', 'RPM', 'מגוון'],
    categorySlug: 'smok-coils',
    brand: 'SMOK',
    sku: 'SMK-RPM-COILS-001',
    weight: 0.05,
    dimensions: { length: 2.4, width: 1.6, height: 1.6 }
  },
  // Sub-Ohm Tanks
  {
    name: 'ASPIRE ODAN EVO TANK',
    description: 'טנק Sub-Ohm עם קיבולת 4.5ml, זרימת אוויר מתכווננת מלמטה',
    price: 88,
    compareAtPrice: 110,
    images: [convertToIImage('https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80&fm=jpg')],
    inStock: 15,
    featured: true,
    tags: ['Aspire', 'Sub-Ohm', 'Odan'],
    categorySlug: 'sub-ohm-tanks',
    brand: 'Aspire',
    sku: 'ASP-ODAN-EVO-001',
    weight: 0.12,
    dimensions: { length: 5.5, width: 2.5, height: 2.5 }
  },
  // MTL Tanks
  {
    name: 'ASPIRE NAUTILUS 3 TANK',
    description: 'טנק MTL קלאסי עם קיבולת 4ml וזרימת אוויר מתכווננת מלמעלה',
    price: 96,
    compareAtPrice: 115,
    images: [convertToIImage('https://images.unsplash.com/photo-1600881333168-2ef49b341f84?w=800&q=80&fm=jpg')],
    inStock: 12,
    featured: false,
    tags: ['Aspire', 'MTL', 'Nautilus'],
    categorySlug: 'mtl-tanks',
    brand: 'Aspire',
    sku: 'ASP-NAUTILUS-3-001',
    weight: 0.1,
    dimensions: { length: 4.8, width: 2.4, height: 2.4 }
  },
  // RTA Tanks
  {
    name: 'GEEKVAPE ZEUS RTA',
    description: 'טנק RTA לבנייה עצמית עם זרימת אוויר עליונה ונפח 5ml',
    price: 124,
    compareAtPrice: 145,
    images: [convertToIImage('https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80&fm=jpg')],
    inStock: 8,
    featured: true,
    tags: ['GeekVape', 'RTA', 'בנייה עצמית'],
    categorySlug: 'rta-tanks',
    brand: 'GeekVape',
    sku: 'GVP-ZEUS-RTA-001',
    weight: 0.15,
    dimensions: { length: 6.2, width: 2.6, height: 2.6 }
  },
  // סוללות
  {
    name: 'SAMSUNG 18650 Q30',
    description: 'סוללת ליתיום איון נטענת 3000mAh עם זרם פריקה עד 15A',
    price: 40,
    compareAtPrice: 50,
    images: [convertToIImage('https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80&fm=jpg')],
    inStock: 35,
    featured: false,
    tags: ['Samsung', '18650', 'ליתיום'],
    categorySlug: 'batteries',
    brand: 'Samsung',
    sku: 'SAM-18650-Q30-001',
    weight: 0.048,
    dimensions: { length: 6.5, width: 1.85, height: 1.85 }
  },
  {
    name: 'SONY VTC6 18650',
    description: 'סוללת Sony VTC6 3000mAh עם זרם פריקה גבוה עד 30A',
    price: 50,
    compareAtPrice: 60,
    images: [convertToIImage('https://images.unsplash.com/photo-1582473956846-c35a3af95e45?w=800&q=80&fm=jpg')],
    inStock: 25,
    featured: true,
    tags: ['Sony', 'VTC6', '30A'],
    categorySlug: 'batteries',
    brand: 'Sony',
    sku: 'SON-VTC6-001',
    weight: 0.046,
    dimensions: { length: 6.5, width: 1.85, height: 1.85 }
  },
  // מטענים
  {
    name: 'NITECORE UMS2 CHARGER',
    description: 'מטען חכם לסוללות עם 2 חריצים, מסך LCD והגנות בטיחות מתקדמות',
    price: 64,
    compareAtPrice: 80,
    images: [convertToIImage('https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=800&q=80&fm=jpg')],
    inStock: 20,
    featured: true,
    tags: ['Nitecore', 'מטען', 'LCD'],
    categorySlug: 'chargers',
    brand: 'Nitecore',
    sku: 'NIT-UMS2-001',
    weight: 0.25,
    dimensions: { length: 15.8, width: 9.6, height: 3.6 }
  },
  // חלקי חילוף
  {
    name: 'ASPIRE ODAN GLASS TUBE',
    description: 'זכוכית חלפית לטנק Aspire Odan בנפח 4.5ml, עשויה זכוכית פיירקס',
    price: 15,
    compareAtPrice: 20,
    images: [convertToIImage('https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&q=80&fm=jpg')],
    inStock: 40,
    featured: false,
    tags: ['Aspire', 'זכוכית', 'Odan'],
    categorySlug: 'replacement-parts',
    brand: 'Aspire',
    sku: 'ASP-ODAN-GLASS-001',
    weight: 0.02,
    dimensions: { length: 4.5, width: 2.5, height: 2.5 }
  },
  // הוספת מוצר חדש תחת קטגוריה Pod Mods
  {
    name: 'ASPIRE FLEXUS Q POD MOD KIT',
    description: 'ערכת Pod Mod עם סוללה פנימית 2500mAh, הספק עד 80W, פוד 5mL מתכוונן, טעינה USB-C וזרימת אוויר מתכווננת. תומך בהתנגדויות 0.15Ω-1.0Ω עם 3 רמות הספק.',
    price: 180,
    compareAtPrice: 220,
    images: [convertToIImage('https://res.cloudinary.com/dnhcki0qi/image/upload/v1758412386/Aspire-r1-kit-sky-blue_q5de0u.jpg')],
    inStock: 20,
    featured: true,
    tags: ['Aspire', 'Pod Mod', '80W'],
    categorySlug: 'aspire-bp',
    brand: 'Aspire',
    sku: 'ASP-FLEXUS-Q-001',
    weight: 0.25,
    dimensions: { length: 11.87, width: 2.65, height: 2.8 },
    variants: [
      {
        name: 'כחול',
        price: null, // ← Base Price Override: ישתמש במחיר הבסיס של המוצר (180)
        stockQuantity: 5,
        color: '#00bfff', // ← קוד HEX כחול שמיים
        sku: 'ASP-FLEXUS-Q-BLUE',
        images: [convertToIImage('https://res.cloudinary.com/dnhcki0qi/image/upload/v1758412386/Aspire-r1-kit-sky-blue_q5de0u.jpg')],
      },
      {
        name: 'ורוד',
        price: null, // ← Base Price Override: ישתמש במחיר הבסיס (180)
        stockQuantity: 5,
        color: '#ce26b5ff', // ← קוד HEX ורוד פוקסיה
        sku: 'ASP-FLEXUS-Q-PINK',
        images: [convertToIImage('https://res.cloudinary.com/dnhcki0qi/image/upload/v1758413105/Aspire-r1-kit-pink_lpqqcm.jpg')],
      },
      {
        name: 'כתום-צהוב',
        price: 200, // ← Override: מחיר מיוחד לצבע זה (דורס את 180)
        stockQuantity: 5,
        sku: 'ASP-FLEXUS-Q-ORANGE',
        color: '#e69316ff', // ← קוד HEX כתום צהוב
        images: [convertToIImage('https://res.cloudinary.com/dnhcki0qi/image/upload/v1758413535/Aspire-r1-kit-orange-yellow-gradient_kl9jgj.jpg')],
      },
      {
        name: 'שחור',
        price: 220, // ← Override: מחיר פרימיום לצבע שחור (דורס את 180)
        stockQuantity: 5,
        sku: 'ASP-FLEXUS-Q-BLACK',
        color: '#2c2c2c', // ← קוד HEX שחור כהה
        images: [
          convertToIImage('https://res.cloudinary.com/dnhcki0qi/image/upload/v1758413309/Aspire-r1-kit-black_gegz5x.jpg'),
          convertToIImage('https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800&q=80&fm=jpg')
        ]
      }
    ]
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
    console.log('📡 Connected to MongoDB for seeding');

    // מחיקת נתונים קיימים
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Sku.deleteMany({});
    console.log('🗑️ Cleared existing data (categories, products, skus)');

    // יצירת מאפייני סינון
    await seedFilterAttributes();

    // יצירת קטגוריות היררכיות - עד 3 רמות
    const flatCategories: any[] = [];
    
    // המרת הקטגוריות ההיררכיות לרשימה שטוחה (עד 3 רמות)
    categories.forEach(mainCategory => {
      // הוספת הקטגוריה הראשית (רמה 0)
      flatCategories.push({
        name: mainCategory.name,
        slug: mainCategory.slug,
        description: mainCategory.description,
        isActive: mainCategory.isActive,
        sortOrder: mainCategory.sortOrder,
        level: 0,
        parentId: null
      });

      // הוספת תת-קטגוריות (רמה 1)
      if (mainCategory.subcategories) {
        mainCategory.subcategories.forEach(subCategory => {
          flatCategories.push({
            name: subCategory.name,
            slug: subCategory.slug,
            description: subCategory.description,
            parentSlug: mainCategory.slug,
            level: 1,
            isActive: true
          });

          // הוספת תת-תת-קטגוריות (רמה 2) אם קיימות
          if (subCategory.subcategories) {
            subCategory.subcategories.forEach(subSubCategory => {
              flatCategories.push({
                name: subSubCategory.name,
                slug: subSubCategory.slug,
                description: subSubCategory.description,
                parentSlug: subCategory.slug,
                level: 2,
                isActive: true
              });
            });
          }
        });
      }
    });

    // יצירת קטגוריות ברמה ראשונה (אבא)
    const levelZeroCategories = flatCategories.filter(cat => cat.level === 0);
    const createdLevelZero = await Category.create(levelZeroCategories);
    console.log('🌱 Created level 0 categories:', createdLevelZero.length);

    // מיפוי slug ל-ID
    const slugToIdMap: { [key: string]: any } = {};
    createdLevelZero.forEach(cat => {
      slugToIdMap[cat.slug] = cat._id;
    });

    // יצירת קטגוריות ברמה שניה (בן)
    const levelOneCategories = flatCategories.filter(cat => cat.level === 1).map(cat => ({
      ...cat,
      parentId: slugToIdMap[cat.parentSlug]
    }));
    const createdLevelOne = await Category.create(levelOneCategories);
    console.log('🌱 Created level 1 categories:', createdLevelOne.length);

    // עדכון מפת slugs
    createdLevelOne.forEach(cat => {
      slugToIdMap[cat.slug] = cat._id;
    });

    // יצירת קטגוריות ברמה שלישית (נכד)
    const levelTwoCategories = flatCategories.filter(cat => cat.level === 2).map(cat => ({
      ...cat,
      parentId: slugToIdMap[cat.parentSlug]
    }));
    const createdLevelTwo = await Category.create(levelTwoCategories);
    console.log('🌱 Created level 2 categories:', createdLevelTwo.length);

    // עדכון מפת slugs סופית
    createdLevelTwo.forEach(cat => {
      slugToIdMap[cat.slug] = cat._id;
    });

    const allCreatedCategories = [...createdLevelZero, ...createdLevelOne, ...createdLevelTwo];
    console.log('🌱 Total categories created:', allCreatedCategories.length);

    // מיפוי slug לקטגוריה
    const categoryMap: { [key: string]: any } = {};
    allCreatedCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });

    // הוספת categoryId למוצרים
    const productsWithCategories = products.map(product => {
      const categoryId = categoryMap[product.categorySlug];
      if (!categoryId) {
        console.warn(`⚠️  Category not found for slug: ${product.categorySlug}`);
        return { 
          ...product, 
          categoryId: categoryMap['accessories'] || null,
          basePrice: product.price,
          quantityInStock: product.inStock || 0,
          isActive: true,
          viewCount: 0,
          salesCount: 0,
          isFeatured: product.featured || false,
          isOnSale: false,
          discountPercentage: 0,
          attributes: []
        };
      }
      
      const { categorySlug, inStock, featured, ...productWithoutSlug } = product;
      return {
        ...productWithoutSlug,
        categoryId,
        basePrice: product.price,
        quantityInStock: inStock || 0,
        isActive: true,
        viewCount: 0,
        salesCount: 0,
        isFeatured: featured || false,
        isOnSale: false,
        discountPercentage: 0,
        attributes: []
      };
    });
    // יצירת מוצרים והסרת variants מהם
    const productsWithoutVariants = productsWithCategories.map(product => {
      const { variants, ...productWithoutVariants } = product;
      return productWithoutVariants;
    });
    
    const createdProducts = await Product.create(productsWithoutVariants);
    console.log('🌱 Created products:', createdProducts.length);

    // יצירת SKUs - לכל מוצר
    let totalSkusCreated = 0;
    
    for (let i = 0; i < products.length; i++) {
      const originalProduct = products[i];
      const createdProduct = createdProducts[i];
      
      if (originalProduct.variants && originalProduct.variants.length > 0) {
        // מוצר עם variants - יצירת SKU לכל variant
        const skusToCreate = originalProduct.variants.map((variant: any) => ({
          sku: variant.sku,
          productId: createdProduct._id,
          name: `${createdProduct.name} - ${variant.name}`,
          // Base Price + Override Pattern:
          // אם variant.price מוגדר מפורשות - השתמש בו (override)
          // אם יש priceModifier - חשב basePrice + modifier (תאימות לאחור)
          // אחרת - null (ישתמש ב-basePrice של המוצר)
          price: variant.price !== undefined 
            ? variant.price 
            : (variant.priceModifier ? createdProduct.basePrice + variant.priceModifier : null),
          stockQuantity: variant.stockQuantity,
          // שדות שטוחים במקום attributes מקונן
          color: variant.color,
          size: variant.size,
          images: variant.images || createdProduct.images,
          isActive: true
        }));
        
        await Sku.create(skusToCreate);
        totalSkusCreated += skusToCreate.length;
        console.log(`  ✅ Created ${skusToCreate.length} SKUs for ${createdProduct.name}`);
      } else {
        // מוצר פשוט - יצירת SKU אחד
        const singleSku = {
          sku: originalProduct.sku,
          productId: createdProduct._id,
          name: createdProduct.name,
          price: createdProduct.basePrice,
          stockQuantity: createdProduct.quantityInStock,
          attributes: {},
          images: createdProduct.images,
          isActive: true
        };
        
        await Sku.create(singleSku);
        totalSkusCreated++;
      }
    }
    
    console.log('🌱 Created SKUs:', totalSkusCreated);

    console.log('✅ Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${allCreatedCategories.length} categories (up to 3 levels)`);
    console.log(`   - ${createdProducts.length} products`);
    console.log(`   - ${totalSkusCreated} SKUs`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    // ניתוק מהדטאבייס
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

export default seedProducts;

// הפעלת הסידינג
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('🌱 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🔥 Seeding failed:', error);
      process.exit(1);
    });
}
