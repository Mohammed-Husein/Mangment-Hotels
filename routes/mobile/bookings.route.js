const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    bookRoom,
    cancelBooking,
    getAllBookingsByUserId,
    updateBooking,
    deleteBooking
} = require('../../controllers/mobileBooking.Controller');

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
// router.use(allowedTo('CUSTOMER'));

/**
 * @route   POST /api/mobile/bookings
 * @desc    حجز غرفة
 * @access  Customer
 */
router.post('/', validateAddBooking, bookRoom);

/**
 * @route   GET /api/mobile/bookings/my-bookings
 * @desc    جلب جميع حجوزات المستخدم
 * @access  Customer
 */
router.get('/my-bookings', validateGetBookings, getAllBookingsByUserId);

/**
 * @route   PUT /api/mobile/bookings/:id/cancel
 * @desc    إلغاء حجز
 * @access  Customer
 */
router.put('/:id/cancel', validateDeleteBooking, cancelBooking);

/**
 * @route   PUT /api/mobile/bookings/:id
 * @desc    تعديل حجز
 * @access  Customer
 */
router.put('/:id', validateUpdateBooking, updateBooking);

/**
 * @route   DELETE /api/mobile/bookings/:id
 * @desc    حذف حجز
 * @access  Customer
 */
router.delete('/:id', validateDeleteBooking, deleteBooking);

module.exports = router;
