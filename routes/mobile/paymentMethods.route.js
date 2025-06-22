const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllPaymentMethodNamesForMobile
} = require('../../controllers/paymentMethod.Controller');

/**
 * @route   GET /api/mobile/payment-methods/names
 * @desc    جلب أسماء طرق الدفع للموبايل (النشطة فقط)
 * @access  Public
 */
router.get('/names', getAllPaymentMethodNamesForMobile);

module.exports = router;
