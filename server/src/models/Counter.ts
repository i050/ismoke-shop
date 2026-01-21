import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * ממשק Counter - מונה מספרים סידוריים עבור SKUs
 * משמש למתן מספר סידורי ייחודי לכל SKU
 */
export interface ICounter extends Document {
  name: string; // שם המונה (לדוגמה: "sku_counter")
  value: number; // הערך הנוכחי של המונה
}

/**
 * ממשק המודל עם המתודות הסטטיות
 */
export interface ICounterModel extends Model<ICounter> {
  getNextSequence(counterName: string): Promise<number>;
}

/**
 * סכמת Counter
 */
const CounterSchema = new Schema<ICounter>(
  {
    // שם המונה - ייחודי
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // הערך הנוכחי של המונה
    value: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'counters',
  }
);

/**
 * Static Method: קבלת המספר הסידורי הבא
 * משתמש ב-findOneAndUpdate אטומי למניעת race conditions
 * 
 * @param counterName - שם המונה
 * @returns המספר הסידורי הבא
 */
CounterSchema.statics.getNextSequence = async function (
  counterName: string
): Promise<number> {
  // שימוש ב-findOneAndUpdate אטומי - מבטיח שאין race conditions
  const counter = await this.findOneAndUpdate(
    { name: counterName },
    { $inc: { value: 1 } }, // הגדלת הערך ב-1
    {
      new: true, // החזרת המסמך המעודכן
      upsert: true, // יצירת מסמך חדש אם לא קיים
    }
  );

  return counter.value;
};

/**
 * יצירת והחזרת המודל
 */
const Counter = mongoose.model<ICounter, ICounterModel>('Counter', CounterSchema);

export default Counter;
