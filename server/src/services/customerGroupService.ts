import CustomerGroup, { ICustomerGroup } from '../models/CustomerGroup';
import User from '../models/User';
import mongoose from 'mongoose';

export interface IGroupStats {
  groupId: string;
  userCount: number;
  totalSales: number;
  averageOrderValue: number;
}

export interface IGroupEligibility {
  isEligible: boolean;
  currentAmount: number;
  requiredAmount: number;
  currentOrders: number;
  requiredOrders: number;
  missingRequirements: string[];
}

export interface IRecommendedGroup {
  group: ICustomerGroup;
  progress: number;
  missingAmount: number;
  missingOrders: number;
}

class CustomerGroupService {
  // פונקציות בסיסיות (CRUD)

  /**
   * מביא את כל קבוצות הלקוח הפעילות, ממוינות לפי עדיפות
   */
  async getAllGroups(): Promise<ICustomerGroup[]> {
    try {
      const groups = await CustomerGroup.find({ isActive: true })
        .sort({ priority: -1 })
        .lean();

      return groups;
    } catch (error: any) {
      throw new Error('שגיאה בטעינת קבוצות הלקוח');
    }
  }

  /**
   * מביא קבוצה ספציפית לפי מזהה
   */
  async getGroupById(id: string): Promise<ICustomerGroup> {
    try {
      const group = await CustomerGroup.findById(id).lean();

      if (!group) {
        throw new Error('קבוצת לקוח לא נמצאה');
      }

      return group;
    } catch (error: any) {
      if (error.message === 'קבוצת לקוח לא נמצאה') {
        throw error;
      }
      throw new Error('שגיאה בטעינת קבוצת הלקוח');
    }
  }

