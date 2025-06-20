const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');
const userRole = require('../utils/user-role');

// دالة معالجة أخطاء التحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));
        
        throw new AppError('بيانات غير صحيحة', 400, errorMessages);
    }
    next();
};

// التحقق من صحة التسجيل (تطبيق الموبايل)
const validateRegister = [
    body('fullName')
        .notEmpty()
        .withMessage('الاسم الكامل مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase(),
    
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
    
    body('preferredLanguage')
        .optional()
        .isIn(['ar', 'en'])
        .withMessage('اللغة المفضلة يجب أن تكون ar أو en'),
    
    body('location.country')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('اسم البلد غير صحيح'),
    
    body('location.city')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('اسم المدينة غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة إضافة مستخدم (لوحة التحكم)
const validateAddUser = [
    body('fullName')
        .notEmpty()
        .withMessage('الاسم الكامل مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase(),
    
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    
    body('role')
        .optional()
        .isIn(Object.values(userRole))
        .withMessage('الدور المحدد غير صحيح'),
    
    body('preferredLanguage')
        .optional()
        .isIn(['ar', 'en'])
        .withMessage('اللغة المفضلة يجب أن تكون ar أو en'),
    
    handleValidationErrors
];

// التحقق من صحة تسجيل الدخول
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase(),
    
    body('password')
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث البيانات
const validateUpdateUser = [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح'),
    
    body('preferredLanguage')
        .optional()
        .isIn(['ar', 'en'])
        .withMessage('اللغة المفضلة يجب أن تكون ar أو en'),
    
    body('location.country')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('اسم البلد غير صحيح'),
    
    body('location.city')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('اسم المدينة غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث كلمة المرور
const validateUpdatePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('كلمة المرور الحالية مطلوبة'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('تأكيد كلمة المرور غير متطابق');
            }
            return true;
        }),
    
    handleValidationErrors
];

// التحقق من صحة تحديث الدور
const validateUpdateRole = [
    body('role')
        .isIn(Object.values(userRole))
        .withMessage('الدور المحدد غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث الحالة
const validateToggleStatus = [
    body('isActive')
        .isBoolean()
        .withMessage('حالة التفعيل يجب أن تكون true أو false'),

    handleValidationErrors
];

// التحقق من صحة تغيير حالة المستخدم (حظر/إلغاء حظر)
const validateChangeStatus = [
    body('isActive')
        .isBoolean()
        .withMessage('حالة التفعيل يجب أن تكون true أو false'),

    body('reason')
        .optional()
        .isLength({ min: 3, max: 500 })
        .withMessage('سبب تغيير الحالة يجب أن يكون بين 3 و 500 حرف')
        .trim(),

    handleValidationErrors
];

// التحقق من صحة معاملات GetAllUserNames
const validateGetAllUserNames = [
    query('role')
        .optional()
        .isIn(Object.values(require('../utils/user-role')))
        .withMessage('فلتر الدور غير صحيح'),

    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),

    handleValidationErrors
];

// التحقق من صحة رمز التحديث
const validateRefreshToken = [
    body('refreshToken')
        .notEmpty()
        .withMessage('رمز التحديث مطلوب')
        .isJWT()
        .withMessage('رمز التحديث غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معرف المستخدم
const validateUserId = [
    param('userId')
        .isMongoId()
        .withMessage('معرف المستخدم غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات البحث والباجينيشن
const validatePaginationQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('حد العرض يجب أن يكون بين 1 و 100'),
    
    query('sortBy')
        .optional()
        .isIn(['fullName', 'email', 'createdAt', 'lastLogin', 'role'])
        .withMessage('حقل الترتيب غير صحيح'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),
    
    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),
    
    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),
    
    query('role')
        .optional()
        .isIn(Object.values(userRole))
        .withMessage('فلتر الدور غير صحيح'),
    
    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateAddUser,
    validateLogin,
    validateUpdateUser,
    validateUpdatePassword,
    validateUpdateRole,
    validateToggleStatus,
    validateChangeStatus,
    validateGetAllUserNames,
    validateRefreshToken,
    validateUserId,
    validatePaginationQuery,
    handleValidationErrors
};
