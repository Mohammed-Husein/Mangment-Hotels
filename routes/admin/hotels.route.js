const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllHotels,
    addHotel,
    getHotelById,
    updateHotel,
    deleteHotel
} = require('../../controllers/hotel.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد upload middleware
const { uploadHotelImage } = require('../../middelWare/hotelUploadMiddleware');

// استيراد validation middleware
const {
    validateAddHotel,
    validateUpdateHotel,
    validateChangeHotelStatus,
    validateHotelId,
    validateGetHotels
} = require('../../middelWare/hotelValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/hotels
 * @desc    جلب جميع الفنادق مع الباجينيشن والفلترة
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, isActive, countryId, cityId, governorateId, regionId
 */
router.get('/', managerAndAbove, validateGetHotels, getAllHotels);

/**
 * @route   GET /api/admin/hotels/:id
 * @desc    جلب فندق واحد بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validateHotelId, getHotelById);

/**
 * @route   POST /api/admin/hotels
 * @desc    إضافة فندق جديد
 * @access  Admin and above
 * @body    nameAr, nameEn?, status?, governorateId, regionId?, longitude?, latitude?, stars?, hotelImage (file)
 */
router.post('/', adminAndAbove, uploadHotelImage, validateAddHotel, addHotel);

/**
 * @route   PUT /api/admin/hotels/:id
 * @desc    تحديث بيانات الفندق
 * @access  Admin and above
 * @body    nameAr?, nameEn?, status?, governorateId?, regionId?, longitude?, latitude?, stars?, type?, hotelImage? (file)
 */
router.put('/:id', adminAndAbove, validateHotelId, uploadHotelImage, validateUpdateHotel, updateHotel);

/**
 * @route   PATCH /api/admin/hotels/:id/status
 * @desc    تغيير حالة الفندق
 * @access  Admin and above
 * @body    status
 */
// router.patch('/:id', adminAndAbove, validateHotelId, validateChangeHotelStatus, changeHotelStatus);
router.delete('/:id', adminAndAbove,  deleteHotel);

module.exports = router;
