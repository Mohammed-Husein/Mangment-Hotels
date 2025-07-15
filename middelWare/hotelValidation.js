const { body, param, query, validationResult } = require('express-validator');
const Hotel = require('../models/hotel.model');

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

// التحقق من صحة إضافة فندق جديد
const validateAddHotel = [
    body('nameAr')
        .notEmpty()
        .withMessage('اسم الفندق باللغة العربية مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الفندق يجب أن يكون بين 2 و 100 حرف')
        .trim(),

    body('nameEn')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الفندق بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),

    body('countryId')
        .notEmpty()
        .withMessage('معرف البلد مطلوب')
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('governorateId')
        .notEmpty()
        .withMessage('معرف المحافظة مطلوب')
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    body('regionId')
        .notEmpty()
        .withMessage('معرف المنطقة مطلوب')
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('خط الطول يجب أن يكون بين -180 و 180'),

    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('خط العرض يجب أن يكون بين -90 و 90'),

 

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('حالة الفندق يجب أن تكون true أو false'),

    handleValidationErrors
];

// التحقق من صحة تحديث فندق
const validateUpdateHotel = [
    body('name.ar')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الفندق باللغة العربية يجب أن يكون بين 2 و 100 حرف')
        .trim(),

    body('name.en')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الفندق بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),

    body('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    body('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    body('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    body('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    body('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('خط الطول يجب أن يكون بين -180 و 180'),

    body('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('خط العرض يجب أن يكون بين -90 و 90'),



    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('حالة الفندق يجب أن تكون true أو false'),

    handleValidationErrors
];

// التحقق من صحة تغيير حالة الفندق
const validateChangeHotelStatus = [
    body('status')
        .notEmpty()
        .withMessage('حالة الفندق مطلوبة')
        .isIn(['نشط', 'غير نشط', 'active', 'inactive'])
        .withMessage('حالة الفندق غير صحيحة'),
    
    handleValidationErrors
];

// التحقق من صحة معرف الفندق
const validateHotelId = [
    param('id')
        .isMongoId()
        .withMessage('معرف الفندق غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب الفنادق
const validateGetHotels = [
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
        .isIn(['name.ar', 'name.en', 'stars', 'createdAt', 'updatedAt'])
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

    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    query('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    query('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    query('employeeId')
        .optional()
        .isMongoId()
        .withMessage('معرف الموظف غير صحيح'),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب الفنادق للموبايل
const validateGetHotelsForMobile = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('حد العناصر يجب أن يكون بين 1 و 50'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),

    query('cityId')
        .optional()
        .isMongoId()
        .withMessage('معرف المدينة غير صحيح'),

    query('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    query('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    query('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('خط الطول يجب أن يكون رقم بين -180 و 180'),

    query('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('خط العرض يجب أن يكون رقم بين -90 و 90'),

    // التحقق من أن الإحداثيات مترابطة (إما كلاهما أو لا شيء)
    query()
        .custom((value, { req }) => {
            const { longitude, latitude } = req.query;

            // إذا تم تمرير أحدهما فقط، فهذا خطأ
            if ((longitude && !latitude) || (!longitude && latitude)) {
                throw new Error('يجب تمرير خط الطول وخط العرض معاً أو عدم تمريرهما');
            }

            return true;
        }),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب أسماء الفنادق
const validateGetHotelNames = [
    query('countryId')
        .optional()
        .isMongoId()
        .withMessage('معرف البلد غير صحيح'),

    query('governorateId')
        .optional()
        .isMongoId()
        .withMessage('معرف المحافظة غير صحيح'),

    query('regionId')
        .optional()
        .isMongoId()
        .withMessage('معرف المنطقة غير صحيح'),

    handleValidationErrors
];

module.exports = {
    validateAddHotel,
    validateUpdateHotel,
    validateChangeHotelStatus,
    validateHotelId,
    validateGetHotels,
    validateGetHotelsForMobile,
    validateGetHotelNames
};
