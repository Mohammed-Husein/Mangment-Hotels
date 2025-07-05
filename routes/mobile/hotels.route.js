const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllHotelsForMobile,
    getHotelByIdForMobile
} = require('../../controllers/hotel.Controller');

// استيراد validation middleware
const {
    validateGetHotelsForMobile,
    validateHotelId
} = require('../../middelWare/hotelValidation');
const verifyToken = require('../../middelWare/verifyToken');

/**
 * @route   GET /api/mobile/hotels
 * @desc    جلب جميع الفنادق للموبايل مع الباجينيشن والفلترة والبحث الجغرافي
 * @access  Public
 * @params  page, limit, search, cityId, governorateId, regionId, longitude, latitude
 * @note    إذا تم تمرير longitude و latitude، سيتم البحث عن الفنادق القريبة أولاً (ضمن 50 كم)
 *          وإذا لم توجد فنادق قريبة، سيتم جلب جميع الفنادق المتاحة
 */
router.get('/', verifyToken,  validateGetHotelsForMobile, getAllHotelsForMobile);

/**
 * @route   GET /api/mobile/hotels/:id
 * @desc    جلب فندق واحد بالمعرف للموبايل
 * @access  Public
 */
router.get('/:id', verifyToken,validateHotelId, getHotelByIdForMobile);

module.exports = router;
