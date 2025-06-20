// ملف اختبار النظام الجديد
const mongoose = require('mongoose');
require('dotenv').config();

// استيراد النماذج
const User = require('./models/user.model');
const Employee = require('./models/employee.model');
const Country = require('./models/country.model');

async function testSystem() {
    try {
        // الاتصال بقاعدة البيانات
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

        // اختبار إنشاء بلد
        console.log('\n🧪 اختبار إنشاء بلد...');
        const testCountry = new Country({
            name: {
                ar: 'المملكة العربية السعودية',
                en: 'Saudi Arabia'
            },
            code: 'SA',
            phoneCode: '+966',
            currency: {
                code: 'SAR',
                name: {
                    ar: 'ريال سعودي',
                    en: 'Saudi Riyal'
                },
                symbol: 'ر.س'
            }
        });

        const savedCountry = await testCountry.save();
        console.log('✅ تم إنشاء البلد بنجاح:', savedCountry.name.ar);

        // اختبار إنشاء موظف
        console.log('\n🧪 اختبار إنشاء موظف...');
        const testEmployee = new Employee({
            fullName: 'أحمد محمد السعودي',
            email: 'admin@hotel.com',
            phoneNumber: '+966501234567',
            password: 'Admin123',
            role: 'SuperAdmin',
            countryId: savedCountry._id,
            status: 'Active',
            permissions: ['all'],
            deviceToken: 'test-device-token'
        });

        const savedEmployee = await testEmployee.save();
        console.log('✅ تم إنشاء الموظف بنجاح:', savedEmployee.fullName);
        console.log('📊 رقم الموظف:', savedEmployee.number);

        // اختبار إنشاء عميل
        console.log('\n🧪 اختبار إنشاء عميل...');
        const testUser = new User({
            firstName: 'محمد',
            lastName: 'أحمد',
            email: 'customer@example.com',
            password: 'Customer123',
            phoneNumber: '+966507654321',
            alternatePhoneNumber: '+966512345678',
            regionId: savedCountry._id, // مؤقتاً نستخدم البلد
            countryId: savedCountry._id,
            cityId: savedCountry._id, // مؤقتاً نستخدم البلد
            detailedAddress: 'شارع الملك فهد، الرياض',
            preferredLanguage: 'Arabic'
        });

        const savedUser = await testUser.save();
        console.log('✅ تم إنشاء العميل بنجاح:', savedUser.fullName);
        console.log('📊 رقم العميل:', savedUser.number);

        // اختبار populate
        console.log('\n🧪 اختبار populate...');
        const populatedEmployee = await Employee.findById(savedEmployee._id)
            .populate('countryId', 'name code');
        
        console.log('✅ بيانات الموظف مع البلد:', {
            name: populatedEmployee.fullName,
            country: populatedEmployee.countryId?.name?.ar
        });

        const populatedUser = await User.findById(savedUser._id)
            .populate('countryId', 'name code');
        
        console.log('✅ بيانات العميل مع البلد:', {
            name: populatedUser.fullName,
            country: populatedUser.countryId?.name?.ar
        });

        // اختبار تنسيق الاستجابة للعملاء
        console.log('\n🧪 اختبار تنسيق استجابة العملاء...');
        const customerResponse = {
            id: savedUser._id,
            number: savedUser.number,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            email: savedUser.email,
            countryName: populatedUser.countryId?.name?.ar || 'غير محدد',
            booking: [], // سيتم ملؤها لاحقاً من نموذج الحجوزات
            phoneNumber: savedUser.phoneNumber,
            status: savedUser.status,
            lastSeen: savedUser.lastSeen
        };

        console.log('✅ تنسيق استجابة العميل:', customerResponse);

        // اختبار تنسيق الاستجابة للموظفين
        console.log('\n🧪 اختبار تنسيق استجابة الموظفين...');
        const employeeResponse = {
            id: savedEmployee._id,
            number: savedEmployee.number,
            fullName: savedEmployee.fullName,
            email: savedEmployee.email,
            phoneNumber: savedEmployee.phoneNumber,
            countryName: populatedEmployee.countryId?.name?.ar || 'غير محدد',
            imageUrl: savedEmployee.imageUrl,
            roleName: savedEmployee.role,
            lastSeen: savedEmployee.lastSeen,
            status: savedEmployee.status
        };

        console.log('✅ تنسيق استجابة الموظف:', employeeResponse);

        console.log('\n🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.');

        // تنظيف البيانات التجريبية
        console.log('\n🧹 تنظيف البيانات التجريبية...');
        await User.findByIdAndDelete(savedUser._id);
        await Employee.findByIdAndDelete(savedEmployee._id);
        await Country.findByIdAndDelete(savedCountry._id);
        console.log('✅ تم تنظيف البيانات التجريبية');

    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    }
}

// تشغيل الاختبار
if (require.main === module) {
    testSystem();
}

module.exports = testSystem;
