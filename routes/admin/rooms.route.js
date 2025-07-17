const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    addRoom,
    getAllRooms,
    getRoomsByHotelId,
    getRoomById,
    updateRoom,
    deleteRoom
} = require('../../controllers/room.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد upload middleware
const { uploadRoomImages } = require('../../middelWare/roomUploadMiddleware');

// استيراد validation middleware
const {
    validateAddRoom,
    validateUpdateRoom,
    validateRoomId,
    validateHotelId,
    validateGetRooms
} = require('../../middelWare/roomValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/rooms
 * @desc    جلب جميع الغرف مع الباجينيشن والفلترة
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, status, type, hotelId
 */
router.get('/', managerAndAbove, validateGetRooms, getAllRooms);

/**
 * @route   GET /api/admin/rooms/hotel/:hotelId
 * @desc    جلب غرف فندق معين
 * @access  Manager and above
 * @params  page, limit, status, type
 */
router.get('/hotel/:hotelId', managerAndAbove, validateHotelId, validateGetRooms, getRoomsByHotelId);

/**
 * @route   GET /api/admin/rooms/:id
 * @desc    جلب غرفة واحدة بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validateRoomId, getRoomById);

/**
 * @route   POST /api/admin/rooms
 * @desc    إضافة غرفة جديدة
 * @access  Admin and above
 * @body    nameAr, nameEn?, numberRoom, status?, type, bedsCount?, hotelId, bookedFrom?, bookedTo?, bookingNote?, services?, roomImages[] (files)
 */
router.post('/', adminAndAbove, uploadRoomImages, validateAddRoom, addRoom);

/**
 * @route   PUT /api/admin/rooms/:id
 * @desc    تحديث بيانات الغرفة
 * @access  Admin and above
 * @body    nameAr?, nameEn?, numberRoom?, status?, type?, bedsCount?, bookedFrom?, bookedTo?, bookingNote?, services?, roomImages[]? (files)
 */
router.post('/:id', adminAndAbove, validateRoomId, uploadRoomImages, validateUpdateRoom, updateRoom);

/**
 * @route   DELETE /api/admin/rooms/:id
 * @desc    حذف الغرفة
 * @access  Admin and above
 */
router.delete('/:id', adminAndAbove, validateRoomId, deleteRoom);

module.exports = router;
