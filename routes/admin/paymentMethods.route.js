const express = require('express');
const router = express.Router();

// استيراد controllers
const {
    addPaymentMethod,
    getAllPaymentMethods,
    getPaymentMethodById,
    updatePaymentMethod,
    getAllPaymentMethodNames,
    deletePayment
} = require('../../controllers/paymentMethod.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');
const allowedTo = require('../../middelWare/allowedTo');

// استيراد upload middleware
const { uploadPaymentMethodIcon } = require('../../middelWare/paymentMethodUploadMiddleware');

// استيراد validation middleware
const {
    validateAddPaymentMethod,
    validateUpdatePaymentMethod,
    validatePaymentMethodId,
    validateGetPaymentMethods,
    validateGetPaymentMethodNames
} = require('../../middelWare/paymentMethodValidation');

// أدوار الموظفين
const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor'];

// middleware للتحقق من الصلاحيات
const adminAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1])]; // SuperAdmin, Admin
const managerAndAbove = [verifyToken, allowedTo(employeeRoles[0], employeeRoles[1], employeeRoles[2])]; // SuperAdmin, Admin, Manager

/**
 * @route   GET /api/admin/payment-methods/names
 * @desc    جلب أسماء طرق الدفع فقط
 * @access  Manager and above
 * @params  activeOnly (boolean, default: true)
 */
router.get('/names', validateGetPaymentMethodNames, getAllPaymentMethodNames);

/**
 * @route   GET /api/admin/payment-methods
 * @desc    جلب جميع طرق الدفع مع الباجينيشن والبحث
 * @access  Manager and above
 * @params  page, limit, sortBy, sortOrder, search, isActive
 */
router.get('/',managerAndAbove, validateGetPaymentMethods, getAllPaymentMethods);

/**
 * @route   GET /api/admin/payment-methods/:id
 * @desc    جلب طريقة دفع واحدة بالمعرف
 * @access  Manager and above
 */
router.get('/:id', managerAndAbove, validatePaymentMethodId, getPaymentMethodById);

/**
 * @route   POST /api/admin/payment-methods
 * @desc    إضافة طريقة دفع جديدة
 * @access  Admin and above
 * @body    nameAr, nameEn, code, descriptionAr?, descriptionEn?, displayOrder?, isActive?, icon? (file), metadata?
 */
router.post('/', adminAndAbove, uploadPaymentMethodIcon, validateAddPaymentMethod, addPaymentMethod);

/**
 * @route   PUT /api/admin/payment-methods/:id
 * @desc    تحديث بيانات طريقة الدفع
 * @access  Admin and above
 * @body    nameAr?, nameEn?, code?, descriptionAr?, descriptionEn?, displayOrder?, isActive?, icon? (file), metadata?
 */
router.put('/:id', adminAndAbove, validatePaymentMethodId, uploadPaymentMethodIcon, validateUpdatePaymentMethod, updatePaymentMethod);
router.delete('/:id' , deletePayment)
module.exports = router;
