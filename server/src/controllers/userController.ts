// Controller לניהול משתמשים - משימה 2: שיוך לקוחות לקבוצות
// הרחבה: יצירת משתמש חדש ע"י מנהל, צפייה בסל קניות והיסטוריית הזמנות
import { Request, Response } from 'express';
import User from '../models/User';
import CustomerGroup from '../models/CustomerGroup';
import Cart from '../models/Cart';
import Order from '../models/Order';
import { getIO } from '../socket';
import {
  validateRequiredFields,
  validatePasswordLength,
  validateEmailFormat,
  validateEmailExists
} from '../utils/validationHelpers';

// GET /api/users - קבלת כל המשתמשים עם פילטרים
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      groupId,
      hasGroup,
      isActive,
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = req.query;

    // בניית פילטרים
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (groupId) {
      filter.customerGroupId = groupId;
    }

    if (hasGroup !== undefined) {
      if (hasGroup === 'true') {
        filter.customerGroupId = { $exists: true, $ne: null };
      } else {
        filter.$or = [
          { customerGroupId: { $exists: false } },
          { customerGroupId: null }
        ];
      }
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // מיון
    const sort: any = {};
    sort[sortBy as string] = sortDirection === 'asc' ? 1 : -1;

    // חישוב עימוד
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // שליפת נתונים
    const users = await User.find(filter)
      .populate('customerGroupId', 'name color discountPercentage')
      .select('firstName lastName email customerGroupId isActive createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ספירת סה"כ
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת המשתמשים',
      error: error.message
    });
  }
};

// GET /api/users/:userId/group - קבלת קבוצה של משתמש
export const getUserGroup = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('customerGroupId')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    res.json({
      success: true,
      data: user.customerGroupId
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת קבוצת המשתמש',
      error: error.message
    });
  }
};

// POST /api/users/:userId/assign - שיוך משתמש לקבוצה
export const assignUserToGroup = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { groupId } = req.body;

    // בדיקה שהמשתמש קיים
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // בדיקה שהקבוצה קיימת
    const group = await CustomerGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצה לא נמצאה'
      });
    }

    // שיוך המשתמש
    const updatedUser = await User.findByIdAndUpdate(userId, {
      customerGroupId: groupId
    }, { 
      new: true,
      populate: {
        path: 'customerGroupId',
        select: 'name color discountPercentage'
      }
    });

    res.json({
      success: true,
      message: `המשתמש שויך בהצלחה לקבוצת "${group.name}"`,
      data: updatedUser
    });
    // שידור עדכון לכל הדפדפנים
    getIO().emit('groupUpdated');

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשיוך המשתמש לקבוצה',
      error: error.message
    });
  }
};

// DELETE /api/users/:userId/group - הסרת משתמש מקבוצה
export const removeUserFromGroup = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // הסרת השיוך
    const updatedUser = await User.findByIdAndUpdate(userId, {
      $unset: { customerGroupId: 1 }
    }, { 
      new: true,
      populate: {
        path: 'customerGroupId',
        select: 'name color discountPercentage'
      }
    });

    res.json({
      success: true,
      message: 'המשתמש הוסר מהקבוצה בהצלחה',
      data: updatedUser
    });
    // שידור עדכון לכל הדפדפנים
    getIO().emit('groupUpdated');

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהסרת המשתמש מהקבוצה',
      error: error.message
    });
  }
};

// GET /api/users/groups/:groupId/members - קבלת חברי קבוצה
export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    // בדיקה שהקבוצה קיימת
    const group = await CustomerGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצה לא נמצאה'
      });
    }

    // שליפת חברי הקבוצה
    const members = await User.find({ customerGroupId: groupId })
      .select('firstName lastName email isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: members
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת חברי הקבוצה',
      error: error.message
    });
  }
};

// POST /api/users/bulk-assign - שיוך מרובה
export const bulkAssignUsers = async (req: Request, res: Response) => {
  try {
    const { userIds, groupId } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מערך של מזהי משתמשים'
      });
    }

    // בדיקה שהקבוצה קיימת
    const group = await CustomerGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'קבוצה לא נמצאה'
      });
    }

    // שיוך כל המשתמשים
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { customerGroupId: groupId }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} משתמשים שויכו לקבוצת "${group.name}"`
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשיוך מרובה',
      error: error.message
    });
  }
};

// POST /api/users/bulk-remove - הסרה מרובה
export const bulkRemoveUsers = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מערך של מזהי משתמשים'
      });
    }

    // הסרת השיוכים
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $unset: { customerGroupId: 1 } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} משתמשים הוסרו מהקבוצות`
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהסרה מרובה',
      error: error.message
    });
  }
};

