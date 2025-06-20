/**
 * اختبار سريع للتحقق من إرجاع معلومات المستخدم في تسجيل الدخول والتسجيل
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

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

// اختبار تسجيل مستخدم جديد والتحقق من الاستجابة
const testRegisterResponse = async () => {
    try {
        log('اختبار تسجيل مستخدم جديد والتحقق من الاستجابة...');
        
        const response = await axios.post(`${BASE_URL}/mobile/auth/register`, {
            fullName: 'مستخدم اختبار الاستجابة',
            email: `testresponse${Date.now()}@example.com`,
            phone: '+966501111111',
            password: 'TestResponse123',
            preferredLanguage: 'ar'
        });
        
        // التحقق من وجود البيانات المطلوبة
        const data = response.data.data;
        
        if (!data.userInfo) {
            throw new Error('userInfo غير موجود في الاستجابة');
        }
        
        if (!data.userInfo.id || !data.userInfo.name || !data.userInfo.role) {
            throw new Error('معلومات المستخدم غير كاملة في userInfo');
        }
        
        logSuccess('تم تسجيل المستخدم بنجاح مع المعلومات المطلوبة', {
            userInfo: data.userInfo,
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
            hasUserObject: !!data.user
        });
        
        return { success: true, userInfo: data.userInfo, tokens: { access: data.accessToken, refresh: data.refreshToken } };
    } catch (error) {
        logError('فشل اختبار تسجيل المستخدم', error);
        return { success: false };
    }
};

// اختبار تسجيل الدخول والتحقق من الاستجابة
const testLoginResponse = async () => {
    try {
        log('اختبار تسجيل دخول المدير والتحقق من الاستجابة...');
        
        const response = await axios.post(`${BASE_URL}/mobile/auth/login`, {
            email: 'admin@hotel.com',
            password: 'admin123456'
        });
        
        // التحقق من وجود البيانات المطلوبة
        const data = response.data.data;
        
        if (!data.userInfo) {
            throw new Error('userInfo غير موجود في الاستجابة');
        }
        
        if (!data.userInfo.id || !data.userInfo.name || !data.userInfo.role) {
            throw new Error('معلومات المستخدم غير كاملة في userInfo');
        }
        
        logSuccess('تم تسجيل الدخول بنجاح مع المعلومات المطلوبة', {
            userInfo: data.userInfo,
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
            hasUserObject: !!data.user
        });
        
        return { success: true, userInfo: data.userInfo };
    } catch (error) {
        logError('فشل اختبار تسجيل الدخول', error);
        return { success: false };
    }
};

// اختبار مقارنة البيانات بين user و userInfo
const testDataConsistency = async () => {
    try {
        log('اختبار تطابق البيانات بين user و userInfo...');
        
        const response = await axios.post(`${BASE_URL}/mobile/auth/login`, {
            email: 'admin@hotel.com',
            password: 'admin123456'
        });
        
        const data = response.data.data;
        const user = data.user;
        const userInfo = data.userInfo;
        
        // التحقق من تطابق البيانات
        const isIdMatch = user._id === userInfo.id;
        const isNameMatch = user.fullName === userInfo.name;
        const isRoleMatch = user.role === userInfo.role;
        
        if (!isIdMatch || !isNameMatch || !isRoleMatch) {
            throw new Error('البيانات غير متطابقة بين user و userInfo');
        }
        
        logSuccess('البيانات متطابقة بين user و userInfo', {
            user: {
                id: user._id,
                name: user.fullName,
                role: user.role
            },
            userInfo: userInfo,
            matches: {
                id: isIdMatch,
                name: isNameMatch,
                role: isRoleMatch
            }
        });
        
        return { success: true };
    } catch (error) {
        logError('فشل اختبار تطابق البيانات', error);
        return { success: false };
    }
};

// تشغيل جميع الاختبارات
const runAuthResponseTests = async () => {
    console.log('🚀 بدء اختبار استجابات المصادقة...');
    console.log('=' .repeat(50));
    
    const tests = [
        { name: 'تسجيل مستخدم جديد', fn: testRegisterResponse },
        { name: 'تسجيل دخول المدير', fn: testLoginResponse },
        { name: 'تطابق البيانات', fn: testDataConsistency }
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result.success) {
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
    console.log('📊 نتائج اختبار استجابات المصادقة:');
    console.log(`✅ نجح: ${passedTests}`);
    console.log(`❌ فشل: ${failedTests}`);
    console.log(`📈 معدل النجاح: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    
    if (passedTests === tests.length) {
        console.log('\n🎉 جميع اختبارات الاستجابة نجحت!');
        console.log('✅ userInfo يتم إرجاعه بشكل صحيح');
        console.log('✅ البيانات متطابقة ومتسقة');
        console.log('✅ جميع الحقول المطلوبة موجودة (id, name, role)');
    } else {
        console.log('\n⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.');
    }
};

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
    runAuthResponseTests().catch(console.error);
}

module.exports = {
    runAuthResponseTests,
    testRegisterResponse,
    testLoginResponse,
    testDataConsistency
};
