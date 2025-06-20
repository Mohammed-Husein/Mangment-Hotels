const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    getAllGovernorates,
    getAllGovernorateNames,
    getGovernorateById,
    upsertGovernorate,
    deleteGovernorate
} = require('../../controllers/governorate.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد validation middleware
const {
    validateUpsertGovernorate,
    validateGovernorateId,
    validateGetGovernorates,
    validateGetGovernorateNames
} = require('../../middelWare/governorateValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/governorates
 * @desc    جلب جميع المحافظات مع الباجينيشن والبحث
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, countryId, isActive
 */
router.get('/', managerAndAbove, validateGetGovernorates, getAllGovernorates);

/**
 * @route   GET /api/admin/governorates/names
 * @desc    جلب جميع أسماء المحافظات مع المعرفات فقط
 * @access  Manager and above
 * @params  countryId, isActive
 */
router.get('/names', validateGetGovernorateNames, getAllGovernorateNames);

/**
 * @route   GET /api/admin/governorates/:id
 * @desc    جلب محافظة واحدة بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validateGovernorateId, getGovernorateById);

/**
 * @route   POST /api/admin/governorates/upsert
 * @desc    إضافة أو تحديث محافظة
 * @access  Admin and above
 * @body    id?: string, name: { ar: string, en?: string }, countryId: string
 */
router.post('/upsert', adminAndAbove, validateUpsertGovernorate, upsertGovernorate);

/**
 * @route   DELETE /api/admin/governorates/:id
 * @desc    حذف المحافظة
 * @access  Admin and above
 */
router.delete('/:id', adminAndAbove, validateGovernorateId, deleteGovernorate);

module.exports = router;