// ==========================================
// POST /api/users - יצירת משתמש חדש ע"י מנהל
// ==========================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      role = 'customer',
      customerGroupId,
      isActive = true,
      sendWelcomeEmail = false 
    } = req.body;

    // ולידציה של שדות חובה
    const requiredFieldsError = validateRequiredFields(
      { firstName, lastName, email, password },
      ['firstName', 'lastName', 'email', 'password']
    );
    if (requiredFieldsError) {
      return res.status(400).json({
        success: false,
        message: requiredFieldsError
      });
    }

    // ולידציה של אורך סיסמה
    const passwordLengthError = validatePasswordLength(password);
    if (passwordLengthError) {
      return res.status(400).json({
        success: false,
        message: passwordLengthError
      });
    }

    // ולידציה של פורמט אימייל
    const emailFormatError = validateEmailFormat(email);
    if (emailFormatError) {
      return res.status(400).json({
        success: false,
        message: emailFormatError
      });
    }

    // בדיקה שהאימייל לא קיים
    const emailExistsError = await validateEmailExists(email);
    if (emailExistsError) {
      return res.status(400).json({
        success: false,
        message: emailExistsError
      });
    }

    // ולידציה של תפקיד
    const validRoles = ['customer', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'תפקיד לא תקין'
      });
    }

    // בדיקה שהקבוצה קיימת (אם נשלחה)
    if (customerGroupId) {
      const group = await CustomerGroup.findById(customerGroupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'קבוצת הלקוחות לא נמצאה'
        });
      }
    }

    // יצירת המשתמש החדש
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      isActive,
      isVerified: true, // משתמש שנוצר ע"י מנהל - מאומת אוטומטית
      customerGroupId: customerGroupId || undefined
    });

    await newUser.save();

    // טעינה מחדש עם populate לקבוצה
    const populatedUser = await User.findById(newUser._id)
      .populate('customerGroupId', 'name color discountPercentage')
      .select('firstName lastName email role isActive isVerified customerGroupId createdAt')
      .lean();

    // TODO: שליחת מייל ברוכים הבאים (אם נדרש)
    // if (sendWelcomeEmail) {
    //   await sendWelcomeEmailToUser(email, firstName, password);
    // }

    // שידור עדכון לכל הדפדפנים
    getIO().emit('userCreated', { user: populatedUser });

    res.status(201).json({
      success: true,
      message: `המשתמש ${firstName} ${lastName} נוצר בהצלחה`,
      data: populatedUser
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת המשתמש',
      error: error.message
    });
  }
};

// GET /api/users/pending-approval - קבלת משתמשים ממתינים לאישור
export const getPendingApprovalUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = req.query;

    // בניית פילטרים - רק משתמשים שממתינים לאישור
    const filter: any = {
      isApproved: false
    };
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // מיון
    const sort: any = {};
    sort[sortBy as string] = sortDirection === 'asc' ? 1 : -1;

    // חישוב עימוד
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // שליפת נתונים
    const users = await User.find(filter)
      .select('firstName lastName email isActive createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ספירת סה"כ
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת המשתמשים הממתינים',
      error: error.message
    });
  }
};

// PATCH /api/users/:userId/approve - אישור משתמש
export const approveUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'המשתמש כבר מאושר'
      });
    }

    user.isApproved = true;
    await user.save();

    // שידור עדכון לכל הדפדפנים
    getIO().emit('userApproved', { 
      userId: user._id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    res.json({
      success: true,
      message: `המשתמש ${user.firstName} ${user.lastName} אושר בהצלחה`,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isApproved: user.isApproved
      }
    });

  } catch (error: any) {
    console.error('Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באישור המשתמש',
      error: error.message
    });
  }
};

// DELETE /api/users/:userId/reject - דחיית משתמש (מחיקה)
export const rejectUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'לא ניתן לדחות משתמש שכבר אושר'
      });
    }

    // מחיקת המשתמש
    await User.findByIdAndDelete(userId);

    // שידור עדכון לכל הדפדפנים
    getIO().emit('userRejected', { 
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: `הבקשה של ${user.firstName} ${user.lastName} נדחתה`,
      data: { userId }
    });

  } catch (error: any) {
    console.error('Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בדחיית המשתמש',
      error: error.message
    });
  }
};

