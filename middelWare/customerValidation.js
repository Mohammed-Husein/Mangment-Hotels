const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/user.model');

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

// التحقق من صحة تسجيل عميل جديد
const validateRegister = [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأول يجب أن يكون بين 2 و 50 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]+$/)
        .withMessage('الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأخير يجب أن يكون بين 2 و 50 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]+$/)
        .withMessage('الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail()
        .toLowerCase()
        .custom(async (email) => {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('يوجد عميل مسجل بهذا البريد الإلكتروني مسبقاً');
            }
            return true;
        }),

    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('تأكيد كلمة المرور غير متطابق');
            }
            return true;
        }),

    body('phoneNumber')
        .isMobilePhone('any')
        .withMessage('رقم الهاتف غير صحيح')
        .custom(async (phoneNumber) => {
            const existingUser = await User.findOne({ phoneNumber });
            if (existingUser) {
                throw new Error('يوجد عميل مسجل بهذا رقم الهاتف مسبقاً');
            }
            return true;
        }),

    body('alternatePhoneNumber')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف البديل غير صحيح'),

    body('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    body('detailedAddress')
        .isLength({ min: 5, max: 200 })
        .withMessage('العنوان التفصيلي يجب أن يكون بين 5 و 200 حرف'),

    body('preferredLanguage')
        .optional()
        .isIn(['Arabic', 'English'])
        .withMessage('اللغة المفضلة يجب أن تكون Arabic أو English'),

    // التحقق من إحداثيات الموقع (اختيارية)
    body('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('خط العرض يجب أن يكون رقم بين -90 و 90'),

    body('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('خط الطول يجب أن يكون رقم بين -180 و 180'),

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

// التحقق من صحة تحديث كلمة المرور
const validateUpdatePassword = [
    body('userId')
        .optional()
        .isMongoId()
        .withMessage('معرف المستخدم غير صحيح'),

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

// التحقق من صحة تحديث العميل
const validateUpdateCustomer = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأول يجب أن يكون بين 2 و 50 حرف'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأخير يجب أن يكون بين 2 و 50 حرف'),

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

    body('alternatePhoneNumber')
        .optional()
        .isMobilePhone('any')
        .withMessage('رقم الهاتف البديل غير صحيح'),

    body('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    body('detailedAddress')
        .optional()
        .isLength({ min: 5, max: 200 })
        .withMessage('العنوان التفصيلي يجب أن يكون بين 5 و 200 حرف'),

    body('preferredLanguage')
        .optional()
        .isIn(['Arabic', 'English'])
        .withMessage('اللغة المفضلة يجب أن تكون Arabic أو English'),

    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended'])
        .withMessage('حالة العميل غير صحيحة'),

    handleValidationErrors
];

// التحقق من صحة معرف العميل
const validateCustomerId = [
    param('userId')
        .isMongoId()
        .withMessage('معرف العميل غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب العملاء
const validateGetCustomers = [
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
        .isIn(['firstName', 'lastName', 'email', 'status', 'lastSeen', 'createdAt'])
        .withMessage('حقل الترتيب غير صحيح'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),

    query('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended'])
        .withMessage('فلتر الحالة غير صحيح'),

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    query('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب أسماء العملاء
const validateGetCustomerNames = [
    query('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Suspended'])
        .withMessage('فلتر الحالة غير صحيح'),

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    handleValidationErrors
];

// التحقق من صحة تغيير حالة العميل
const validateChangeCustomerStatus = [
    body('status')
        .isIn(['Active', 'Inactive', 'Suspended'])
        .withMessage('حالة العميل يجب أن تكون Active أو Inactive أو Suspended'),

    body('reason')
        .optional()
        .isLength({ min: 5, max: 200 })
        .withMessage('سبب تغيير الحالة يجب أن يكون بين 5 و 200 حرف'),

    handleValidationErrors
];

// التحقق من صحة تحديث الملف الشخصي للموبايل
const validateUpdateProfile = [
    body('userId')
        .optional()
        .isMongoId()
        .withMessage('معرف المستخدم غير صحيح'),

    body('firstName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأول يجب أن يكون بين 2 و 50 حرف')
        .matches(/^[\u0600-\u06FFa-zA-Z\s]+$/)
        .withMessage('الاسم الأول يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('lastName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('الاسم الأخير يجب أن يكون بين 2 و 50 حرف')
        .matches(/^[\u0600-\u06FFa-zA-Z\s]+$/)
        .withMessage('الاسم الأخير يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),

    body('phoneNumber')
        .optional()
        .isMobilePhone()
        .withMessage('رقم الهاتف غير صحيح'),

    body('alternatePhoneNumber')
        .optional()
        .isMobilePhone()
        .withMessage('رقم الهاتف البديل غير صحيح'),

    body('detailedAddress')
        .optional()
        .isLength({ min: 10, max: 200 })
        .withMessage('العنوان التفصيلي يجب أن يكون بين 10 و 200 حرف'),

    body('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    body('preferredLanguage')
        .optional()
        .isIn(['Arabic', 'English'])
        .withMessage('اللغة المفضلة يجب أن تكون Arabic أو English'),

    // التحقق من إحداثيات الموقع (اختيارية)
    body('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('خط العرض يجب أن يكون رقم بين -90 و 90'),

    body('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('خط الطول يجب أن يكون رقم بين -180 و 180'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),

    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateLogin,
    validateUpdatePassword,
    validateUpdateCustomer,
    validateCustomerId,
    validateGetCustomers,
    validateGetCustomerNames,
    validateChangeCustomerStatus,
    validateUpdateProfile,
    handleValidationErrors
};
