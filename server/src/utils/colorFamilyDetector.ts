/**
 * Color Family Detector Utility
 * 
 * מזהה אוטומטית את משפחת הצבע מ-HEX code או שם צבע.
 * משמש ב-pre-save hook של SKU כדי לקבוע colorFamily אוטומטית.
 */

import fs from 'fs';
import path from 'path';

// Cache for colorFamilies data
let colorFamiliesCache: ColorFamily[] | null = null;
let cacheLoadedAt: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Threshold for fuzzy matching (CIE Lab deltaE)
const DEFAULT_THRESHOLD = 30; // Increased from 20 for better matching

// ============================================================================
// Types
// ============================================================================

interface ColorVariant {
  name: string;
  hex: string;
}

interface ColorFamily {
  family: string;
  displayName: string;
  representativeHex?: string;
  variants: ColorVariant[];
}

interface DetectionResult {
  family: string | null;
  method: 'exact' | 'name' | 'fuzzy' | 'none';
  score: number | null;
  variant?: ColorVariant;
}

// ============================================================================
// Color Conversion Functions
// ============================================================================

/**
 * Convert HEX to RGB
 */
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

/**
 * Convert RGB to XYZ color space
 */
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

/**
 * Convert XYZ to CIE Lab color space
 */
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

/**
 * Calculate Delta E (color difference) between two Lab colors
 */
function deltaE(labA: { L: number; a: number; b: number }, labB: { L: number; a: number; b: number }): number {
  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Convert HEX directly to Lab
 */
function hexToLab(hex: string): { L: number; a: number; b: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return xyzToLab(rgbToXyz(rgb));
}

// ============================================================================
// Color Families Loading
// ============================================================================

/**
 * Load color families from JSON file with caching
 */
function loadColorFamilies(): ColorFamily[] {
  const now = Date.now();
  
  // Return cached data if still valid
  if (colorFamiliesCache && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return colorFamiliesCache;
  }
  
  try {
    const filePath = path.resolve(__dirname, '../data/colorFamilies.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    colorFamiliesCache = JSON.parse(fileContent);
    cacheLoadedAt = now;
    return colorFamiliesCache || [];
  } catch (error) {
    console.error('⚠️ [colorFamilyDetector] Failed to load colorFamilies.json:', error);
    return [];
  }
}

/**
 * Clear the cache (useful after updating colorFamilies.json)
 */
export function clearColorFamiliesCache(): void {
  colorFamiliesCache = null;
  cacheLoadedAt = 0;
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect color family from a color value (HEX or name)
 * 
 * @param colorValue - HEX code (e.g., '#FF0000') or color name (e.g., 'אדום', 'Red')
 * @param threshold - Maximum deltaE for fuzzy matching (default: 30)
 * @returns Detection result with family name and method used
 */
export function detectColorFamily(
  colorValue: string | null | undefined,
  threshold: number = DEFAULT_THRESHOLD
): DetectionResult {
  if (!colorValue || typeof colorValue !== 'string') {
    return { family: null, method: 'none', score: null };
  }

  const colorFamilies = loadColorFamilies();
  if (!colorFamilies.length) {
    return { family: null, method: 'none', score: null };
  }

  const trimmed = colorValue.trim();
  const normalizedHex = trimmed.startsWith('#') && trimmed.length >= 4 
    ? trimmed.toLowerCase() 
    : null;

  // ============================================================================
  // Step 1: Exact HEX match
  // ============================================================================
  if (normalizedHex) {
    for (const family of colorFamilies) {
      for (const variant of family.variants || []) {
        if (variant.hex && variant.hex.toLowerCase() === normalizedHex) {
          return { 
            family: family.family, 
            variant, 
            method: 'exact', 
            score: 0 
          };
        }
      }
    }
  }

  // ============================================================================
  // Step 2: Hebrew name match (displayName)
  // ============================================================================
  const containsHebrew = /[א-ת]/.test(trimmed);
  if (containsHebrew) {
    for (const family of colorFamilies) {
      if (family.displayName && family.displayName === trimmed) {
        return { 
          family: family.family, 
          variant: family.variants?.[0], 
          method: 'name', 
          score: null 
        };
      }
    }
  }

  // ============================================================================
  // Step 3: English name match
  // ============================================================================
  const lowerTrimmed = trimmed.toLowerCase();
  for (const family of colorFamilies) {
    // Check family name directly
    if (family.family.toLowerCase() === lowerTrimmed) {
      return { 
        family: family.family, 
        variant: family.variants?.[0], 
        method: 'name', 
        score: null 
      };
    }
    // Check variant names
    for (const variant of family.variants || []) {
      if (variant.name && variant.name.toLowerCase() === lowerTrimmed) {
        return { 
          family: family.family, 
          variant, 
          method: 'name', 
          score: null 
        };
      }
    }
  }

  // ============================================================================
  // Step 4: Fuzzy matching using CIE Lab deltaE
  // ============================================================================
  if (normalizedHex) {
    const inputLab = hexToLab(normalizedHex);
    if (inputLab) {
      let best: { family: string | null; variant: ColorVariant | undefined; dist: number } = { 
        family: null, 
        variant: undefined, 
        dist: Number.POSITIVE_INFINITY 
      };

      for (const family of colorFamilies) {
        // Check against all variants in the family, not just the first one
        for (const variant of family.variants || []) {
          if (!variant.hex) continue;
          
          const variantLab = hexToLab(variant.hex);
          if (!variantLab) continue;
          
          const distance = deltaE(inputLab, variantLab);
          if (distance < best.dist) {
            best = { family: family.family, variant, dist: distance };
          }
        }
      }

      if (best.family && best.dist <= threshold) {
        return { 
          family: best.family, 
          variant: best.variant, 
          method: 'fuzzy', 
          score: Math.round(best.dist) 
        };
      }
    }
  }

  return { family: null, method: 'none', score: null };
}

/**
 * Auto-assign colorFamily to a SKU document
 * Called from pre-save hook
 * 
 * @param doc - SKU document being saved
 * @returns true if colorFamily was assigned, false otherwise
 */
export function autoAssignColorFamily(doc: {
  color?: string;
  colorFamily?: string;
  colorFamilySource?: 'auto' | 'manual' | 'import';
}): boolean {
  // Skip if manually set
  if (doc.colorFamilySource === 'manual') {
    return false;
  }

  // Skip if no color defined
  if (!doc.color) {
    return false;
  }

  // Skip if colorFamily already set and color hasn't changed
  // (This check is done at pre-save level, color change is detected by isModified)
  
  const detection = detectColorFamily(doc.color);
  
  if (detection.family) {
    doc.colorFamily = detection.family;
    doc.colorFamilySource = 'auto';
    return true;
  }

  return false;
}

export default {
  detectColorFamily,
  autoAssignColorFamily,
  clearColorFamiliesCache,
};
