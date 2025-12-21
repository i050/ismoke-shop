import { Request, Response } from 'express';
import { getIO } from '../socket';
import CustomerGroup, { ICustomerGroup } from '../models/CustomerGroup';
import User from '../models/User';
import customerGroupService from '../services/customerGroupService';
import mongoose from 'mongoose';

// הגדרת ממשקים
interface CreateCustomerGroupRequest {
  name: string;
  discountPercentage: number;
  color: string;
  description?: string;
  priority?: number;
  conditions?: {
    minOrderAmount?: number;
    minOrdersCount?: number;
  };
}

interface UpdateCustomerGroupRequest extends Partial<CreateCustomerGroupRequest> {
  isActive?: boolean;
}

// קבלת כל קבוצות הלקוח
export const getCustomerGroups = async (req: Request, res: Response) => {
  try {
    const { activeOnly = 'false' } = req.query;

    const query = activeOnly === 'true' ? { isActive: true } : {};
    const groups = await CustomerGroup.find(query).sort({ priority: -1, name: 1 }).lean();

    // חישוב מספר החברים לכל קבוצה
    const groupsWithMembersCount = await Promise.all(
      groups.map(async (group) => {
        const membersCount = await User.countDocuments({ customerGroupId: group._id });
        return {
          ...group,
          membersCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        groups: groupsWithMembersCount,
        count: groupsWithMembersCount.length
      }
    });

  } catch (error) {
    console.error('Get customer groups error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת קבוצות הלקוח'
    });
  }
};

// קבלת קבוצת לקוח לפי ID
export const getCustomerGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const group = await CustomerGroup.findById(id).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה'
      });
    }

    res.json({
      success: true,
      data: group
    });

  } catch (error) {
    console.error('Get customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת קבוצת הלקוח'
    });
  }
};

// יצירת קבוצת לקוח חדשה
export const createCustomerGroup = async (req: Request<{}, {}, CreateCustomerGroupRequest>, res: Response) => {
  try {
    const { name, discountPercentage, color, description, priority, conditions } = req.body;

    // בדיקת שדות חובה
    if (!name || discountPercentage === undefined || !color) {
      return res.status(400).json({
        success: false,
        message: 'שם הקבוצה, אחוז ההנחה וצבע הם שדות חובה'
      });
    }

    // בדיקת שם קיים
    const existingGroup = await CustomerGroup.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'שם קבוצה זה כבר קיים במערכת'
      });
    }

    // יצירת קבוצה חדשה
    const group = new CustomerGroup({
      name: name.trim(),
      discountPercentage,
      color: color.trim(),
      description: description?.trim(),
      priority: priority || 0,
      conditions,
      // השימוש בtemporary ID עד שיהיה לנו auth middleware
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      updatedBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      showGroupMembership: true,
      showOriginalPrice: true
    });

    await group.save();

    // החזרת נתונים מלאים עם כל השדות הנחוצים
    const fullGroup = await CustomerGroup.findById(group._id).lean();
    
    if (!fullGroup) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת נתוני הקבוצה החדשה'
      });
    }
    
    // הוספת userCount (virtual field) ידנית
    const groupWithCount = {
      ...fullGroup,
      userCount: await User.countDocuments({ customerGroupId: fullGroup._id })
    };

    res.status(201).json({
      success: true,
      message: 'קבוצת הלקוח נוצרה בהצלחה',
      data: groupWithCount
    });
    // שידור עדכון לכל הלקוחות
    getIO().emit('groupUpdated');

  } catch (error) {
    console.error('Create customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת קבוצת הלקוח'
    });
  }
};

// עדכון קבוצת לקוח
export const updateCustomerGroup = async (req: Request<{ id: string }, {}, UpdateCustomerGroupRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // בדיקת שם קיים (אם משנים שם)
    if (updateData.name) {
      const existingGroup = await CustomerGroup.findOne({
        name: updateData.name.trim(),
        _id: { $ne: id }
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'שם קבוצה זה כבר קיים במערכת'
        });
      }

      updateData.name = updateData.name.trim();
    }

    // ניקוי שדות ריקים
    if (updateData.description !== undefined) {
      updateData.description = updateData.description?.trim() || undefined;
    }

    if (updateData.color !== undefined) {
      updateData.color = updateData.color?.trim();
    }

    // הוספת updatedBy לכל עדכון
    (updateData as any).updatedBy = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    const group = await CustomerGroup.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה'
      });
    }

    res.json({
      success: true,
      message: 'קבוצת הלקוח עודכנה בהצלחה',
      data: group
    });
    // שידור עדכון לכל הלקוחות
    getIO().emit('groupUpdated');

  } catch (error) {
    console.error('Update customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון קבוצת הלקוח'
    });
  }
};

