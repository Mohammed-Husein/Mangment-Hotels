const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');

// معالج أخطاء التحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        throw new AppError(errorMessages.join(', '), 400);
    }
    next();
};

// التحقق من صحة إضافة حجز جديد
const validateAddBooking = [
    body('customerId')
        .notEmpty()
        .withMessage('معرف العميل مطلوب')
        .isMongoId()
        .withMessage('معرف العميل غير صحيح'),
    
    body('roomId')
        .notEmpty()
        .withMessage('معرف الغرفة مطلوب')
        .isMongoId()
        .withMessage('معرف الغرفة غير صحيح'),
    
    body('checkInDate')
        .notEmpty()
        .withMessage('تاريخ الوصول مطلوب')
        .isISO8601()
        .withMessage('تاريخ الوصول غير صحيح')
        .custom((value) => {
            const checkInDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (checkInDate < today) {
                throw new Error('تاريخ الوصول يجب أن يكون في المستقبل');
            }
            return true;
        }),
    
    body('checkOutDate')
        .notEmpty()
        .withMessage('تاريخ المغادرة مطلوب')
        .isISO8601()
        .withMessage('تاريخ المغادرة غير صحيح')
        .custom((value, { req }) => {
            const checkInDate = new Date(req.body.checkInDate);
            const checkOutDate = new Date(value);
            if (checkOutDate <= checkInDate) {
                throw new Error('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول');
            }
            return true;
        }),
    
    body('paymentMethodId')
        .notEmpty()
        .withMessage('طريقة الدفع مطلوبة')
        .isMongoId()
        .withMessage('معرف طريقة الدفع غير صحيح'),
    
    body('totalAmount')
        .optional()
        .isNumeric()
        .withMessage('المبلغ الإجمالي يجب أن يكون رقم')
        .custom((value) => {
            if (value < 0) {
                throw new Error('المبلغ الإجمالي لا يمكن أن يكون سالب');
            }
            return true;
        }),
    
    body('discount')
        .optional()
        .isNumeric()
        .withMessage('الحسم يجب أن يكون رقم')
        .custom((value) => {
            if (value < 0) {
                throw new Error('الحسم لا يمكن أن يكون سالب');
            }
            return true;
        }),
    
    body('guestInfo.fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم النزيل يجب أن يكون بين 2 و 100 حرف'),
    
    body('guestInfo.email')
        .optional()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),
    
    body('guestInfo.phone')
        .optional()
        .isMobilePhone()
        .withMessage('رقم الهاتف غير صحيح'),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),
    
    handleValidationErrors
];

// التحقق من صحة تحديث حجز
const validateUpdateBooking = [
    param('id')
        .isMongoId()
        .withMessage('معرف الحجز غير صحيح'),
    
    body('checkInDate')
        .optional()
        .isISO8601()
        .withMessage('تاريخ الوصول غير صحيح')
        .custom((value) => {
            const checkInDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (checkInDate < today) {
                throw new Error('تاريخ الوصول يجب أن يكون في المستقبل');
            }
            return true;
        }),
    
    body('checkOutDate')
        .optional()
        .isISO8601()
        .withMessage('تاريخ المغادرة غير صحيح'),
    
    body('paymentMethodId')
        .optional()
        .isMongoId()
        .withMessage('معرف طريقة الدفع غير صحيح'),
    
    body('totalAmount')
        .optional()
        .isNumeric()
        .withMessage('المبلغ الإجمالي يجب أن يكون رقم')
        .custom((value) => {
            if (value < 0) {
                throw new Error('المبلغ الإجمالي لا يمكن أن يكون سالب');
            }
            return true;
        }),
    
    body('discount')
        .optional()
        .isNumeric()
        .withMessage('الحسم يجب أن يكون رقم')
        .custom((value) => {
            if (value < 0) {
                throw new Error('الحسم لا يمكن أن يكون سالب');
            }
            return true;
        }),
    
    body('status')
        .optional()
        .isIn(['معلق', 'مؤكد', 'تم تسجيل الدخول', 'تم تسجيل الخروج', 'ملغي', 'لم يحضر'])
        .withMessage('حالة الحجز غير صحيحة'),
    
    body('guestInfo.fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم النزيل يجب أن يكون بين 2 و 100 حرف'),
    
    body('guestInfo.email')
        .optional()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),
    
    body('guestInfo.phone')
        .optional()
        .isMobilePhone()
        .withMessage('رقم الهاتف غير صحيح'),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),
    
    handleValidationErrors
];

// التحقق من صحة حذف حجز
const validateDeleteBooking = [
    param('id')
        .isMongoId()
        .withMessage('معرف الحجز غير صحيح'),
    
    body('reason')
        .optional()
        .isLength({ min: 5, max: 200 })
        .withMessage('سبب الإلغاء يجب أن يكون بين 5 و 200 حرف'),
    
    handleValidationErrors
];

// التحقق من صحة معرف الحجز
const validateBookingId = [
    param('id')
        .isMongoId()
        .withMessage('معرف الحجز غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب الحجوزات
const validateGetBookings = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('عدد العناصر في الصفحة يجب أن يكون بين 1 و 100'),
    
    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
        .withMessage('حالة الحجز غير صحيحة'),
    
    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),
    
    query('roomNumber')
        .optional()
        .isLength({ min: 1, max: 10 })
        .withMessage('رقم الغرفة يجب أن يكون بين 1 و 10 أحرف'),
    
    query('customerName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم العميل يجب أن يكون بين 2 و 100 حرف'),

    query('customerId')
        .optional()
        .isMongoId()
        .withMessage('معرف العميل غير صحيح'),

    handleValidationErrors
];

// التحقق من صحة بيانات تأكيد الدفع
const validateConfirmPayment = [
    body('paidAmount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('المبلغ المدفوع يجب أن يكون رقم موجب'),

    body('paymentNotes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('ملاحظات الدفع يجب أن لا تتجاوز 500 حرف'),

    handleValidationErrors
];

module.exports = {
    validateAddBooking,
    validateUpdateBooking,
    validateDeleteBooking,
    validateBookingId,
    validateGetBookings,
    validateConfirmPayment
};
