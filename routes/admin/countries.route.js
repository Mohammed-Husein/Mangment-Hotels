const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllCountries,
    getAllCountryNames,
    getCountryById,
    addCountry,
    updateCountry,
    deleteCountry
} = require('../../controllers/country.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateAddCountry,
    validateUpdateCountry,
    validateCountryId,
    validateGetCountries,
    validateGetCountryNames
} = require('../../middelWare/countryValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/countries
 * @desc    جلب جميع البلدان مع الباجينيشن والبحث
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, isActive
 */
router.get('/', managerAndAbove, validateGetCountries, getAllCountries);

/**
 * @route   GET /api/admin/countries/names
 * @desc    جلب جميع أسماء البلدان مع المعرفات فقط
 * @access  Manager and above
 * @params  isActive
 */
router.get('/names', validateGetCountryNames, getAllCountryNames);

/**
 * @route   GET /api/admin/countries/:id
 * @desc    جلب بلد واحد بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validateCountryId, getCountryById);

/**
 * @route   POST /api/admin/countries
 * @desc    إضافة بلد جديد
 * @access  Admin and above
 * @body    name: { ar: string, en?: string }, code: string
 */
router.post('/', adminAndAbove, validateAddCountry, addCountry);

/**
 * @route   PUT /api/admin/countries/:id
 * @desc    تحديث بيانات البلد
 * @access  Admin and above
 * @body    name?: { ar?: string, en?: string }, code?: string, phoneCode?: string, currency?: object, isActive?: boolean
 */
router.put('/:id', adminAndAbove, validateCountryId, validateUpdateCountry, updateCountry);

/**
 * @route   DELETE /api/admin/countries/:id
 * @desc    حذف البلد
 * @access  Admin and above
 */
router.delete('/:id', adminAndAbove, validateCountryId, deleteCountry);

module.exports = router;
