/**
 * ملف اختبار سريع لـ API المستخدمين
 * يمكن تشغيله باستخدام: node test/userAPI.test.js
 */

const axios = require('axios');

// إعدادات الاختبار
const BASE_URL = 'http://localhost:5001/api';
let adminToken = '';
let customerToken = '';
let testUserId = '';

// دالة مساعدة للطباعة
const log = (message, data = '') => {
    console.log(`\n🔍 ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

const logError = (message, error) => {
    console.log(`\n❌ ${message}`);
    console.log(error.response?.data || error.message);
};

const logSuccess = (message, data = '') => {
    console.log(`\n✅ ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

// اختبار تسجيل دخول المدير
const testAdminLogin = async () => {
    try {
        log('اختبار تسجيل دخول المدير...');
        
        const response = await axios.post(`${BASE_URL}/mobile/auth/login`, {
            email: 'admin@hotel.com',
            password: 'admin123456'
        });
        
        adminToken = response.data.data.accessToken;
        logSuccess('تم تسجيل دخول المدير بنجاح', {
            user: response.data.data.user.fullName,
            role: response.data.data.user.role,
            userInfo: response.data.data.userInfo
        });
        
        return true;
    } catch (error) {
        logError('فشل تسجيل دخول المدير', error);
        return false;
    }
};

// اختبار تسجيل مستخدم جديد
const testUserRegistration = async () => {
    try {
        log('اختبار تسجيل مستخدم جديد...');
        
        const response = await axios.post(`${BASE_URL}/mobile/auth/register`, {
            fullName: 'أحمد محمد الاختبار',
            email: `test${Date.now()}@example.com`,
            phone: '+966501234567',
            password: 'Test123456',
            preferredLanguage: 'ar',
            location: {
                country: 'السعودية',
                city: 'الرياض'
            }
        });
        
        customerToken = response.data.data.accessToken;
        testUserId = response.data.data.user._id;

        logSuccess('تم تسجيل المستخدم بنجاح', {
            user: response.data.data.user.fullName,
            email: response.data.data.user.email,
            role: response.data.data.user.role,
            userInfo: response.data.data.userInfo
        });
        
        return true;
    } catch (error) {
        logError('فشل تسجيل المستخدم', error);
        return false;
    }
};

// اختبار جلب جميع المستخدمين مع الباجينيشن
const testGetAllUsers = async () => {
    try {
        log('اختبار جلب جميع المستخدمين مع الباجينيشن...');
        
        const response = await axios.get(`${BASE_URL}/admin/users?page=1&limit=5&sortBy=fullName&sortOrder=asc&search=أحمد`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        logSuccess('تم جلب المستخدمين بنجاح', {
            totalCount: response.data.pagination.totalCount,
            currentPage: response.data.pagination.currentPage,
            totalPages: response.data.pagination.totalPages,
            usersCount: response.data.data.length
        });
        
        return true;
    } catch (error) {
        logError('فشل جلب المستخدمين', error);
        return false;
    }
};

// اختبار إضافة مستخدم من لوحة التحكم
const testAddUserFromAdmin = async () => {
    try {
        log('اختبار إضافة مستخدم من لوحة التحكم...');
        
        const response = await axios.post(`${BASE_URL}/admin/users`, {
            fullName: 'موظف الاستقبال الاختبار',
            email: `receptionist${Date.now()}@hotel.com`,
            phone: '+966509876543',
            password: 'Receptionist123',
            role: 'RECEPTIONIST',
            preferredLanguage: 'ar'
        }, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        logSuccess('تم إضافة المستخدم من لوحة التحكم بنجاح', {
            user: response.data.data.user.fullName,
            email: response.data.data.user.email,
            role: response.data.data.user.role
        });
        
        return true;
    } catch (error) {
        logError('فشل إضافة المستخدم من لوحة التحكم', error);
        return false;
    }
};

// اختبار تحديث الملف الشخصي
const testUpdateProfile = async () => {
    try {
        log('اختبار تحديث الملف الشخصي...');
        
        const response = await axios.put(`${BASE_URL}/mobile/auth/profile`, {
            fullName: 'أحمد محمد المحدث',
            phone: '+966507654321',
            preferredLanguage: 'en'
        }, {
            headers: {
                Authorization: `Bearer ${customerToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        logSuccess('تم تحديث الملف الشخصي بنجاح', {
            user: response.data.data.user.fullName,
            phone: response.data.data.user.phone,
            language: response.data.data.user.preferredLanguage
        });
        
        return true;
    } catch (error) {
        logError('فشل تحديث الملف الشخصي', error);
        return false;
    }
};

// اختبار تحديث رمز الوصول
const testRefreshToken = async () => {
    try {
        log('اختبار تحديث رمز الوصول...');
        
        // أولاً نحصل على refresh token من تسجيل الدخول
        const loginResponse = await axios.post(`${BASE_URL}/mobile/auth/login`, {
            email: 'admin@hotel.com',
            password: 'admin123456'
        });
        
        const refreshToken = loginResponse.data.data.refreshToken;
        
        // ثم نستخدمه لتحديث رمز الوصول
        const response = await axios.post(`${BASE_URL}/mobile/auth/refresh-token`, {
            refreshToken: refreshToken
        });
        
        logSuccess('تم تحديث رمز الوصول بنجاح', {
            hasNewAccessToken: !!response.data.data.accessToken,
            hasNewRefreshToken: !!response.data.data.refreshToken
        });
        
        return true;
    } catch (error) {
        logError('فشل تحديث رمز الوصول', error);
        return false;
    }
};

// اختبار الحصول على الملف الشخصي
const testGetProfile = async () => {
    try {
        log('اختبار الحصول على الملف الشخصي...');
        
        const response = await axios.get(`${BASE_URL}/mobile/auth/profile`, {
            headers: {
                Authorization: `Bearer ${customerToken}`
            }
        });
        
        logSuccess('تم الحصول على الملف الشخصي بنجاح', {
            user: response.data.data.user.fullName,
            email: response.data.data.user.email,
            role: response.data.data.user.role
        });
        
        return true;
    } catch (error) {
        logError('فشل الحصول على الملف الشخصي', error);
        return false;
    }
};

// تشغيل جميع الاختبارات
const runAllTests = async () => {
    console.log('🚀 بدء اختبار API المستخدمين...');
    console.log('=' .repeat(50));
    
    const tests = [
        { name: 'تسجيل دخول المدير', fn: testAdminLogin },
        { name: 'تسجيل مستخدم جديد', fn: testUserRegistration },
        { name: 'جلب جميع المستخدمين', fn: testGetAllUsers },
        { name: 'إضافة مستخدم من لوحة التحكم', fn: testAddUserFromAdmin },
        { name: 'تحديث الملف الشخصي', fn: testUpdateProfile },
        { name: 'تحديث رمز الوصول', fn: testRefreshToken },
        { name: 'الحصول على الملف الشخصي', fn: testGetProfile }
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passedTests++;
            } else {
                failedTests++;
            }
        } catch (error) {
            failedTests++;
            logError(`خطأ في اختبار ${test.name}`, error);
        }
        
        // انتظار قصير بين الاختبارات
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 نتائج الاختبارات:');
    console.log(`✅ نجح: ${passedTests}`);
    console.log(`❌ فشل: ${failedTests}`);
    console.log(`📈 معدل النجاح: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    
    if (passedTests === tests.length) {
        console.log('\n🎉 جميع الاختبارات نجحت! النظام يعمل بشكل صحيح.');
    } else {
        console.log('\n⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.');
    }
};

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    runAllTests,
    testAdminLogin,
    testUserRegistration,
    testGetAllUsers,
    testAddUserFromAdmin,
    testUpdateProfile,
    testRefreshToken,
    testGetProfile
};