// בדיקה לפני מחיקת קבוצת לקוח - מחזיר מידע למודל אזהרה
// מטרה: לבדוק אם אפשר למחוק וליתן מידע לקליינט להחלטה
// אם יש משתמשים - מחזיר מידע למודל אזהרה, אם אין - מוחק מיד
export const deleteCustomerGroup = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // שלב 1: מציאת הקבוצה
    // מטרה: לוודא שהקבוצה קיימת ולקבל את הפרטים שלה
    const group = await CustomerGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה'
      });
    }

    // שלב 2: ספירת המשתמשים בקבוצה
    // מטרה: לדעת כמה משתמשים יושפעו מהמחיקה
    const usersCount = await User.countDocuments({ customerGroupId: new mongoose.Types.ObjectId(id) });

    // שלב 3: אם יש משתמשים - החזרת מידע למודל אזהרה
    // מטרה: לתת לקליינט את כל המידע הנחוץ להצגת מודל אזהרה דינמי
    if (usersCount > 0) {
      return res.status(409).json({ // 409 = Conflict - יש התנגשות שדורשת החלטת משתמש
        success: false,
        requiresConfirmation: true, // סימן לקליינט שצריך מודל אזהרה
        groupInfo: {
          name: group.name, // שם הקבוצה למודל האזהרה
          membersCount: usersCount, // מספר המשתמשים שיושפעו 
          discountPercentage: group.discountPercentage // אחוז ההנחה שיאבד
        },
        // הודעה דינמית בדיוק כמו שביקשת
        message: `אם תמחק את הקבוצה '${group.name}', כל ${usersCount} המשתמשים בקבוצה יאבדו את ההנחה של ${group.discountPercentage}% ויהפכו ללקוחות רגילים`
      });
    }

    // שלב 4: אם אין משתמשים - מחיקה רגילה מיידית
    // מטרה: לטפל במקרה הפשוט של קבוצה ריקה
    await CustomerGroup.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'קבוצת הלקוח נמחקה בהצלחה'
    });
    // שידור עדכון לכל הלקוחות
    getIO().emit('groupUpdated');

  } catch (error) {
    console.error('Delete customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת קבוצת הלקוח'
    });
  }
};

// מחיקת קבוצת לקוח בכוח - כולל הסרת המשתמשים מהקבוצה
// מטרה: לאפשר למנהל למחוק קבוצה גם כשיש בה משתמשים
// פעולות: 1) מוחק את הקבוצה 2) מסיר את כל המשתמשים מהקבוצה (הופך אותם לרגילים)
export const forceDeleteCustomerGroup = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // שלב 1: מציאת הקבוצה וספירת המשתמשים
    // מטרה: לקבל מידע על הקבוצה לפני המחיקה כדי להציג הודעה מדויקת
    const group = await CustomerGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה'
      });
    }

    const usersCount = await User.countDocuments({ customerGroupId: new mongoose.Types.ObjectId(id) });

    // שלב 2: הסרת כל המשתמשים מהקבוצה
    // מטרה: לעדכן את המשתמשים שהם כבר לא בקבוצה (הופכים לרגילים)
    if (usersCount > 0) {
      await User.updateMany(
        { customerGroupId: new mongoose.Types.ObjectId(id) },
        { $unset: { customerGroupId: 1 } } // מסיר את השדה customerGroupId מהמשתמשים
      );
    }

    // שלב 3: מחיקת הקבוצה עצמה
    // מטרה: להסיר את הקבוצה לגמרי ממסד הנתונים
    await CustomerGroup.findByIdAndDelete(id);

    // שלב 4: החזרת הודעת הצלחה עם פרטים
    // מטרה: להודיע למנהל בדיוק מה קרה ולכמה משתמשים
    res.json({
      success: true,
      message: `הקבוצה "${group.name}" נמחקה בהצלחה. ${usersCount} משתמשים הוסרו מהקבוצה והפכו ללקוחות רגילים.`,
      data: {
        deletedGroup: group.name,
        affectedUsersCount: usersCount
      }
    });
    // שידור עדכון לכל הלקוחות
    getIO().emit('groupUpdated');

  } catch (error) {
    console.error('Force delete customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת קבוצת הלקוח'
    });
  }
};

// הפעלה/השבתה של קבוצת לקוח
export const toggleCustomerGroup = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const group = await CustomerGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה'
      });
    }

    group.isActive = !group.isActive;
    await group.save();

    // Get the full group data with virtual fields
    const updatedGroup = await CustomerGroup.findById(group._id).lean();

    res.json({
      success: true,
      message: `קבוצת הלקוח ${group.isActive ? 'הופעלה' : 'הושבתה'} בהצלחה`,
      data: updatedGroup
    });

  } catch (error) {
    console.error('Toggle customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשינוי סטטוס קבוצת הלקוח'
    });
  }
};

// העברת משתמש לקבוצה אחרת
export const assignUserToGroup = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { groupId } = req.body;

    // בדיקת שדות חובה
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה קבוצה הוא חובה'
      });
    }

    // העברת המשתמש לקבוצה
    await customerGroupService.assignUserToGroup(userId, groupId);

    res.json({
      success: true,
      message: 'המשתמש הועבר לקבוצה בהצלחה'
    });

  } catch (error: any) {
    console.error('Assign user to group error:', error);

    // טיפול בשגיאות ספציפיות
    if (error.message.includes('משתמש לא נמצא')) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    if (error.message.includes('קבוצת לקוח לא נמצאה') || error.message.includes('אינה פעילה')) {
      return res.status(404).json({
        success: false,
        message: 'קבוצת לקוח לא נמצאה או אינה פעילה'
      });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה בהעברת משתמש לקבוצה'
    });
  }
};
