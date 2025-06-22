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
 * @desc    جلب جميع الفنادق للموبايل مع الباجينيشن والفلترة
 * @access  Public
 * @params  page, limit, search, cityId, governorateId, regionId
 */
router.get('/', verifyToken,  validateGetHotelsForMobile, getAllHotelsForMobile);

/**
 * @route   GET /api/mobile/hotels/:id
 * @desc    جلب فندق واحد بالمعرف للموبايل
 * @access  Public
 */
router.get('/:id', verifyToken,validateHotelId, getHotelByIdForMobile);

module.exports = router;
