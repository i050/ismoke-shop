/**
 * buildQuery
 * ממיר את מצב הסינון (FiltersState) למחרוזת Query לשימוש ב-URL או בקריאת API.
 * למה חשוב? שומר על לוגיקה מרוכזת במקום אחד → פחות באגים ופחות שכפול קוד.
 */
import type { FiltersState } from '../types/filters';

/**
 * Cache פשוט ל-buildQuery — שומר מפתח יציב של הפילטרים יחד עם המחרוזת שנוצרה.
 * כך נמנע עבודה מיותרת (stringify / join) כשאותם פילטרים נשארים ללא שינוי.
 */
let _lastKey: string | null = null;
let _lastResult: string | null = null;

function makeStableKey(params: FiltersState): string {
  // בונים אובייקט מצומצם רק עם השדות הרלוונטיים ונמיינים categoryIds
  const keyObj = {
    sort: params.sort || null,
    priceMin: params.price?.min ?? null,
    priceMax: params.price?.max ?? null,
    categoryIds: (params.categoryIds && params.categoryIds.length > 0) ? [...params.categoryIds].sort() : null,
    attributes: params.attributes && Object.keys(params.attributes).length > 0 
      ? Object.entries(params.attributes)
          .sort(([a], [b]) => a.localeCompare(b)) // מיון לפי keys
          .map(([key, values]) => [key, [...values].sort()]) // מיון ערכים
      : null,
    page: params.page ?? null,
    pageSize: params.pageSize ?? null,
  };
  return JSON.stringify(keyObj);
}

/**
 * @param params מצב הפילטרים הנוכחי
 * @returns מחרוזת שמתחילה ב-? או מחרוזת ריקה אם אין פרמטרים רלוונטיים
 */
export function buildQuery(params: FiltersState): string {
  // מפתח יציב לפילטרים הנוכחיים
  const key = makeStableKey(params);
  if (_lastKey === key && _lastResult != null) {
    // אם הפילטרים זהים ל-lastKey, נחזיר ישירות את התוצאה השמורה
    return _lastResult;
  }

  // אחרת נחשב את המחרוזת ונשמור אותה ב-cache למפגש הבא
  const qp: string[] = [];

  if (params.sort) {
    qp.push(`sort=${encodeURIComponent(params.sort)}`);
  }

  if (params.price.min != null) {
    qp.push(`priceMin=${params.price.min}`);
  }

  if (params.price.max != null) {
    qp.push(`priceMax=${params.price.max}`);
  }

  if (params.categoryIds && params.categoryIds.length > 0) {
    // צמצום – מיינים ומצטרפים ב-',' כדי להבטיח יציבות מחרוזת
    const sorted = [...params.categoryIds].sort();
    qp.push(`categoryIds=${encodeURIComponent(sorted.join(','))}`);
  }

  // הוספת מאפיינים דינמיים (צבע, גודל, חומר וכו')
  // כל מאפיין הופך ל-query param: colorFamily=red,blue&size=M,L
  if (params.attributes && Object.keys(params.attributes).length > 0) {
    Object.entries(params.attributes)
      .sort(([a], [b]) => a.localeCompare(b)) // מיון לפי שם המאפיין
      .forEach(([key, values]) => {
        if (values && values.length > 0) {
          const sortedValues = [...values].sort().join(',');
          qp.push(`${encodeURIComponent(key)}=${encodeURIComponent(sortedValues)}`);
        }
      });
  }

  if (params.page && params.page > 1) {
    qp.push(`page=${params.page}`);
  }

  if (params.pageSize && params.pageSize !== 20) {
    qp.push(`pageSize=${params.pageSize}`);
  }

  const result = qp.length ? `?${qp.join('&')}` : '';
  _lastKey = key;
  _lastResult = result;
  return result;
}
