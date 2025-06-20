const { body, param, query, validationResult } = require('express-validator');
const Governorate = require('../models/governorate.model');
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

// التحقق من صحة upsert المحافظة
const validateUpsertGovernorate = [
    body('id')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    body('name')
        .isObject()
        .withMessage('الاسم يجب أن يكون كائن يحتوي على ar و en'),

    body('name.ar')
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

    body('countryId')
        .isMongoId()
        .withMessage('معرف البلد غير صحيح')
        .custom(async (countryId) => {
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('البلد المحدد غير موجود');
            }
            if (!country.isActive) {
                throw new Error('البلد المحدد غير نشط');
            }
            return true;
        }),

    // التحقق من عدم تكرار الاسم في نفس البلد
    body()
        .custom(async (value, { req }) => {
            const { id, name, countryId } = req.body;
            
            if (name && name.ar && countryId) {
                const query = {
                    'name.ar': name.ar,
                    country: countryId
                };
                
                // إذا كان تحديث، استبعد المحافظة الحالية
                if (id) {
                    query._id = { $ne: id };
                }
                
                const existingGovernorate = await Governorate.findOne(query);
                if (existingGovernorate) {
                    throw new Error('يوجد محافظة بهذا الاسم العربي في نفس البلد مسبقاً');
                }
            }
            
            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة معرف المحافظة
const validateGovernorateId = [
    param('id')
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب المحافظات
const validateGetGovernorates = [
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
        .isIn(['name.ar', 'name.en', 'createdAt', 'updatedAt'])
        .withMessage('حقل الترتيب غير صحيح'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

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

// التحقق من صحة معاملات جلب أسماء المحافظات
const validateGetGovernorateNames = [
    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),

    handleValidationErrors
];

module.exports = {
    validateUpsertGovernorate,
    validateGovernorateId,
    validateGetGovernorates,
    validateGetGovernorateNames,
    handleValidationErrors
};
