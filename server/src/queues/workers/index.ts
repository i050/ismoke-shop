/**
 * Workers Index
 * =============
 * ייצוא מרוכז של כל ה-Workers
 * ופונקציות להפעלה/כיבוי
 */

import { startPaymentWorker, stopPaymentWorker } from './paymentWorker';
import { startEmailWorker, stopEmailWorker } from './emailWorker';
import { startInventoryWorker, stopInventoryWorker } from './inventoryWorker';
import { startOrderWorker, stopOrderWorker } from './orderWorker';
import { logger } from '../../utils/logger';

// =============================================================================
// הפעלת כל ה-Workers
// =============================================================================

export function startAllWorkers(): void {
  logger.info('🚀 מפעיל את כל ה-Workers...');
  
  try {
    startPaymentWorker();
    startEmailWorker();
    startInventoryWorker();
    startOrderWorker();
    
    logger.info('✅ כל ה-Workers הופעלו בהצלחה');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    logger.error('❌ שגיאה בהפעלת Workers', { error: errorMessage });
    throw error;
  }
}

// =============================================================================
// כיבוי כל ה-Workers
// =============================================================================

export async function stopAllWorkers(): Promise<void> {
  logger.info('🔌 מכבה את כל ה-Workers...');
  
  try {
    await Promise.all([
      stopPaymentWorker(),
      stopEmailWorker(),
      stopInventoryWorker(),
      stopOrderWorker()
    ]);
    
    logger.info('✅ כל ה-Workers נעצרו בהצלחה');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    logger.error('❌ שגיאה בכיבוי Workers', { error: errorMessage });
    throw error;
  }
}

// =============================================================================
// ייצוא פרטני
// =============================================================================

export {
  startPaymentWorker,
  stopPaymentWorker,
  startEmailWorker,
  stopEmailWorker,
  startInventoryWorker,
  stopInventoryWorker,
  startOrderWorker,
  stopOrderWorker
};
