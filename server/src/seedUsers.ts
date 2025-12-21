import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import CustomerGroup from './models/CustomerGroup';
import argon2 from 'argon2';

// טעינת משתני סביבה
dotenv.config();

// קבוצות לקוחות לדוגמה
const sampleCustomerGroups = [
  {
    name: 'לקוחות רגילים',
    discountPercentage: 0,
    color: '#6B7280',
    description: 'קבוצת ברירת המחדל לכל הלקוחות',
    isActive: true,
    priority: 0
  },
  {
    name: 'VIP',
    discountPercentage: 10,
    color: '#F59E0B',
    description: 'לקוחות VIP עם הנחה של 10%',
    isActive: true,
    priority: 10,
    conditions: {
      minOrderAmount: 500
    }
  },
  {
    name: 'סיטונאים',
    discountPercentage: 20,
    color: '#10B981',
    description: 'לקוחות סיטונאים עם הנחה של 20%',
    isActive: true,
    priority: 20,
    conditions: {
      minOrderAmount: 1000,
      minOrdersCount: 5
    }
  },
  {
    name: 'לקוחות זהב',
    discountPercentage: 15,
    color: '#F97316',
    description: 'לקוחות ותיקים עם הנחה של 15%',
    isActive: true,
    priority: 15,
    conditions: {
      minOrdersCount: 10
    }
  }
];

