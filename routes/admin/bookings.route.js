const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    addBooking,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
    confirmPayment,
    updateRoomStatusManually
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
    validateGetBookings,
    validateConfirmPayment
} = require('../../middelWare/bookingValidation');

// تطبيق middleware للتحقق من التوثيق والصلاحيات على جميع المسارات
router.use(verifyToken);
router.use(allowedTo('SuperAdmin', 'Admin', 'Manager', 'Receptionist'));

/**
 * @route   GET /api/admin/bookings
 * @desc    جلب جميع الحجوزات مع البحث والباجينيشن
 * @access  SuperAdmin, Admin, Manager, Receptionist
 */
router.get('/', validateGetBookings, getAllBookings);

/**
 * @route   POST /api/admin/bookings
 * @desc    إضافة حجز جديد
 * @access  SuperAdmin, Admin, Manager, Receptionist
 */
router.post('/', validateAddBooking, addBooking);

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    جلب حجز واحد بالمعرف
 * @access  SuperAdmin, Admin, Manager, Receptionist
 */
router.get('/:id', validateBookingId, getBookingById);

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    تحديث حجز
 * @access  SuperAdmin, Admin, Manager, Receptionist
 */
router.put('/:id', validateUpdateBooking, updateBooking);

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    إلغاء حجز (تغيير الحالة إلى ملغي)
 * @access  SuperAdmin, Admin, Manager, Receptionist
 * @body    reason (اختياري)
 */
router.delete('/:id', validateDeleteBooking, deleteBooking);

/**
 * @route   POST /api/admin/bookings/:id/confirm-payment
 * @desc    تأكيد الدفع وتحديث حالة الحجز
 * @access  SuperAdmin, Admin, Manager, Receptionist
 * @body    paidAmount (اختياري), paymentNotes (اختياري)
 */
router.post('/:id/confirm-payment', validateBookingId, validateConfirmPayment, confirmPayment);

/**
 * @route   POST /api/admin/bookings/update-room-status
 * @desc    تحديث حالة الغرف يدوياً
 * @access  SuperAdmin, Admin, Manager, Receptionist
 */
router.post('/update-room-status', updateRoomStatusManually);

module.exports = router;
