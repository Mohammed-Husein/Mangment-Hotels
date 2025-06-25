const express = require('express');
const router = express.Router();
const path = require('path');

// استيراد روتات لوحة التحكم
const adminUsersRoutes = require('./admin/users.route');
const adminEmployeesRoutes = require('./admin/employees.route');
const adminCountriesRoutes = require('./admin/countries.route');
const adminGovernoratesRoutes = require('./admin/governorates.route');
const adminRegionsRoutes = require('./admin/regions.route');
const adminHotelsRoutes = require('./admin/hotels.route');
const adminRoomsRoutes = require('./admin/rooms.route');

const adminPaymentMethodsRoutes = require('./admin/paymentMethods.route');

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
router.use('/admin/hotels', adminHotelsRoutes);
router.use('/admin/payment-methods', adminPaymentMethodsRoutes);
router.use('/admin/rooms', adminRoomsRoutes);

const mobileRoomsRoutes = require('./mobile/rooms.route');

const mobileHotelsRoutes = require('./mobile/hotels.route');
const mobilePaymentMethodsRoutes = require('./mobile/paymentMethods.route');
// روتات تطبيق الموبايل
router.use('/mobile/auth', mobileAuthRoutes);
router.use('/mobile/hotels', mobileHotelsRoutes);
router.use('/mobile/payment-methods', mobilePaymentMethodsRoutes);
router.use('/mobile/rooms', mobileRoomsRoutes);

// روت افتراضي للتحقق من حالة API
router.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: ' اهلاً وسهلاً بكم في نظام ادارة الفنادق Mari    ',
        version: '1.0.0',
        endpoints: {
            admin: {
                users: '/api/admin/users',
                employees: '/api/admin/employees',
                countries: '/api/admin/countries',
                governorates: '/api/admin/governorates',
                regions: '/api/admin/regions',
                hotels: '/api/admin/hotels',
                paymentMethods: '/api/admin/payment-methods',
                   rooms: '/api/admin/rooms',
            },
            mobile: {
                auth: '/api/mobile/auth',
                 hotels: '/api/mobile/hotels',
                paymentMethods: '/api/mobile/payment-methods',
                  rooms: '/api/mobile/rooms',


            }
        }
    });
});

// معالج الأخطاء العام
router.use(globalErrorHandler);

module.exports = router;
