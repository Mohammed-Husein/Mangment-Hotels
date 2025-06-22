const { body, param, query, validationResult } = require('express-validator');
const PaymentMethod = require('../models/paymentMethod.model');

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

// التحقق من صحة إضافة طريقة دفع جديدة
const validateAddPaymentMethod = [
    body('nameAr')
        .notEmpty()
        .withMessage('اسم طريقة الدفع باللغة العربية مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم طريقة الدفع يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('nameEn')
        .notEmpty()
        .withMessage('اسم طريقة الدفع باللغة الإنجليزية مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم طريقة الدفع بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('code')
        .notEmpty()
        .withMessage('كود طريقة الدفع مطلوب')
        .isLength({ min: 2, max: 20 })
        .withMessage('كود طريقة الدفع يجب أن يكون بين 2 و 20 حرف')
        .matches(/^[A-Za-z0-9_]+$/)
        .withMessage('كود طريقة الدفع يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطة سفلية فقط')
        .trim(),
    
    body('descriptionAr')
        .optional()
        .isLength({ max: 500 })
        .withMessage('وصف طريقة الدفع بالعربية يجب أن لا يتجاوز 500 حرف')
        .trim(),
    
    body('descriptionEn')
        .optional()
        .isLength({ max: 500 })
        .withMessage('وصف طريقة الدفع بالإنجليزية يجب أن لا يتجاوز 500 حرف')
        .trim(),
    
    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('ترتيب العرض يجب أن يكون رقم صحيح غير سالب'),
    
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('حالة النشاط يجب أن تكون true أو false'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث طريقة دفع
const validateUpdatePaymentMethod = [
    body('nameAr')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم طريقة الدفع باللغة العربية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('nameEn')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم طريقة الدفع بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('code')
        .optional()
        .isLength({ min: 2, max: 20 })
        .withMessage('كود طريقة الدفع يجب أن يكون بين 2 و 20 حرف')
        .matches(/^[A-Za-z0-9_]+$/)
        .withMessage('كود طريقة الدفع يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطة سفلية فقط')
        .trim(),
    
    body('descriptionAr')
        .optional()
        .isLength({ max: 500 })
        .withMessage('وصف طريقة الدفع بالعربية يجب أن لا يتجاوز 500 حرف')
        .trim(),
    
    body('descriptionEn')
        .optional()
        .isLength({ max: 500 })
        .withMessage('وصف طريقة الدفع بالإنجليزية يجب أن لا يتجاوز 500 حرف')
        .trim(),
    
    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('ترتيب العرض يجب أن يكون رقم صحيح غير سالب'),
    
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('حالة النشاط يجب أن تكون true أو false'),
    
    handleValidationErrors
];

// التحقق من صحة معرف طريقة الدفع
const validatePaymentMethodId = [
    param('id')
        .isMongoId()
        .withMessage('معرف طريقة الدفع غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب طرق الدفع
const validateGetPaymentMethods = [
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
        .isIn(['name.ar', 'name.en', 'code', 'displayOrder', 'isActive', 'createdAt', 'updatedAt'])
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

    handleValidationErrors
];

// التحقق من صحة معاملات جلب أسماء طرق الدفع
const validateGetPaymentMethodNames = [
    query('activeOnly')
        .optional()
        .isBoolean()
        .withMessage('معامل activeOnly يجب أن يكون true أو false'),

    handleValidationErrors
];

module.exports = {
    validateAddPaymentMethod,
    validateUpdatePaymentMethod,
    validatePaymentMethodId,
    validateGetPaymentMethods,
    validateGetPaymentMethodNames
};
