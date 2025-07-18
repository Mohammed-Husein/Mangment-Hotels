const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllHotels,
    getAllHotelNames,
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
    validateGetHotels,
    validateGetHotelNames
} = require('../../middelWare/hotelValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin

/**
 * @route   GET /api/admin/hotels
 * @desc    جلب جميع الفنادق مع الباجينيشن والفلترة
 * @access  Admin and above
 * @params  page, limit, sortBy, sortOrder, search, isActive, countryId, cityId, governorateId, regionId, employeeId
 */
router.get('/', adminAndAbove, validateGetHotels, getAllHotels);

/**
 * @route   GET /api/admin/hotels/GetAllNames
 * @desc    جلب أسماء ومعرفات جميع الفنادق فقط
 * @access  Admin and above
 * @params  countryId?, governorateId?, regionId?
 */
router.get('/GetAllNames', adminAndAbove, validateGetHotelNames, getAllHotelNames);

/**
 * @route   GET /api/admin/hotels/:id
 * @desc    جلب فندق واحد بالمعرف
 * @access  Admin and above
 */
router.get('/:id', adminAndAbove, validateHotelId, getHotelById);

/**
 * @route   POST /api/admin/hotels
 * @desc    إضافة فندق جديد
 * @access  Admin and above
 * @body    nameAr, nameEn?, countryId, governorateId, regionId, longitude?, latitude?, isActive?, imagefile (file)
 */
router.post('/', adminAndAbove, uploadHotelImage, validateAddHotel, addHotel);

/**
 * @route   POST /api/admin/hotels/update/:id
 * @desc    تحديث بيانات الفندق
 * @access  Admin and above
 * @body    namear?, nameEn?, countryId?, governorateId?, cityId?, regionId?, longitude?, latitude?, isActive?, imagefile? (file), deleteImage? (string)
 */
router.post('/update/:id', adminAndAbove, validateHotelId, uploadHotelImage, validateUpdateHotel, updateHotel);

/**
 * @route   DELETE /api/admin/hotels/:id
 * @desc    حذف فندق
 * @access  Admin and above
 */
router.delete('/:id', adminAndAbove, validateHotelId, deleteHotel);

// إصلاح مسارات الصور المكررة
router.post('/fix-images', adminAndAbove, async (req, res) => {
    try {
        const { fixDuplicateImagePaths } = require('../../scripts/fixHotelImages');
        await fixDuplicateImagePaths();
        res.json({
            status: 'success',
            message: 'تم إصلاح مسارات الصور بنجاح'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'حدث خطأ في إصلاح مسارات الصور',
            error: error.message
        });
    }
});

module.exports = router;
