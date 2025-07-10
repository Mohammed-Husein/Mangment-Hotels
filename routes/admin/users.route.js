const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllUsers,
    getUser,
    getUserById,
    getAllUserNames,
    addUser,
    updateUserData,
    changeUserPassword, // الدالة الجديدة لتغيير كلمة المرور
    changeUserStatus,
    deleteUser
} = require('../../controllers/user.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateRegister,
    validateUpdateCustomer,
    validateCustomerId,
    validateGetCustomers,
    validateGetCustomerNames,
    validateChangeCustomerStatus,
    validateChangePassword // الvalidation الجديد لتغيير كلمة المرور
} = require('../../middelWare/customerValidation');

// استيراد أدوار الموظفين
const Employee = require('../../models/employee.model');
const employeeRoles = Employee.schema.obj.role.enum.values;

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/users
 * @desc    جلب جميع العملاء مع الباجينيشن والبحث والفلترة
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, status, countryId, cityId, regionId
 */
router.get('/', managerAndAbove, validateGetCustomers, getAllUsers);

/**
 * @route   GET /api/admin/users/names
 * @desc    جلب جميع أسماء العملاء مع المعرفات فقط
 * @access  Manager and above
 * @params  status, countryId
 */
router.get('/names', managerAndAbove, validateGetCustomerNames, getAllUserNames);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    جلب عميل واحد بالمعرف
 * @access  Manager and above
 */
router.get('/:userId', managerAndAbove, validateCustomerId, getUserById);

/**
 * @route   POST /api/admin/users
 * @desc    إضافة عميل جديد من لوحة التحكم
 * @access  Admin and above
 * @body    firstName, lastName, email, password, confirmPassword, phoneNumber, alternatePhoneNumber, regionId, countryId, cityId, detailedAddress, preferredLanguage
 */
router.post('/', adminAndAbove, validateRegister, addUser);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    تحديث بيانات العميل
 * @access  Admin and above
 */
router.put('/:userId', adminAndAbove, validateCustomerId, validateUpdateCustomer, updateUserData);

/**
 * @route   PUT /api/admin/users/changeStatus/:userId
 * @desc    تغيير حالة العميل (تفعيل/تعطيل/تعليق)
 * @access  Admin and above
 * @body    status, reason
 */
router.put('/changeStatus/:userId', adminAndAbove, validateCustomerId, validateChangeCustomerStatus, changeUserStatus);

/**
 * @route   PUT /api/admin/users/password/:userId
 * @desc    تغيير كلمة مرور المستخدم من لوحة التحكم
 * @access  Admin and above
 * @body    newPassword, confirmPassword
 */
router.put('/:userId/password', adminAndAbove, validateCustomerId, validateChangePassword, changeUserPassword);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    حذف العميل
 * @access  Admin and above
 */
router.delete('/:userId', adminAndAbove, validateCustomerId, deleteUser);

module.exports = router;
