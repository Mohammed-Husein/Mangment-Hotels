const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllRegions,
    getAllRegionNames,
    getCitiesByCountry,
    getRegionById,
    addRegion,
    updateRegion,
    deleteRegion
} = require('../../controllers/region.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateAddRegion,
    validateUpdateRegion,
    validateRegionId,
    validateGetRegions,
    validateGetRegionNames,
    validateGetCities
} = require('../../middelWare/regionValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/regions
 * @desc    جلب جميع المناطق مع الباجينيشن والبحث
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, governorateId, countryId, isActive
 */
router.get('/', managerAndAbove, validateGetRegions, getAllRegions);

/**
 * @route   GET /api/admin/regions/names
 * @desc    جلب جميع أسماء المناطق مع المعرفات والمحافظة والبلد
 * @access  Manager and above
 * @params  governorateId, countryId, isActive
 */
router.get('/names', validateGetRegionNames, getAllRegionNames);

/**
 * @route   GET /api/admin/regions/cities
 * @desc    جلب أسماء المدن (المحافظات) حسب البلد
 * @access  Manager and above
 * @params  countryId (required), isActive
 */
router.get('/cities', managerAndAbove, validateGetCities, getCitiesByCountry);

/**
 * @route   GET /api/admin/regions/:id
 * @desc    جلب منطقة واحدة بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validateRegionId, getRegionById);

/**
 * @route   POST /api/admin/regions
 * @desc    إضافة منطقة جديدة
 * @access  Admin and above
 * @body    name: { ar: string, en?: string }, governorateId: string, countryId: string
 */
router.post('/', adminAndAbove, validateAddRegion, addRegion);

/**
 * @route   PUT /api/admin/regions/:id
 * @desc    تحديث بيانات المنطقة
 * @access  Admin and above
 * @body    name?: { ar?: string, en?: string }, governorateId?: string, countryId?: string
 */
router.put('/:id', adminAndAbove, validateRegionId, validateUpdateRegion, updateRegion);

/**
 * @route   DELETE /api/admin/regions/:id
 * @desc    حذف المنطقة
 * @access  Admin and above
 */
router.delete('/:id', adminAndAbove, validateRegionId, deleteRegion);

module.exports = router;