// ==========================================
// PUT /api/users/:userId - עדכון פרטי משתמש ע"י מנהל
// ==========================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      role,
      customerGroupId,
      isActive
    } = req.body;

    // בדיקה שהמשתמש קיים
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // בדיקה שיש לפחות שדה אחד לעדכון
    if (!firstName && !lastName && !email && phone === undefined && !role && customerGroupId === undefined && isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'נדרש לפחות שדה אחד לעדכון'
      });
    }

    // בניית אובייקט העדכון
    const updateData: any = {};

    // עדכון שדות טקסט
    if (firstName) {
      if (firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'שם פרטי חייב להכיל לפחות 2 תווים'
        });
      }
      updateData.firstName = firstName.trim();
    }

    if (lastName) {
      if (lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'שם משפחה חייב להכיל לפחות 2 תווים'
        });
      }
      updateData.lastName = lastName.trim();
    }

    // עדכון אימייל - בדיקה שלא קיים
    if (email && email !== existingUser.email) {
      const emailFormatError = validateEmailFormat(email);
      if (emailFormatError) {
        return res.status(400).json({
          success: false,
          message: emailFormatError
        });
      }

      const emailExistsError = await validateEmailExists(email);
      if (emailExistsError) {
        return res.status(400).json({
          success: false,
          message: emailExistsError
        });
      }

      updateData.email = email.toLowerCase().trim();
    }

    // עדכון טלפון
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }

    // עדכון תפקיד
    if (role) {
      const validRoles = ['customer', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'תפקיד לא תקין'
        });
      }
      updateData.role = role;
    }

    // עדכון קבוצת לקוחות
    if (customerGroupId !== undefined) {
      if (customerGroupId === '' || customerGroupId === null) {
        // הסרה מקבוצה
        updateData.customerGroupId = null;
      } else {
        // בדיקה שהקבוצה קיימת
        const group = await CustomerGroup.findById(customerGroupId);
        if (!group) {
          return res.status(404).json({
            success: false,
            message: 'קבוצת הלקוחות לא נמצאה'
          });
        }
        updateData.customerGroupId = customerGroupId;
      }
    }

    // עדכון סטטוס פעיל
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // ביצוע העדכון
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('customerGroupId', 'name color discountPercentage')
    .select('firstName lastName email phone role isActive isVerified customerGroupId createdAt updatedAt')
    .lean();

    // שידור עדכון לכל הדפדפנים
    getIO().emit('userUpdated', { user: updatedUser });

    res.json({
      success: true,
      message: `פרטי המשתמש ${updatedUser?.firstName} ${updatedUser?.lastName} עודכנו בהצלחה`,
      data: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון המשתמש',
      error: error.message
    });
  }
};

// ==========================================
// GET /api/users/:userId - קבלת פרטי משתמש בודד
// ==========================================
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('customerGroupId', 'name color discountPercentage')
      .select('firstName lastName email phone role isActive isVerified isApproved customerGroupId createdAt updatedAt lastLogin')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת פרטי המשתמש',
      error: error.message
    });
  }
};

// ==========================================
// GET /api/users/:userId/cart - קבלת סל הקניות של משתמש
// ==========================================
export const getUserCart = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // בדיקה שהמשתמש קיים
    const user = await User.findById(userId).select('firstName lastName email').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // חיפוש סל קניות פעיל של המשתמש
    const cart = await Cart.findOne({ 
      userId,
      status: { $in: ['active', 'abandoned'] } // גם פעיל וגם נטוש
    })
    .populate({
      path: 'items.productId',
      select: 'name slug images' // פרטים בסיסיים של המוצר
    })
    .lean();

    // אם אין סל - מחזירים סל ריק
    if (!cart) {
      return res.json({
        success: true,
        data: {
          exists: false,
          cart: null,
          message: 'למשתמש זה אין סל קניות פעיל'
        }
      });
    }

    res.json({
      success: true,
      data: {
        exists: true,
        cart: {
          _id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          tax: cart.tax,
          shippingCost: cart.shippingCost,
          discount: cart.discount,
          totalPrice: cart.totalPrice,
          coupon: cart.coupon,
          status: cart.status,
          itemsCount: cart.items.length,
          totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          lastActivity: cart.lastActivity,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting user cart:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת סל הקניות של המשתמש',
      error: error.message
    });
  }
};

