const { body, param, query, validationResult } = require('express-validator');
const Region = require('../models/region.model');
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

// التحقق من صحة إضافة منطقة جديدة
const validateAddRegion = [
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

    body('governorateId')
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

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

    // التحقق من أن المحافظة تنتمي للبلد المحدد
    body()
        .custom(async (value, { req }) => {
            const { governorateId, countryId } = req.body;
            
            if (governorateId && countryId) {
                const governorate = await Governorate.findOne({ 
                    _id: governorateId, 
                    country: countryId 
                });
                
                if (!governorate) {
                    throw new Error('المحافظة المحددة لا تنتمي للبلد المحدد');
                }
                
                if (!governorate.isActive) {
                    throw new Error('المحافظة المحددة غير نشطة');
                }
            }
            
            return true;
        }),

    // التحقق من عدم تكرار الاسم في نفس المحافظة
    body()
        .custom(async (value, { req }) => {
            const { name, governorateId } = req.body;
            
            if (name && name.ar && governorateId) {
                const existingRegion = await Region.findOne({
                    'name.ar': name.ar,
                    governorate: governorateId
                });
                
                if (existingRegion) {
                    throw new Error('يوجد منطقة بهذا الاسم العربي في نفس المحافظة مسبقاً');
                }
            }
            
            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة تحديث المنطقة
const validateUpdateRegion = [
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

    body('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    // التحقق من أن المحافظة تنتمي للبلد المحدد (إذا تم تحديدهما)
    body()
        .custom(async (value, { req }) => {
            const { governorateId, countryId } = req.body;
            
            if (governorateId && countryId) {
                const governorate = await Governorate.findOne({ 
                    _id: governorateId, 
                    country: countryId 
                });
                
                if (!governorate) {
                    throw new Error('المحافظة المحددة لا تنتمي للبلد المحدد');
                }
            }
            
            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة معرف المنطقة
const validateRegionId = [
    param('id')
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب المناطق
const validateGetRegions = [
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

    query('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

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

// التحقق من صحة معاملات جلب أسماء المناطق
const validateGetRegionNames = [
    query('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

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

// التحقق من صحة معاملات جلب أسماء المدن
const validateGetCities = [
    query('countryId')
        .notEmpty()
        .withMessage('معرف البلد مطلوب')
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('فلتر الحالة يجب أن يكون true أو false'),

    handleValidationErrors
];

module.exports = {
    validateAddRegion,
    validateUpdateRegion,
    validateRegionId,
    validateGetRegions,
    validateGetRegionNames,
    validateGetCities,
    handleValidationErrors
};
