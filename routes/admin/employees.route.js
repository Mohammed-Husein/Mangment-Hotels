const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// استيراد controllers
const {
    getAllEmployees,
    getAllNames,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    login,
    refreshToken,
    logout,
    logoutAll,
    updatePassword,
    changeEmployeeStatus
} = require('../../controllers/employee.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateCreateEmployee,
    validateUpdateEmployee,
    validateEmployeeLogin,
    validateRefreshToken,
    validateUpdatePassword,
    validateChangeEmployeeStatus,
    validateEmployeeId,
    validateGetEmployees,
    validateGetEmployeeNames
} = require('../../middelWare/employeeValidation');

// إعداد multer لرفع الصور
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const fileName = `employee-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    const imageType = file.mimetype.split('/')[0];
    if (imageType === 'image') {
        return cb(null, true);
    } else {
        return cb(new Error('يجب أن يكون الملف صورة'), false);
    }
};

const upload = multer({ 
    storage: diskStorage, 
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// استيراد أدوار الموظفين
const Employee = require('../../models/employee.model');
const employeeRoles = Employee.schema.obj.role.enum.values;

// middleware للتحقق من الصلاحيات
const superAdminOnly = [verifyToken, allowedTo(employeeRoles[0])]; // SuperAdmin
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager
const allEmployees = [verifyToken, allowedTo(...employeeRoles)]; // جميع الموظفين

/**
 * @route   POST /api/admin/employees/login
 * @desc    تسجيل دخول الموظف
 * @access  Public
 * @body    email, password, deviceToken
 */
router.post('/login', validateEmployeeLogin, login);

/**
 * @route   POST /api/admin/employees/refresh-token
 * @desc    تحديث رمز الوصول باستخدام رمز التحديث
 * @access  Public
 * @body    employeeId, refreshToken
 */
router.post('/refresh-token', validateRefreshToken, refreshToken);

/**
 * @route   POST /api/admin/employees/logout
 * @desc    تسجيل خروج الموظف
 * @access  Private
 * @body    refreshToken
 */
router.post('/logout', allEmployees, logout);

/**
 * @route   POST /api/admin/employees/logout-all
 * @desc    تسجيل خروج من جميع الأجهزة
 * @access  Private
 */
router.post('/logout-all', allEmployees, logoutAll);

/**
 * @route   GET /api/admin/employees
 * @desc    جلب جميع الموظفين مع الباجينيشن والبحث والفلترة
 * @access  Admin and above
 * @params  page, limit, sortBy, sortOrder, search, role, status, countryId
 */
router.get('/', adminAndAbove, validateGetEmployees, getAllEmployees);

/**
 * @route   GET /api/admin/employees/names
 * @desc    جلب جميع أسماء الموظفين مع المعرفات فقط
 * @access  Manager and above
 * @params  role, status, countryId
 */
router.get('/names', managerAndAbove, validateGetEmployeeNames, getAllNames);

/**
 * @route   GET /api/admin/employees/:id
 * @desc    جلب موظف واحد بالمعرف
 * @access  Admin and above
 */
router.get('/:id', adminAndAbove, validateEmployeeId, getEmployeeById);

/**
 * @route   POST /api/admin/employees
 * @desc    إنشاء موظف جديد
 * @access  Admin and above
 * @body    fullName, email, phoneNumber, password, role, countryId, status, permissions, notes, deviceToken
 */
router.post('/', 
    adminAndAbove, 
    upload.single('image'), 
    validateCreateEmployee, 
    createEmployee
);

/**
 * @route   PUT /api/admin/employees/:id
 * @desc    تحديث بيانات موظف
 * @access  Admin and above
 * @body    fullName, email, phoneNumber, role, countryId, status, permissions, notes, deviceToken, statusChangeReason
 */
router.put('/:id', 
    adminAndAbove, 
    upload.single('image'), 
    validateEmployeeId,
    validateUpdateEmployee, 
    updateEmployee
);

/**
 * @route   PUT /api/admin/employees/:id/password
 * @desc    تحديث كلمة مرور الموظف
 * @access  Admin and above
 * @body    newPassword
 */
router.put('/:id/password',
    adminAndAbove,
    validateEmployeeId,
    validateUpdatePassword,
    updatePassword
);

/**
 * @route   PUT /api/admin/employees/changeEmployeeStatus/:id
 * @desc    تغيير حالة الموظف (تفعيل/تعطيل/تعليق/إجازة)
 * @access  Admin and above
 * @body    status, reason
 */
router.put('/changeEmployeeStatus/:id',
    adminAndAbove,
    validateEmployeeId,
    validateChangeEmployeeStatus,
    changeEmployeeStatus
);

/**
 * @route   DELETE /api/admin/employees/:id
 * @desc    حذف موظف
 * @access  SuperAdmin only
 */
router.delete('/:id', superAdminOnly, validateEmployeeId, deleteEmployee);

module.exports = router;
