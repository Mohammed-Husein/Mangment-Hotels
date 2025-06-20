/**
 * ملف اختبار للتوابع الجديدة للمستخدمين
 * GetUserById, UpdateUser, GetAllUserNames, ChangeStatus
 */

const axios = require('axios');

// إعدادات الاختبار
const BASE_URL = 'http://localhost:5001/api';
let adminToken = '';
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

// تسجيل دخول المدير للحصول على token
const loginAdmin = async () => {
    try {
        const response = await axios.post(`${BASE_URL}/mobile/auth/login`, {
            email: 'admin@hotel.com',
            password: 'admin123456'
        });
        
        adminToken = response.data.data.accessToken;
        logSuccess('تم تسجيل دخول المدير بنجاح');
        return true;
    } catch (error) {
        logError('فشل تسجيل دخول المدير', error);
        return false;
    }
};

// إنشاء مستخدم للاختبار
const createTestUser = async () => {
    try {
        const response = await axios.post(`${BASE_URL}/admin/users`, {
            fullName: 'مستخدم الاختبار الجديد',
            email: `testuser${Date.now()}@example.com`,
            phone: '+966501111111',
            password: 'TestUser123',
            role: 'CUSTOMER',
            preferredLanguage: 'ar'
        }, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        testUserId = response.data.data.user._id;
        logSuccess('تم إنشاء مستخدم للاختبار', {
            id: testUserId,
            name: response.data.data.user.fullName
        });
        return true;
    } catch (error) {
        logError('فشل إنشاء مستخدم للاختبار', error);
        return false;
    }
};

// اختبار GetUserById
const testGetUserById = async () => {
    try {
        log('اختبار GetUserById...');
        
        const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/details`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        logSuccess('تم جلب المستخدم بالمعرف بنجاح', {
            id: response.data.data.user._id,
            name: response.data.data.user.fullName,
            email: response.data.data.user.email,
            role: response.data.data.user.role,
            isActive: response.data.data.user.isActive
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار GetUserById', error);
        return false;
    }
};

// اختبار UpdateUser (الطريقة المحسنة)
const testUpdateUser = async () => {
    try {
        log('اختبار UpdateUser المحسن...');
        
        const response = await axios.put(`${BASE_URL}/admin/users/${testUserId}/update`, {
            fullName: 'مستخدم الاختبار المحدث',
            phone: '+966502222222',
            preferredLanguage: 'en',
            location: {
                country: 'السعودية',
                city: 'جدة'
            }
        }, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        logSuccess('تم تحديث المستخدم بنجاح', {
            id: response.data.data.user._id,
            name: response.data.data.user.fullName,
            phone: response.data.data.user.phone,
            language: response.data.data.user.preferredLanguage,
            location: response.data.data.user.location
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار UpdateUser', error);
        return false;
    }
};

// اختبار GetAllUserNames
const testGetAllUserNames = async () => {
    try {
        log('اختبار GetAllUserNames...');
        
        // اختبار بدون فلاتر
        const response1 = await axios.get(`${BASE_URL}/admin/users/names`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        logSuccess('تم جلب جميع أسماء المستخدمين بنجاح', {
            totalCount: response1.data.data.count,
            firstFewUsers: response1.data.data.users.slice(0, 3)
        });
        
        // اختبار مع فلاتر
        const response2 = await axios.get(`${BASE_URL}/admin/users/names?role=CUSTOMER&isActive=true`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        logSuccess('تم جلب أسماء العملاء النشطين بنجاح', {
            customersCount: response2.data.data.count,
            firstFewCustomers: response2.data.data.users.slice(0, 2)
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار GetAllUserNames', error);
        return false;
    }
};

// اختبار ChangeStatus (حظر المستخدم)
const testChangeStatusBlock = async () => {
    try {
        log('اختبار ChangeStatus - حظر المستخدم...');
        
        const response = await axios.put(`${BASE_URL}/admin/users/${testUserId}/change-status`, {
            isActive: false,
            reason: 'اختبار نظام الحظر - مخالفة شروط الاستخدام'
        }, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        logSuccess('تم حظر المستخدم بنجاح', {
            id: response.data.data.user._id,
            name: response.data.data.user.fullName,
            isActive: response.data.data.user.isActive,
            action: response.data.data.action,
            reason: response.data.data.reason,
            timestamp: response.data.data.timestamp
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار حظر المستخدم', error);
        return false;
    }
};

// اختبار ChangeStatus (إلغاء حظر المستخدم)
const testChangeStatusUnblock = async () => {
    try {
        log('اختبار ChangeStatus - إلغاء حظر المستخدم...');
        
        const response = await axios.put(`${BASE_URL}/admin/users/${testUserId}/change-status`, {
            isActive: true,
            reason: 'تم حل المشكلة - إعادة تفعيل الحساب'
        }, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        logSuccess('تم إلغاء حظر المستخدم بنجاح', {
            id: response.data.data.user._id,
            name: response.data.data.user.fullName,
            isActive: response.data.data.user.isActive,
            action: response.data.data.action,
            reason: response.data.data.reason,
            timestamp: response.data.data.timestamp
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار إلغاء حظر المستخدم', error);
        return false;
    }
};

// اختبار التحقق من المستخدم بعد التحديثات
const testFinalUserState = async () => {
    try {
        log('اختبار الحالة النهائية للمستخدم...');
        
        const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/details`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        logSuccess('الحالة النهائية للمستخدم', {
            id: response.data.data.user._id,
            name: response.data.data.user.fullName,
            email: response.data.data.user.email,
            phone: response.data.data.user.phone,
            role: response.data.data.user.role,
            isActive: response.data.data.user.isActive,
            language: response.data.data.user.preferredLanguage,
            location: response.data.data.user.location,
            lastUpdate: response.data.data.user.updatedAt
        });
        
        return true;
    } catch (error) {
        logError('فشل اختبار الحالة النهائية', error);
        return false;
    }
};

// تشغيل جميع الاختبارات
const runNewFunctionsTests = async () => {
    console.log('🚀 بدء اختبار التوابع الجديدة للمستخدمين...');
    console.log('=' .repeat(60));
    
    const tests = [
        { name: 'تسجيل دخول المدير', fn: loginAdmin },
        { name: 'إنشاء مستخدم للاختبار', fn: createTestUser },
        { name: 'اختبار GetUserById', fn: testGetUserById },
        { name: 'اختبار UpdateUser', fn: testUpdateUser },
        { name: 'اختبار GetAllUserNames', fn: testGetAllUserNames },
        { name: 'اختبار ChangeStatus - حظر', fn: testChangeStatusBlock },
        { name: 'اختبار ChangeStatus - إلغاء حظر', fn: testChangeStatusUnblock },
        { name: 'اختبار الحالة النهائية', fn: testFinalUserState }
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
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 نتائج اختبار التوابع الجديدة:');
    console.log(`✅ نجح: ${passedTests}`);
    console.log(`❌ فشل: ${failedTests}`);
    console.log(`📈 معدل النجاح: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    
    if (passedTests === tests.length) {
        console.log('\n🎉 جميع التوابع الجديدة تعمل بشكل صحيح!');
        console.log('✅ GetUserById - يعمل');
        console.log('✅ UpdateUser - يعمل');
        console.log('✅ GetAllUserNames - يعمل');
        console.log('✅ ChangeStatus - يعمل');
    } else {
        console.log('\n⚠️ بعض التوابع تحتاج مراجعة. يرجى مراجعة الأخطاء أعلاه.');
    }
};

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
    runNewFunctionsTests().catch(console.error);
}

module.exports = {
    runNewFunctionsTests,
    testGetUserById,
    testUpdateUser,
    testGetAllUserNames,
    testChangeStatusBlock,
    testChangeStatusUnblock
};
