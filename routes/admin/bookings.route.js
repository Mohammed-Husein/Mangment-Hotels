const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    addBooking,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking
} = require('../../controllers/booking.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateAddBooking,
    validateUpdateBooking,
    validateDeleteBooking,
    validateBookingId,
    validateGetBookings
} = require('../../middelWare/bookingValidation');

// تطبيق middleware للتحقق من التوثيق والصلاحيات على جميع المسارات
router.use(verifyToken);
router.use(allowedTo('Admin', 'RECEPTIONIST' ));

/**
 * @route   GET /api/admin/bookings
 * @desc    جلب جميع الحجوزات مع البحث والباجينيشن
 * @access  Admin, Receptionist
 */
router.get('/', validateGetBookings, getAllBookings);

/**
 * @route   POST /api/admin/bookings
 * @desc    إضافة حجز جديد
 * @access  Admin, Receptionist
 */
router.post('/', validateAddBooking, addBooking);

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    جلب حجز واحد بالمعرف
 * @access  Admin, Receptionist
 */
router.get('/:id', validateBookingId, getBookingById);

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    تحديث حجز
 * @access  Admin, Receptionist
 */
router.put('/:id', validateUpdateBooking, updateBooking);

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    حذف حجز (تغيير الحالة إلى ملغي)
 * @access  Admin, Receptionist
 */
router.delete('/:id', validateDeleteBooking, deleteBooking);

module.exports = router;
