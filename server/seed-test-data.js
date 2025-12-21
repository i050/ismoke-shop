const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ecommerce').then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // יצירת קבוצות לקוחות
  const groupsCollection = mongoose.connection.db.collection('customergroups');
  const groupIds = [];
  
  const groups = [
    { name: 'VIP', priority: 1, isActive: true, createdAt: new Date() },
    { name: 'רגילה', priority: 2, isActive: true, createdAt: new Date() },
    { name: 'מנוי', priority: 3, isActive: true, createdAt: new Date() }
  ];
  
  for (const group of groups) {
    const result = await groupsCollection.insertOne(group);
    groupIds.push(result.insertedId);
    console.log(`✅ Created group: ${group.name}`);
  }
  
  // יצירת משתמשים עם קבוצות
  const usersCollection = mongoose.connection.db.collection('users');
  const userIds = [];
  
  const users = [
    { name: 'VIP User 1', email: 'vip1@test.com', customerGroupId: groupIds[0], isActive: true, createdAt: new Date() },
    { name: 'VIP User 2', email: 'vip2@test.com', customerGroupId: groupIds[0], isActive: true, createdAt: new Date() },
    { name: 'Regular User 1', email: 'regular1@test.com', customerGroupId: groupIds[1], isActive: true, createdAt: new Date() },
    { name: 'Subscriber User 1', email: 'sub1@test.com', customerGroupId: groupIds[2], isActive: true, createdAt: new Date() },
    { name: 'No Group User', email: 'nogroup@test.com', isActive: true, createdAt: new Date() }
  ];
  
  for (const user of users) {
    const result = await usersCollection.insertOne(user);
    userIds.push(result.insertedId);
    console.log(`✅ Created user: ${user.name}`);
  }
  
  // יצירת הזמנות
  const ordersCollection = mongoose.connection.db.collection('orders');
  
  const orders = [
    // הזמנות מ-VIP
    { userId: userIds[0], total: 5000, paymentStatus: 'paid', status: 'delivered', createdAt: new Date('2024-01-15') },
    { userId: userIds[0], total: 3500, paymentStatus: 'paid', status: 'delivered', createdAt: new Date('2024-01-20') },
    { userId: userIds[1], total: 7200, paymentStatus: 'paid', status: 'delivered', createdAt: new Date('2024-02-01') },
    // הזמנות מ-Regular
    { userId: userIds[2], total: 2000, paymentStatus: 'paid', status: 'delivered', createdAt: new Date('2024-01-25') },
    { userId: userIds[2], total: 1500, paymentStatus: 'paid', status: 'processing', createdAt: new Date('2024-02-10') },
    // הזמנות מ-Subscriber
    { userId: userIds[3], total: 3000, paymentStatus: 'paid', status: 'shipped', createdAt: new Date('2024-02-05') },
    // הזמנות ללא קבוצה
    { userId: userIds[4], total: 500, paymentStatus: 'paid', status: 'delivered', createdAt: new Date('2024-01-30') }
  ];
  
  for (const order of orders) {
    const result = await ordersCollection.insertOne(order);
    console.log(`✅ Created order with total: ${order.total}`);
  }
  
  console.log('\n📊 Summary:');
  console.log(`Total Groups: 3`);
  console.log(`Total Users: 5`);
  console.log(`Total Orders: 7`);
  console.log(`Total Revenue: ${orders.reduce((sum, o) => sum + o.total, 0)}`);
  
  process.exit(0);
}).catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