// ==========================================
// GET /api/users/:userId/orders - קבלת היסטוריית הזמנות של משתמש
// ==========================================
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = req.query;

    // בדיקה שהמשתמש קיים
    const user = await User.findById(userId).select('firstName lastName email').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // בניית פילטרים
    const filter: any = { userId };
    
    // פילטר לפי סטטוס (אופציונלי)
    if (status) {
      filter.status = status;
    }

    // מיון
    const sort: any = {};
    sort[sortBy as string] = sortDirection === 'asc' ? 1 : -1;

    // חישוב עימוד
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // שליפת הזמנות עם כל הפרטים הנדרשים
    const orders = await Order.find(filter)
      .select(`
        orderNumber 
        items 
        subtotal 
        tax 
        shippingCost 
        discount 
        total 
        currency
        status 
        paymentStatus 
        fulfillmentStatus
        statusHistory
        shippingAddress
        trackingNumber
        shippingCarrier
        courierPhone
        estimatedDelivery
        notes
        createdAt 
        updatedAt
      `)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ספירת סה"כ הזמנות
    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // סטטיסטיקות מהירות של ההזמנות
    const stats = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        stats: stats[0] || {
          totalOrders: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת היסטוריית ההזמנות',
      error: error.message
    });
  }
};

// ==========================================
// GET /api/users/:userId/orders/:orderId - קבלת פרטי הזמנה ספציפית של משתמש
// ==========================================
export const getUserOrderById = async (req: Request, res: Response) => {
  try {
    const { userId, orderId } = req.params;

    // בדיקה שהמשתמש קיים
    const user = await User.findById(userId).select('firstName lastName email').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // שליפת ההזמנה עם וידוא שהיא שייכת למשתמש
    const order = await Order.findOne({ 
      _id: orderId, 
      userId 
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'הזמנה לא נמצאה או לא שייכת למשתמש זה'
      });
    }

    // חילוץ תאריכים מרכזיים מ-statusHistory
    const statusDates: Record<string, Date | null> = {
      created: order.createdAt,
      confirmed: null,
      processing: null,
      shipped: null,
      delivered: null,
      cancelled: null,
      returned: null
    };

    // מילוי התאריכים מההיסטוריה
    order.statusHistory.forEach((entry: any) => {
      if (entry.status && statusDates.hasOwnProperty(entry.status)) {
        statusDates[entry.status] = entry.timestamp;
      }
    });

    res.json({
      success: true,
      data: {
        order,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        timeline: {
          statusDates,
          currentStatus: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting user order:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת פרטי ההזמנה',
      error: error.message
    });
  }
};

/**
 * GET /api/users/statistics - קבלת סטטיסטיקות משתמשים עם מגמות
 * מחזיר סטטיסטיקות כלליות על משתמשים במערכת כולל השוואה לחודש קודם
 */
export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    // תאריכים לחישוב מגמות
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ===== נתונים נוכחיים =====
    // ספירת סה"כ משתמשים
    const totalUsers = await User.countDocuments();

    // ספירת משתמשים פעילים
    const activeUsers = await User.countDocuments({ isActive: true, isApproved: true });

    // ספירת משתמשים עם קבוצות
    const usersWithGroups = await User.countDocuments({
      customerGroupId: { $exists: true, $ne: null }
    });

    // ספירת משתמשים ללא קבוצות
    const usersWithoutGroups = totalUsers - usersWithGroups;

    // לקוחות חדשים החודש
    const newCustomersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfThisMonth }
    });

    // לקוחות חדשים חודש קודם
    const newCustomersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // ===== חישוב מגמות =====
    // מגמת לקוחות חדשים (אחוז שינוי)
    let newCustomersTrend = 0;
    if (newCustomersLastMonth > 0) {
      newCustomersTrend = Math.round(((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100);
    } else if (newCustomersThisMonth > 0) {
      newCustomersTrend = 100; // עלייה של 100% אם לא היו לקוחות בחודש קודם
    }

    // מגמת סה"כ משתמשים (גדילה החודש)
    const totalUsersLastMonth = totalUsers - newCustomersThisMonth;
    let totalUsersTrend = 0;
    if (totalUsersLastMonth > 0) {
      totalUsersTrend = Math.round((newCustomersThisMonth / totalUsersLastMonth) * 100);
    }

    res.json({
      // נתונים בסיסיים
      totalUsers,
      activeUsers,
      usersWithGroups,
      usersWithoutGroups,
      // נתוני מגמות
      newCustomersThisMonth,
      newCustomersLastMonth,
      trends: {
        newCustomers: {
          current: newCustomersThisMonth,
          previous: newCustomersLastMonth,
          percentChange: newCustomersTrend,
          direction: newCustomersTrend > 0 ? 'up' : newCustomersTrend < 0 ? 'down' : 'stable'
        },
        totalUsers: {
          current: totalUsers,
          growthThisMonth: newCustomersThisMonth,
          percentChange: totalUsersTrend,
          direction: totalUsersTrend > 0 ? 'up' : 'stable'
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת סטטיסטיקות משתמשים',
      error: error.message
    });
  }
};
