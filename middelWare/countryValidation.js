const { body, param, query, validationResult } = require('express-validator');
const Country = require('../models/country.model');

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

// التحقق من صحة إضافة بلد جديد (فقط الحقول المطلوبة: name{ar, en}, code)
const validateAddCountry = [
    body('name')
        .isObject()
        .withMessage('الاسم يجب أن يكون كائن يحتوي على ar و en'),

    body('name.ar')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم العربي يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/)
        .withMessage('الاسم العربي يجب أن يحتوي على أحرف عربية فقط')
        .custom(async (value) => {
            const existingCountry = await Country.findOne({ 'name.ar': value });
            if (existingCountry) {
                throw new Error('يوجد بلد مسجل بهذا الاسم العربي مسبقاً');
            }
            return true;
        }),

    body('name.en')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم الإنجليزي يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('الاسم الإنجليزي يجب أن يحتوي على أحرف إنجليزية فقط')
        .custom(async (value) => {
            if (value) {
                const existingCountry = await Country.findOne({ 'name.en': value });
                if (existingCountry) {
                    throw new Error('يوجد بلد مسجل بهذا الاسم الإنجليزي مسبقاً');
                }
            }
            return true;
        }),

    body('code')
        .trim()
        .isLength({ min: 2, max: 3 })
        .withMessage('كود البلد يجب أن يكون بين 2 و 3 أحرف')
        .matches(/^[A-Za-z]+$/)
        .withMessage('كود البلد يجب أن يحتوي على أحرف إنجليزية فقط (كبيرة أو صغيرة)')
        .custom(async (value) => {
            const existingCountry = await Country.findOne({ code: value.toUpperCase() });
            if (existingCountry) {
                throw new Error('يوجد بلد مسجل بهذا الكود مسبقاً');
            }
            return true;
        }),

    // رفض أي حقول أخرى غير مسموحة
    body()
        .custom((value, { req }) => {
            const allowedFields = ['name', 'code'];
            const receivedFields = Object.keys(req.body);
            const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

            if (invalidFields.length > 0) {
                throw new Error(`الحقول التالية غير مسموحة: ${invalidFields.join(', ')}`);
            }
            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة تحديث البلد (فقط الحقول المطلوبة: name{ar, en}, code, isActive)
const validateUpdateCountry = [
    body('name')
        .optional()
        .isObject()
        .withMessage('الاسم يجب أن يكون كائن يحتوي على ar و en'),

    body('name.ar')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم العربي يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/)
        .withMessage('الاسم العربي يجب أن يحتوي على أحرف عربية فقط'),

    body('name.en')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم الإنجليزي يجب أن يكون بين 2 و 100 حرف')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('الاسم الإنجليزي يجب أن يحتوي على أحرف إنجليزية فقط'),

    body('code')
        .optional()
        .trim()
        .isLength({ min: 2, max: 3 })
        .withMessage('كود البلد يجب أن يكون بين 2 و 3 أحرف')
        .matches(/^[A-Za-z]+$/)
        .withMessage('كود البلد يجب أن يحتوي على أحرف إنجليزية فقط (كبيرة أو صغيرة)'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('حالة البلد يجب أن تكون true أو false'),

    // رفض أي حقول أخرى غير مسموحة
    body()
        .custom((value, { req }) => {
            const allowedFields = ['name', 'code', 'isActive'];
            const receivedFields = Object.keys(req.body);
            const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

            if (invalidFields.length > 0) {
                throw new Error(`الحقول التالية غير مسموحة: ${invalidFields.join(', ')}`);
            }
            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة معرف البلد
const validateCountryId = [
    param('id')
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب البلدان
const validateGetCountries = [
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
        .isIn(['name.ar', 'name.en', 'code', 'createdAt', 'updatedAt'])
        .withMessage('حقل الترتيب غير صحيح'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),

    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب أسماء البلدان
const validateGetCountryNames = [
    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),

    handleValidationErrors
];

module.exports = {
    validateAddCountry,
    validateUpdateCountry,
    validateCountryId,
    validateGetCountries,
    validateGetCountryNames,
    handleValidationErrors
};
