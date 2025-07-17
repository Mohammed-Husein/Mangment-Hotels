const { body, param, query, validationResult } = require('express-validator');
const Room = require('../models/room.model');

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

// التحقق من صحة إضافة غرفة جديدة
const validateAddRoom = [
    body('nameAr')
        .notEmpty()
        .withMessage('اسم الغرفة باللغة العربية مطلوب')
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الغرفة يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('nameEn')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الغرفة بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('numberRoom')
        .optional()
        .isLength({ max: 50 })
        .withMessage('رقم الغرفة يجب أن لا يتجاوز 50 حرف')
        .trim(),
    
    body('status')
        .optional()
        .isIn(['Available', 'Reserved', 'Inactive'])
        .withMessage('حالة الغرفة غير صحيحة'),
    
    body('type')
        .notEmpty()
        .withMessage('نوع الغرفة مطلوب')
        .isIn(['sweet', 'singleRoom', 'doubleRoom', 'suite', 'deluxe', 'standard'])
        .withMessage('نوع الغرفة غير صحيح'),
    
    body('bedsCount')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('عدد الأسرة يجب أن يكون بين 1 و 10'),
    
    body('hotelId')
        .notEmpty()
        .withMessage('معرف الفندق مطلوب')
        .isMongoId()
        .withMessage('معرف الفندق غير صحيح'),

    body('price')
        .notEmpty()
        .withMessage('سعر الغرفة مطلوب')
        .isFloat({ min: 0 })
        .withMessage('سعر الغرفة يجب أن يكون رقم موجب'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('وصف الغرفة يجب أن لا يتجاوز 1000 حرف')
        .trim(),

    body('bookedFrom')
        .optional()
        .isISO8601()
        .withMessage('تاريخ بداية الحجز غير صحيح'),

    body('bookedTo')
        .optional()
        .isISO8601()
        .withMessage('تاريخ نهاية الحجز غير صحيح'),

    body('bookingNote')
        .optional()
        .isLength({ max: 500 })
        .withMessage('ملاحظة الحجز يجب أن لا تتجاوز 500 حرف')
        .trim(),
    
    handleValidationErrors
];

// التحقق من صحة تحديث غرفة
const validateUpdateRoom = [
    body('nameAr')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الغرفة باللغة العربية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('nameEn')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('اسم الغرفة بالإنجليزية يجب أن يكون بين 2 و 100 حرف')
        .trim(),
    
    body('numberRoom')
        .optional()
        .isLength({ max: 50 })
        .withMessage('رقم الغرفة يجب أن لا يتجاوز 50 حرف')
        .trim(),
    
    body('status')
        .optional()
        .isIn(['Available', 'Reserved', 'Inactive'])
        .withMessage('حالة الغرفة غير صحيحة'),
    
    body('type')
        .optional()
        .isIn(['sweet', 'singleRoom', 'doubleRoom', 'suite', 'deluxe', 'standard'])
        .withMessage('نوع الغرفة غير صحيح'),
    
    body('bedsCount')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('عدد الأسرة يجب أن يكون بين 1 و 10'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('سعر الغرفة يجب أن يكون رقم موجب'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('وصف الغرفة يجب أن لا يتجاوز 1000 حرف')
        .trim(),

    body('deleteImages')
        .optional()
        .custom((value) => {
            // إذا كان string، نحاول تحويله إلى array
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        throw new Error('deleteImages يجب أن يكون مصفوفة من مسارات الصور');
                    }
                    return true;
                } catch (error) {
                    throw new Error('deleteImages يجب أن يكون مصفوفة صحيحة من مسارات الصور');
                }
            }
            // إذا كان array بالفعل
            if (Array.isArray(value)) {
                return true;
            }
            throw new Error('deleteImages يجب أن يكون مصفوفة من مسارات الصور');
        }),

    body('bookedFrom')
        .optional()
        .isISO8601()
        .withMessage('تاريخ بداية الحجز غير صحيح'),

    body('bookedTo')
        .optional()
        .isISO8601()
        .withMessage('تاريخ نهاية الحجز غير صحيح'),

    body('bookingNote')
        .optional()
        .isLength({ max: 500 })
        .withMessage('ملاحظة الحجز يجب أن لا تتجاوز 500 حرف')
        .trim(),
    
    handleValidationErrors
];

// التحقق من صحة معرف الغرفة
const validateRoomId = [
    param('id')
        .isMongoId()
        .withMessage('معرف الغرفة غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معرف الفندق
const validateHotelId = [
    param('hotelId')
        .isMongoId()
        .withMessage('معرف الفندق غير صحيح'),
    
    handleValidationErrors
];

// التحقق من صحة معاملات جلب الغرف
const validateGetRooms = [
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
        .isIn(['name.ar', 'name.en', 'numberRoom', 'type', 'status', 'createdAt', 'updatedAt'])
        .withMessage('حقل الترتيب غير صحيح'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),

    query('status')
        .optional()
        .isIn(['Available', 'Reserved', 'Inactice'])
        .withMessage('فلتر الحالة غير صحيح'),

    query('type')
        .optional()
        .isIn(['sweet', 'singleRoom', 'doubleRoom', 'suite', 'deluxe', 'standard'])
        .withMessage('فلتر نوع الغرفة غير صحيح'),

    query('hotelId')
        .optional()
        .isMongoId()
        .withMessage('معرف الفندق غير صحيح'),

    handleValidationErrors
];

// التحقق من صحة معاملات جلب الغرف للموبايل
const validateGetRoomsForMobile = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('حد العناصر يجب أن يكون بين 1 و 50'),

    query('type')
        .optional()
        .isIn(['sweet', 'singleRoom', 'doubleRoom', 'suite', 'deluxe', 'standard'])
        .withMessage('فلتر نوع الغرفة غير صحيح'),

    handleValidationErrors
];

module.exports = {
    validateAddRoom,
    validateUpdateRoom,
    validateRoomId,
    validateHotelId,
    validateGetRooms,
    validateGetRoomsForMobile
};
