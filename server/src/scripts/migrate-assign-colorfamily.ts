import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ntc from '@trihargianto/ntcjs';
import Sku from '../models/Sku';
import fs from 'fs';
import path from 'path';

// טעינת env
dotenv.config();

// הגדרת סף fuzzy (DeltaE) - ניתן לשנות בהתאם לתוצאות
const DEFAULT_THRESHOLD = 20; // בערך CIELab distance

// המרת HEX -> RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

// המרה RGB -> XYZ -> Lab (CIE standard) - לצורך DeltaE
function rgbToXyz(rgb: { r: number; g: number; b: number }) {
  const srgb = { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = linearize(srgb.r);
  const g = linearize(srgb.g);
  const b = linearize(srgb.b);

  // sRGB D65
  return {
    x: r * 0.4124 + g * 0.3576 + b * 0.1805,
    y: r * 0.2126 + g * 0.7152 + b * 0.0722,
    z: r * 0.0193 + g * 0.1192 + b * 0.9505,
  };
}

function xyzToLab(xyz: { x: number; y: number; z: number }) {
  // D65 reference white
  const refX = 0.95047;
  const refY = 1.00000;
  const refZ = 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + (16 / 116));

  const fx = f(xyz.x / refX);
  const fy = f(xyz.y / refY);
  const fz = f(xyz.z / refZ);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE(labA: { L: number; a: number; b: number }, labB: { L: number; a: number; b: number }) {
  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// פונקציית זיהוי פשוטה: מחזירה המשפחה המתאימה בהתאם למודולים של colorFamilies
function detectColorFamilyServer(colorValue: string | null | undefined, colorFamilies: any[], threshold = DEFAULT_THRESHOLD) {
  if (!colorValue || !colorFamilies || !colorFamilies.length) return { family: null, method: 'none', score: null };

  const lc = String(colorValue).trim();
  const normalizedHex = lc.startsWith('#') && lc.length >= 4 ? lc.toLowerCase() : null;

  // שלב 1: בדיקת התאמה מדויקת לפי hex
  if (normalizedHex) {
    for (const family of colorFamilies) {
      for (const variant of family.variants || []) {
        if (variant.hex && variant.hex.toLowerCase() === normalizedHex) {
          return { family: family.family, variant: variant, method: 'exact', score: 0 };
        }
      }
    }
  }

  // אם זה שם עברי שהמשתמש הזין (למשל: 'שחור') - בדוק התאמה על ידי displayName
  const containsHebrew = /[א-ת]/.test(lc);
  if (containsHebrew) {
    for (const family of colorFamilies) {
      if (family.displayName && family.displayName === lc) {
        // family.displayName may be Hebrew. נרים את המשפחה המתאימה
        return { family: family.family, variant: family.variants && family.variants[0], method: 'name', score: null };
      }
    }
  }

  // שלב 2: name/english match
  const englishFromHex = normalizedHex ? ntc.name(normalizedHex)[1] : null;
  const engLower = englishFromHex ? englishFromHex.toLowerCase() : lc.toLowerCase();
  for (const family of colorFamilies) {
    for (const variant of family.variants || []) {
      if (variant.name && engLower === variant.name.toLowerCase()) {
        return { family: family.family, variant: variant, method: 'name', score: null };
      }
    }
  }

  // שלב 3: fuzzy matching - מדידת deltaE בין צבע המקל ו-representativeHex לכל משפחה
  if (normalizedHex) {
    const rgb = hexToRgb(normalizedHex);
    if (rgb) {
      const lab = xyzToLab(rgbToXyz(rgb));
      let best = { family: null as string | null, variant: null as any, dist: Number.POSITIVE_INFINITY };
      for (const family of colorFamilies) {
        const repHex = family.representativeHex || (family.variants && family.variants[0]?.hex);
        if (!repHex) continue;
        const vRgb = hexToRgb(repHex);
        if (!vRgb) continue;
        const vLab = xyzToLab(rgbToXyz(vRgb));
        const d = deltaE(lab, vLab);
        if (d < best.dist) {
          best = { family: family.family, variant: family.variants && family.variants[0], dist: d };
        }
      }
      if (best.family && best.dist <= threshold) {
        return { family: best.family, variant: best.variant, method: 'fuzzy', score: Math.round(best.dist) };
      }
    }
  }

  return { family: null, method: 'none', score: null };
}

// סקריפט ריצה עיקרי
async function main() {
  console.log('🚀 מתחיל סקריפט מיגרציה: assign colorFamily ל-SKUs');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(mongoUri);
  console.log('✅ חיבור למסד נתונים');

  const file = fs.readFileSync(path.resolve(__dirname, '../data/colorFamilies.json'), 'utf-8');
  const colorFamilies = JSON.parse(file);

  const skus = await Sku.find({}).lean().exec();
  let updated = 0;
  let skippedManual = 0;
  let notFound = 0;

  for (const s of skus) {
    if ((s as any).colorFamilySource && (s as any).colorFamilySource === 'manual') {
      skippedManual++;
      continue; // כבדו בחירה ידנית
    }
    const colorVal = s.color;
    const detection = detectColorFamilyServer(colorVal, colorFamilies);
    if (detection.family) {
      // עדכן אם שונה
      if (s.colorFamily !== detection.family || (s as any).colorFamilySource !== 'auto') {
        await Sku.updateOne({ _id: s._id }, { $set: { colorFamily: detection.family, colorFamilySource: 'auto' } }).exec();
        updated++;
      }
    } else {
      notFound++;
    }
  }

  console.log('✅ Migration complete');
  console.log(`Updated SKUs: ${updated}`);
  console.log(`Skipped (manual): ${skippedManual}`);
  console.log(`Not found: ${notFound}`);

  await mongoose.disconnect();
  console.log('👋 disconnected');
}

main().catch((e) => {
  console.error('❌ error:', e);
  process.exit(1);
});
