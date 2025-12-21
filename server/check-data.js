const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ecommerce').then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // בדוק קבוצות לקוחות
  const groupsCount = await mongoose.connection.db.collection('customergroups').countDocuments();
  console.log('📊 Customer Groups Count:', groupsCount);
  
  if (groupsCount > 0) {
    const groups = await mongoose.connection.db.collection('customergroups').find({}).limit(3).toArray();
    console.log('Sample Groups:', JSON.stringify(groups, null, 2));
  }
  
  // בדוק משתמשים עם customerGroupId
  const usersWithGroup = await mongoose.connection.db.collection('users').countDocuments({
    customerGroupId: { $exists: true, $ne: null }
  });
  console.log('👥 Users with customerGroupId:', usersWithGroup);
  
  // בדוק משתמשים ללא customerGroupId
  const usersWithoutGroup = await mongoose.connection.db.collection('users').countDocuments({
    $or: [
      { customerGroupId: null },
      { customerGroupId: { $exists: false } }
    ]
  });
  console.log('👥 Users without customerGroupId:', usersWithoutGroup);
  
  // בדוק הזמנות
  const ordersCount = await mongoose.connection.db.collection('orders').countDocuments();
  console.log('📦 Total Orders:', ordersCount);
  
  // בדוק הזמנות משולמות
  const paidOrders = await mongoose.connection.db.collection('orders').countDocuments({
    paymentStatus: 'paid'
  });
  console.log('💰 Paid Orders:', paidOrders);
  
  // בדוק דוגמא של הזמנה
  const sample = await mongoose.connection.db.collection('orders').findOne();
  if (sample) {
    console.log('\n📋 Sample Order (first 5 fields):');
    const keys = Object.keys(sample).slice(0, 5);
    keys.forEach(k => {
      console.log(`  ${k}: ${JSON.stringify(sample[k])}`);
    });
  }
  
  process.exit(0);
}).catch(e => {
  console.error('❌ Connection error:', e.message);
  process.exit(1);
});
