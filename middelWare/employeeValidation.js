const { body, param, query, validationResult } = require('express-validator');
const Employee = require('../models/employee.model');

// دالة معالجة أخطاء التحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));
        
        return res.status(400).json({
            status: 'fail',
            message: 'خطأ في البيانات المدخلة',
            errors: errorMessages
        });
    }
    next();
};

// التحقق من صحة إنشاء موظف جديد
const validateCreateEmployee = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم الكامل يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]+$/)
        .withMessage('الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase()
        .custom(async (email) => {
            const existingEmployee = await Employee.findOne({ email });
            if (existingEmployee) {
                throw new Error('يوجد موظف مسجل بهذا البريد الإلكتروني مسبقاً');
            }
            return true;
        }),

    body('phoneNumber')
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح')
        .custom(async (phoneNumber) => {
            const existingEmployee = await Employee.findOne({ phoneNumber });
            if (existingEmployee) {
                throw new Error('يوجد موظف مسجل بهذا رقم الهاتف مسبقاً');
            }
            return true;
        }),

    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),

    body('role')
        .isIn(['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'])
        .withMessage('الدور المحدد غير صحيح'),

    body('countryId')
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended', 'OnLeave'])
        .withMessage('حالة الموظف غير صحيحة'),

    body('permissions')
        .optional()
        .isArray()
        .withMessage('الصلاحيات يجب أن تكون مصفوفة'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),

    body('deviceToken')
        .optional()
        .isString()
        .withMessage('رمز الجهاز يجب أن يكون نص'),

    handleValidationErrors
];

// التحقق من صحة تحديث الموظف
const validateUpdateEmployee = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم الكامل يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]+$/)
        .withMessage('الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase(),

    body('phoneNumber')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح'),

    body('role')
        .optional()
        .isIn(['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'])
        .withMessage('الدور المحدد غير صحيح'),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended', 'OnLeave'])
        .withMessage('حالة الموظف غير صحيحة'),

    body('permissions')
        .optional()
        .isArray()
        .withMessage('الصلاحيات يجب أن تكون مصفوفة'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),

    body('deviceToken')
        .optional()
        .isString()
        .withMessage('رمز الجهاز يجب أن يكون نص'),

    body('statusChangeReason')
        .optional()
        .isLength({ max: 200 })
        .withMessage('سبب تغيير الحالة يجب أن لا يتجاوز 200 حرف'),

    handleValidationErrors
];

// التحقق من صحة تسجيل الدخول
const validateEmployeeLogin = [
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase(),
    
    body('password')
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة'),

    body('deviceToken')
        .optional()
        .isString()
        .withMessage('رمز الجهاز يجب أن يكون نص'),
    
    handleValidationErrors
];

// التحقق من صحة رمز التحديث
const validateRefreshToken = [
    body('employeeId')
        .isMongoId()
        .withMessage('معرف الموظف غير صحيح'),

    body('refreshToken')
        .notEmpty()
        .withMessage('رمز التحديث مطلوب')
        .isString()
        .withMessage('رمز التحديث يجب أن يكون نص'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث كلمة المرور
const validateUpdatePassword = [
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),

    handleValidationErrors
];

// التحقق من صحة تغيير حالة الموظف
const validateChangeEmployeeStatus = [
    body('status')
        .isIn(['Active', 'Inactive', 'Suspended', 'OnLeave'])
        .withMessage('حالة الموظف يجب أن تكون Active أو Inactive أو Suspended أو OnLeave'),

    body('reason')
        .optional()
        .isLength({ min: 5, max: 200 })
        .withMessage('سبب تغيير الحالة يجب أن يكون بين 5 و 200 حرف'),

    handleValidationErrors
];

// التحقق من صحة معرف الموظف
const validateEmployeeId = [
    param('id')
        .isMongoId()
        .withMessage('معرف الموظف غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب الموظفين
const validateGetEmployees = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('حد العناصر يجب أن يكون بين 1 و 100'),

    query('sortBy')
        .optional()
        .isIn(['fullName', 'email', 'role', 'status', 'hireDate', 'lastSeen', 'createdAt'])
        .withMessage('حقل الترتيب غير صحيح'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),

    query('role')
        .optional()
        .isIn(['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'])
        .withMessage('فلتر الدور غير صحيح'),

    query('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended', 'OnLeave'])
        .withMessage('فلتر الحالة غير صحيح'),

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب أسماء الموظفين
const validateGetEmployeeNames = [
    query('role')
        .optional()
        .isIn(['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'])
        .withMessage('فلتر الدور غير صحيح'),

    query('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended', 'OnLeave'])
        .withMessage('فلتر الحالة غير صحيح'),

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    handleValidationErrors
];

module.exports = {
    validateCreateEmployee,
    validateUpdateEmployee,
    validateEmployeeLogin,
    validateRefreshToken,
    validateUpdatePassword,
    validateChangeEmployeeStatus,
    validateEmployeeId,
    validateGetEmployees,
    validateGetEmployeeNames,
    handleValidationErrors
};
