const express = require('express');
const router = express.Router();

// استيراد روتات لوحة التحكم
const adminUsersRoutes = require('./admin/users.route');
const adminEmployeesRoutes = require('./admin/employees.route');
const adminCountriesRoutes = require('./admin/countries.route');
const adminGovernoratesRoutes = require('./admin/governorates.route');
const adminRegionsRoutes = require('./admin/regions.route');

// استيراد روتات تطبيق الموبايل
const mobileAuthRoutes = require('./mobile/auth.route');

// استيراد middleware معالجة الأخطاء
const { globalErrorHandler } = require('../utils/errorHandler');

// روتات لوحة التحكم
router.use('/admin/users', adminUsersRoutes);
router.use('/admin/employees', adminEmployeesRoutes);
router.use('/admin/countries', adminCountriesRoutes);
router.use('/admin/governorates', adminGovernoratesRoutes);
router.use('/admin/regions', adminRegionsRoutes);

// روتات تطبيق الموبايل
router.use('/mobile/auth', mobileAuthRoutes);

// روت افتراضي للتحقق من حالة API
router.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'مرحباً بك في API نظام إدارة حجوزات الفنادق',
        version: '1.0.0',
        endpoints: {
            admin: {
                users: '/api/admin/users',
                employees: '/api/admin/employees',
                countries: '/api/admin/countries',
                governorates: '/api/admin/governorates',
                regions: '/api/admin/regions'
            },
            mobile: {
                auth: '/api/mobile/auth'
            }
        }
    });
});

// معالج الأخطاء العام
router.use(globalErrorHandler);

module.exports = router;
