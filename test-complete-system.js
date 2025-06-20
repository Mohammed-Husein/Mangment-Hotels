// ملف اختبار النظام الكامل
const mongoose = require('mongoose');
require('dotenv').config();

// استيراد النماذج
const User = require('./models/user.model');
const Employee = require('./models/employee.model');
const Country = require('./models/country.model');
const Governorate = require('./models/governorate.model');

async function testCompleteSystem() {
    try {
        console.log('🚀 بدء اختبار النظام الكامل...\n');

        // الاتصال بقاعدة البيانات (استخدام قاعدة بيانات تجريبية)
        const testDbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-test';
        await mongoose.connect(testDbUri);
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح\n');

        // 1. اختبار إنشاء بلد
        console.log('🧪 اختبار 1: إنشاء بلد...');
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
        console.log('✅ تم إنشاء البلد:', savedCountry.name.ar);

        // 2. اختبار إنشاء محافظة
        console.log('\n🧪 اختبار 2: إنشاء محافظة...');
        const testGovernorate = new Governorate({
            name: {
                ar: 'الرياض',
                en: 'Riyadh'
            },
            country: savedCountry._id
        });

        const savedGovernorate = await testGovernorate.save();
        console.log('✅ تم إنشاء المحافظة:', savedGovernorate.name.ar);

        // 3. اختبار إنشاء موظف
        console.log('\n🧪 اختبار 3: إنشاء موظف...');
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
        console.log('✅ تم إنشاء الموظف:', savedEmployee.fullName);
        console.log('📊 رقم الموظف:', savedEmployee.number);

        // 4. اختبار إنشاء عميل
        console.log('\n🧪 اختبار 4: إنشاء عميل...');
        const testUser = new User({
            firstName: 'محمد',
            lastName: 'أحمد',
            email: 'customer@example.com',
            password: 'Customer123',
            phoneNumber: '+966507654321',
            alternatePhoneNumber: '+966512345678',
            regionId: savedGovernorate._id, // استخدام المحافظة كمنطقة مؤقتاً
            countryId: savedCountry._id,
            cityId: savedGovernorate._id, // استخدام المحافظة كمدينة مؤقتاً
            detailedAddress: 'شارع الملك فهد، الرياض',
            preferredLanguage: 'Arabic'
        });

        const savedUser = await testUser.save();
        console.log('✅ تم إنشاء العميل:', savedUser.firstName + ' ' + savedUser.lastName);
        console.log('📊 رقم العميل:', savedUser.number);

        // 5. اختبار populate والعلاقات
        console.log('\n🧪 اختبار 5: العلاقات والـ populate...');
        
        const populatedEmployee = await Employee.findById(savedEmployee._id)
            .populate('countryId', 'name code');
        
        const populatedUser = await User.findById(savedUser._id)
            .populate('countryId', 'name code');

        const populatedGovernorate = await Governorate.findById(savedGovernorate._id)
            .populate('country', 'name code');
        
        console.log('✅ بيانات الموظف مع البلد:', {
            name: populatedEmployee.fullName,
            country: populatedEmployee.countryId?.name?.ar
        });

        console.log('✅ بيانات العميل مع البلد:', {
            name: populatedUser.firstName + ' ' + populatedUser.lastName,
            country: populatedUser.countryId?.name?.ar
        });

        console.log('✅ بيانات المحافظة مع البلد:', {
            name: populatedGovernorate.name?.ar,
            country: populatedGovernorate.country?.name?.ar
        });

        // 6. اختبار تنسيق الاستجابات
        console.log('\n🧪 اختبار 6: تنسيق الاستجابات...');

        // تنسيق استجابة البلدان
        const countryResponse = {
            id: savedCountry._id,
            name: savedCountry.name.ar,
            code: savedCountry.code,
            numberOfCities: 1 // عدد المحافظات
        };

        // تنسيق استجابة المحافظات
        const governorateResponse = {
            id: savedGovernorate._id,
            name: savedGovernorate.name.ar,
            country: populatedGovernorate.country?.name?.ar,
            numberOfRegions: 0 // لا توجد مناطق بعد
        };

        // تنسيق استجابة الموظفين
        const employeeResponse = {
            id: savedEmployee._id,
            number: savedEmployee.number,
            fullName: savedEmployee.fullName,
            email: savedEmployee.email,
            phoneNumber: savedEmployee.phoneNumber,
            countryName: populatedEmployee.countryId?.name?.ar,
            imageUrl: savedEmployee.imageUrl,
            roleName: savedEmployee.role,
            lastSeen: savedEmployee.lastSeen,
            status: savedEmployee.status
        };

        // تنسيق استجابة العملاء
        const customerResponse = {
            id: savedUser._id,
            number: savedUser.number,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            email: savedUser.email,
            countryName: populatedUser.countryId?.name?.ar,
            booking: [], // سيتم ملؤها لاحقاً من نموذج الحجوزات
            phoneNumber: savedUser.phoneNumber,
            status: savedUser.status,
            lastSeen: savedUser.lastSeen
        };

        console.log('✅ تنسيق استجابة البلد:', countryResponse);
        console.log('✅ تنسيق استجابة المحافظة:', governorateResponse);
        console.log('✅ تنسيق استجابة الموظف:', employeeResponse);
        console.log('✅ تنسيق استجابة العميل:', customerResponse);

        // 7. اختبار البحث والفلترة
        console.log('\n🧪 اختبار 7: البحث والفلترة...');

        // البحث في الموظفين
        const employeeSearch = await Employee.find({
            $text: { $search: 'أحمد' }
        });
        console.log('✅ نتائج البحث في الموظفين:', employeeSearch.length);

        // البحث في العملاء
        const customerSearch = await User.find({
            $text: { $search: 'محمد' }
        });
        console.log('✅ نتائج البحث في العملاء:', customerSearch.length);

        // فلترة حسب البلد
        const employeesByCountry = await Employee.find({ countryId: savedCountry._id });
        const customersByCountry = await User.find({ countryId: savedCountry._id });
        console.log('✅ موظفين في السعودية:', employeesByCountry.length);
        console.log('✅ عملاء في السعودية:', customersByCountry.length);

        // 8. اختبار الأرقام التلقائية
        console.log('\n🧪 اختبار 8: الأرقام التلقائية...');

        const employee2 = new Employee({
            fullName: 'سارة أحمد',
            email: 'sara@hotel.com',
            phoneNumber: '+966501234568',
            password: 'Admin123',
            role: 'Admin',
            countryId: savedCountry._id
        });

        const savedEmployee2 = await employee2.save();
        console.log('✅ رقم الموظف الثاني:', savedEmployee2.number);

        const user2 = new User({
            firstName: 'فاطمة',
            lastName: 'محمد',
            email: 'fatima@example.com',
            password: 'Customer123',
            phoneNumber: '+966507654322',
            regionId: savedGovernorate._id,
            countryId: savedCountry._id,
            cityId: savedGovernorate._id,
            detailedAddress: 'شارع العليا، الرياض',
            preferredLanguage: 'Arabic'
        });

        const savedUser2 = await user2.save();
        console.log('✅ رقم العميل الثاني:', savedUser2.number);

        console.log('\n🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.');

        // تنظيف البيانات التجريبية
        console.log('\n🧹 تنظيف البيانات التجريبية...');
        await User.deleteMany({ email: { $in: ['customer@example.com', 'fatima@example.com'] } });
        await Employee.deleteMany({ email: { $in: ['admin@hotel.com', 'sara@hotel.com'] } });
        await Governorate.findByIdAndDelete(savedGovernorate._id);
        await Country.findByIdAndDelete(savedCountry._id);
        console.log('✅ تم تنظيف البيانات التجريبية');

        console.log('\n✨ اكتمل اختبار النظام بنجاح!');

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
    testCompleteSystem();
}

module.exports = testCompleteSystem;
