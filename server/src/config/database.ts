import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in the environment variables');
      process.exit(1);
    }
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in log

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database name: ${conn.connection.name}`);
  } catch (error) {
    // הדפסת שגיאה מפורטת כדי לאפשר דיבוג מהיר של בעיות חיבור
    console.error('❌ MongoDB connection FAILED:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('An unknown error occurred while connecting to MongoDB', error);
    }
    // הגדלת זמן חיפוש לשגיאות עתידיות והיציאה עם קוד שגיאה
    console.error('🔴 Exiting due to MongoDB connection failure');
    process.exit(1);
  }
};

export default connectDB;
