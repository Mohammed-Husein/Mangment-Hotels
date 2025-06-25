const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getRoomsByHotelIdForMobile,
    getRoomByIdForMobile
} = require('../../controllers/room.Controller');

// استيراد validation middleware
const {
    validateRoomId,
    validateHotelId,
    validateGetRoomsForMobile
} = require('../../middelWare/roomValidation');

/**
 * @route   GET /api/mobile/rooms/hotel/:hotelId
 * @desc    جلب غرف فندق معين للموبايل
 * @access  Public
 * @params  page, limit, type
 */
router.get('/hotel/:hotelId', validateHotelId, validateGetRoomsForMobile, getRoomsByHotelIdForMobile);

/**
 * @route   GET /api/mobile/rooms/:id
 * @desc    جلب غرفة واحدة بالمعرف للموبايل
 * @access  Public
 */
router.get('/:id', validateRoomId, getRoomByIdForMobile);

module.exports = router;