// משתמשים לדוגמה
const sampleUsers = [
  // מנהלים
  {
    firstName: 'שרה',
    lastName: 'לוי',
    email: 'superadmin@example.com',
    password: 'SuperAdmin123!',
    phone: '050-7654321',
    role: 'super_admin' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },

  // לקוחות רגילים
  {
    firstName: 'יוסי',
    lastName: 'ישראלי',
    email: 'yossi@example.com',
    password: 'Password123!',
    phone: '052-1111111',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },
  {
    firstName: 'רחל',
    lastName: 'אברהם',
    email: 'rachel@example.com',
    password: 'Password123!',
    phone: '054-2222222',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },
  {
    firstName: 'מיכל',
    lastName: 'דוד',
    email: 'michal@example.com',
    password: 'Password123!',
    phone: '053-3333333',
    role: 'customer' as const,
    isActive: true,
    isVerified: false,
    loginAttempts: 0
  },

  // לקוחות VIP
  {
    firstName: 'אבי',
    lastName: 'גולד',
    email: 'avi@example.com',
    password: 'Password123!',
    phone: '055-4444444',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=avi',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },
  {
    firstName: 'נועה',
    lastName: 'סילבר',
    email: 'noa@example.com',
    password: 'Password123!',
    phone: '058-5555555',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },

  // לקוחות סיטונאים
  {
    firstName: 'אלון',
    lastName: 'ברק',
    email: 'alon@example.com',
    password: 'Password123!',
    phone: '050-6666666',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alon',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  },

  // משתמש עם חשבון נעול (לדוגמה)
  {
    firstName: 'טל',
    lastName: 'מור',
    email: 'tal@example.com',
    password: 'Password123!',
    phone: '052-7777777',
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 5,
    lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) // נעול ל-2 שעות
  },

  // משתמש לא פעיל
  {
    firstName: 'דני',
    lastName: 'רוזן',
    email: 'dani@example.com',
    password: 'Password123!',
    phone: '054-8888888',
    role: 'customer' as const,
    isActive: false,
    isVerified: true,
    loginAttempts: 0
  },

  // משתמש עם social login (ללא סיסמה)
  {
    firstName: 'ליאור',
    lastName: 'כץ',
    email: 'lior@gmail.com',
    phone: '053-9999999',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lior',
    providers: {
      google: {
        id: '123456789',
        email: 'lior@gmail.com',
        verified: true
      }
    },
    role: 'customer' as const,
    isActive: true,
    isVerified: true,
    loginAttempts: 0
  }
];

// פונקציה לזריעת הנתונים
const seedUsers = async () => {
  try {
    // התחברות ל-MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in the environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // ניקוי נתונים קיימים
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await CustomerGroup.deleteMany({});

    // יצירת משתמש אדמין ראשון (לשימוש ב-createdBy/updatedBy)
    console.log('Creating admin user...');
    const adminUser = new User({
      firstName: 'דוד',
      lastName: 'כהן',
      email: 'admin@example.com',
      password: await argon2.hash('Admin123!'),
      phone: '050-1234567',
      role: 'admin',
      isActive: true,
      isVerified: true,
      loginAttempts: 0
    });
    await adminUser.save();
    console.log('Admin user created');

    // יצירת קבוצות לקוחות עם createdBy/updatedBy
    console.log('Creating customer groups...');
    const groupsWithMetadata = sampleCustomerGroups.map(group => ({
      ...group,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }));
    
    const createdGroups = await CustomerGroup.insertMany(groupsWithMetadata);
    console.log(`Created ${createdGroups.length} customer groups`);

    // יצירת משתמשים עם הפניות לקבוצות
    console.log('Creating users...');

    // מציאת מזהי הקבוצות
    const regularGroup = createdGroups.find(g => g.name === 'לקוחות רגילים');
    const vipGroup = createdGroups.find(g => g.name === 'VIP');
    const wholesaleGroup = createdGroups.find(g => g.name === 'סיטונאים');
    const goldGroup = createdGroups.find(g => g.name === 'לקוחות זהב');

    // הוספת customerGroupId למשתמשים המתאימים
    const usersWithGroups = sampleUsers.map(user => ({
      ...user,
      customerGroupId: user.email === 'avi@example.com' ? vipGroup?._id :
                      user.email === 'noa@example.com' ? goldGroup?._id :
                      user.email === 'alon@example.com' ? wholesaleGroup?._id :
                      regularGroup?._id
    }));

    // Hash סיסמאות לפני שמירה
    console.log('Hashing passwords...');
    const usersWithHashedPasswords = await Promise.all(
      usersWithGroups.map(async (user) => {
        if (user.password) {
          const hashedPassword = await argon2.hash(user.password, {
            type: argon2.argon2id,
            memoryCost: 65536, // 64 MB
            timeCost: 3,
            parallelism: 4
          });
          return { ...user, password: hashedPassword };
        }
        return user;
      })
    );

    // יצירת המשתמשים
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`Created ${createdUsers.length} users`);

    // הדפסת סיכום
    console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
    console.log(`Customer Groups: ${createdGroups.length}`);
    console.log(`Users: ${createdUsers.length}`);

    console.log('\n=== ADMIN ACCOUNTS ===');
    const adminUsers = createdUsers.filter((u: any) => u.role !== 'customer');
    adminUsers.forEach((user: any) => {
      console.log(`- ${user.firstName} ${user.lastName}: ${user.email} (${user.role})`);
    });

    console.log('\n=== SAMPLE CUSTOMER ACCOUNTS ===');
    const customerUsers = createdUsers.filter((u: any) => u.role === 'customer');
    customerUsers.slice(0, 5).forEach((user: any) => {
      const group = createdGroups.find((g: any) => g._id.equals(user.customerGroupId));
      console.log(`- ${user.firstName} ${user.lastName}: ${user.email} (${group?.name || 'No Group'})`);
    });

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin: admin@example.com / Admin123!');
    console.log('Super Admin: superadmin@example.com / SuperAdmin123!');
    console.log('Customer: yossi@example.com / Password123!');
    console.log('VIP Customer: avi@example.com / Password123!');
    console.log('Wholesale: alon@example.com / Password123!');

    console.log('\n=== SPECIAL CASES ===');
    console.log('- Locked Account: tal@example.com (5 failed attempts)');
    console.log('- Inactive Account: dani@example.com');
    console.log('- Social Login: lior@gmail.com (no password needed)');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// הרצת הפונקציה
if (require.main === module) {
  seedUsers();
}

export default seedUsers;