  /**
   * יוצר קבוצה חדשה עם ולידציה ובדיקת כפילויות
   */
  async createGroup(groupData: Partial<ICustomerGroup>): Promise<ICustomerGroup> {
    try {
      // ולידציה של הנתונים
      const validationErrors = this.validateGroupData(groupData);
      if (validationErrors.length > 0) {
        throw new Error(`נתונים לא תקינים: ${validationErrors.join(', ')}`);
      }

      // בדיקת כפילות שם
      await this.checkDuplicateName(groupData.name!);

      // יצירת הקבוצה
      const group = new CustomerGroup({
        ...groupData,
        isActive: groupData.isActive ?? true,
        priority: groupData.priority ?? 0,
        discountPercentage: groupData.discountPercentage ?? 0,
        taxRate: groupData.taxRate ?? 17
      });

      await group.save();
      return group;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * מעדכן קבוצה קיימת עם ולידציה
   */
  async updateGroup(id: string, updateData: Partial<ICustomerGroup>): Promise<ICustomerGroup> {
    try {
      // בדיקה שהקבוצה קיימת
  const existingGroup = await CustomerGroup.findById(id).lean<ICustomerGroup>(); // שימוש ב-lean לשאילת בדיקת קיום בלבד ללא צורך במסמך כבד
      if (!existingGroup) {
        throw new Error('קבוצת לקוח לא נמצאה');
      }

      // ולידציה של הנתונים
      const validationErrors = this.validateGroupData(updateData);
      if (validationErrors.length > 0) {
        throw new Error(`נתונים לא תקינים: ${validationErrors.join(', ')}`);
      }

      // בדיקת כפילות שם (מלבד הקבוצה הנוכחית)
      if (updateData.name) {
        await this.checkDuplicateName(updateData.name, id);
      }

      // עדכון הקבוצה
      const updatedGroup = await CustomerGroup.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedGroup!;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * מוחק קבוצה עם בדיקת תלות
   */
  async deleteGroup(id: string): Promise<void> {
    try {
      // בדיקה שהקבוצה קיימת
  const group = await CustomerGroup.findById(id).lean<ICustomerGroup>(); // lean חוסך משאבים כשנדרשת רק בדיקת קיום ופירוט
      if (!group) {
        throw new Error('קבוצת לקוח לא נמצאה');
      }

      // בדיקת תלות - האם יש משתמשים שמשתמשים בקבוצה הזו
      const usersInGroup = await this.getUsersInGroup(id);
      if (usersInGroup.length > 0) {
        const userNames = usersInGroup.map(user => user.firstName + ' ' + user.lastName).join(', ');
        throw new Error(`לא ניתן למחוק קבוצה שיש לה משתמשים: ${userNames}`);
      }

      // מחיקת הקבוצה
      await CustomerGroup.findByIdAndDelete(id);
    } catch (error: any) {
      throw error;
    }
  }

  // פונקציות מתקדמות

  /**
   * מביא קבוצות עם סטטיסטיקות
   */
  async getGroupsWithStats(): Promise<IGroupStats[]> {
    try {
  const groups = await CustomerGroup.find({ isActive: true }).lean<ICustomerGroup[]>(); // lean כי נבצע חישובי סטטיסטיקה על נתונים שטוחים בלבד

      const statsPromises = groups.map(async (group) => {
        const userCount = await User.countDocuments({ customerGroupId: group._id as any });

        // חישוב סטטיסטיקות מכירות (יוטמע בעתיד עם מודל Order)
        const totalSales = 0; // זמני
        const averageOrderValue = 0; // זמני

        return {
          groupId: (group._id as any).toString(),
          userCount,
          totalSales,
          averageOrderValue
        };
      });

      const stats = await Promise.all(statsPromises);
      return stats;
    } catch (error: any) {
      throw new Error('שגיאה בטעינת סטטיסטיקות קבוצות');
    }
  }

  /**
   * מחשב הנחה למשתמש על מוצר
   */
  async calculateDiscount(userId: string, productPrice: number): Promise<number> {
    try {
      const user = await User.findById(userId).populate('customerGroupId');
      if (!user || !user.customerGroupId) {
        return 0; // אין קבוצה - אין הנחה
      }

      const group = user.customerGroupId as unknown as ICustomerGroup;
      if (!group.isActive) {
        return 0; // קבוצה לא פעילה
      }

      // חישוב ההנחה
      const discountAmount = (productPrice * group.discountPercentage) / 100;
      return Math.round(discountAmount * 100) / 100; // עיגול לשני ספרות אחרי הנקודה
    } catch (error: any) {
      console.error('שגיאה בחישוב הנחה:', error);
      return 0;
    }
  }

  /**
   * בודק אם משתמש זכאי לקבוצה מסוימת
   */
  async checkGroupEligibility(userId: string, groupId: string): Promise<IGroupEligibility> {
    try {
      const [user, group] = await Promise.all([
        User.findById(userId).lean(), // lean מספק אובייקט בסיסי לבדיקות זכאות בלי פעולות שמירה
        CustomerGroup.findById(groupId).lean<ICustomerGroup>()
      ]);

      if (!user) {
        throw new Error('משתמש לא נמצא');
      }

      if (!group) {
        throw new Error('קבוצת לקוח לא נמצאה');
      }

      const eligibility: IGroupEligibility = {
        isEligible: true,
        currentAmount: 0, // יוטמע עם מודל Order
        requiredAmount: group.conditions?.minOrderAmount || 0,
        currentOrders: 0, // יוטמע עם מודל Order
        requiredOrders: group.conditions?.minOrdersCount || 0,
        missingRequirements: []
      };

      // בדיקת תנאי סכום הזמנות
      if (eligibility.currentAmount < eligibility.requiredAmount) {
        eligibility.isEligible = false;
        eligibility.missingRequirements.push(
          `חסר ${(eligibility.requiredAmount - eligibility.currentAmount).toLocaleString()}₪ מסכום הזמנות`
        );
      }

      // בדיקת תנאי מספר הזמנות
      if (eligibility.currentOrders < eligibility.requiredOrders) {
        eligibility.isEligible = false;
        eligibility.missingRequirements.push(
          `חסרות ${eligibility.requiredOrders - eligibility.currentOrders} הזמנות`
        );
      }

      return eligibility;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * מציע קבוצות מתאימות למשתמש
   */
  async getRecommendedGroups(userId: string): Promise<IRecommendedGroup[]> {
    try {
  const user = await User.findById(userId).lean(); // lean כדי לקבל נתוני משתמש בסיסיים ללא מסמך כבד
      if (!user) {
        throw new Error('משתמש לא נמצא');
      }

      const allGroups = await CustomerGroup.find({ isActive: true })
        .sort({ priority: -1 })
        .lean<ICustomerGroup[]>(); // lean משום שאנחנו רק מחשבים המלצות ולא משנים את המסמך

      const recommendations: IRecommendedGroup[] = [];

      for (const group of allGroups) {
        // דלג על קבוצת המשתמש הנוכחית
        if (user.customerGroupId && user.customerGroupId.toString() === (group._id as any).toString()) {
          continue;
        }

        const eligibility = await this.checkGroupEligibility(userId, (group._id as any).toString());

        if (!eligibility.isEligible) {
          // חישוב אחוז התקדמות
          let progress = 0;
          if (eligibility.requiredAmount > 0) {
            progress = (eligibility.currentAmount / eligibility.requiredAmount) * 100;
          } else if (eligibility.requiredOrders > 0) {
            progress = (eligibility.currentOrders / eligibility.requiredOrders) * 100;
          }

          recommendations.push({
            group,
            progress: Math.min(progress, 100),
            missingAmount: Math.max(0, eligibility.requiredAmount - eligibility.currentAmount),
            missingOrders: Math.max(0, eligibility.requiredOrders - eligibility.currentOrders)
          });
        }
      }

      // מיון לפי התקדמות (מהגבוה לנמוך)
      return recommendations.sort((a, b) => b.progress - a.progress);
    } catch (error: any) {
      throw error;
    }
  }

  // פונקציות עזר

  /**
   * ולידציה של נתוני קבוצה
   */
  private validateGroupData(data: Partial<ICustomerGroup>): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('שם הקבוצה הוא שדה חובה');
    }

    if (data.name && data.name.length > 50) {
      errors.push('שם הקבוצה לא יכול להיות ארוך מ-50 תווים');
    }

    if (data.discountPercentage !== undefined &&
        (data.discountPercentage < 0 || data.discountPercentage > 100)) {
      errors.push('אחוז ההנחה חייב להיות בין 0 ל-100');
    }

    if (data.priority !== undefined && data.priority < 0) {
      errors.push('עדיפות חייבת להיות מספר חיובי');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      errors.push('צבע חייב להיות בפורמט hex תקין (#RRGGBB)');
    }

    return errors;
  }

  /**
   * בדיקת כפילות שם קבוצה
   */
  private async checkDuplicateName(name: string, excludeId?: string): Promise<void> {
    const query: any = { name: name.trim() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

  const existingGroup = await CustomerGroup.findOne(query).lean(); // lean בשאילתת ולידציה למניעת שליפת דוקומנט מלא
    if (existingGroup) {
      throw new Error(`קבוצה עם השם "${name}" כבר קיימת`);
    }
  }

  /**
   * מביא את כל המשתמשים בקבוצה
   */
  private async getUsersInGroup(groupId: string): Promise<any[]> {
    try {
      const users = await User.find({ customerGroupId: new mongoose.Types.ObjectId(groupId) })
        .select('firstName lastName email')
        .lean();

      return users;
    } catch (error: any) {
      throw new Error('שגיאה בטעינת משתמשי הקבוצה');
    }
  }

  /**
   * מעביר משתמש לקבוצה אחרת
   */
  async assignUserToGroup(userId: string, groupId: string): Promise<void> {
    try {
      // בדיקה שהמשתמש קיים
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('משתמש לא נמצא');
      }

      // בדיקה שהקבוצה קיימת ופעילה
      const group = await CustomerGroup.findById(groupId);
      if (!group) {
        throw new Error('קבוצת לקוח לא נמצאה');
      }

      if (!group.isActive) {
        throw new Error('קבוצת לקוח אינה פעילה');
      }

      // עדכון הקבוצה של המשתמש
      user.customerGroupId = new mongoose.Types.ObjectId(groupId);
      await user.save();

    } catch (error: any) {
      throw new Error(`שגיאה בהעברת משתמש לקבוצה: ${error.message}`);
    }
  }
}

export default new CustomerGroupService();
