const Country = require('../models/country.model');
const Governorate = require('../models/governorate.model');
const Region = require('../models/region.model');
const Employee = require('../models/employee.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// دالة تشفير كلمة المرور
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

// دالة إنشاء البيانات الأساسية
const createBasicData = async () => {
    try {
        console.log('🚀 بدء إنشاء البيانات الأساسية...');

        // 1. إنشاء بلد واحد
        console.log('🌍 إنشاء البلد...');
        let country = await Country.findOne({ code: 'SA' });
        if (!country) {
            country = await Country.create({
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
                },
                isActive: true
            });
            console.log('✅ تم إنشاء البلد: المملكة العربية السعودية');
        } else {
            console.log('⚠️ البلد موجود مسبقاً: المملكة العربية السعودية');
        }

        // 2. إنشاء محافظة واحدة
        console.log('🏛️ إنشاء المحافظة...');
        let governorate = await Governorate.findOne({ 
            country: country._id, 
            'name.ar': 'الرياض' 
        });
        if (!governorate) {
            governorate = await Governorate.create({
                name: {
                    ar: 'الرياض',
                    en: 'Riyadh'
                },
                country: country._id,
                isActive: true
            });
            console.log('✅ تم إنشاء المحافظة: الرياض');
        } else {
            console.log('⚠️ المحافظة موجودة مسبقاً: الرياض');
        }

        // 3. إنشاء منطقة واحدة
        console.log('🏘️ إنشاء المنطقة...');
        let region = await Region.findOne({ 
            governorate: governorate._id, 
            'name.ar': 'وسط الرياض' 
        });
        if (!region) {
            region = await Region.create({
                name: {
                    ar: 'وسط الرياض',
                    en: 'Central Riyadh'
                },
                governorate: governorate._id,
                isActive: true
            });
            console.log('✅ تم إنشاء المنطقة: وسط الرياض');
        } else {
            console.log('⚠️ المنطقة موجودة مسبقاً: وسط الرياض');
        }

        // 4. إنشاء موظف واحد (SuperAdmin)
        console.log('👤 إنشاء الموظف...');
        let employee = await Employee.findOne({ email: 'admin@hotel.com' });
        if (!employee) {
            const hashedPassword = await hashPassword('Admin123456');
            employee = await Employee.create({
                fullName: 'أحمد محمد الإداري',
                email: 'admin@hotel.com',
                phoneNumber: '+966501234567',
                password: hashedPassword,
                role: 'SuperAdmin',
                countryId: country._id,
                status: 'Active',
                permissions: ['all'],
                isActive: true
            });
            console.log('✅ تم إنشاء الموظف: أحمد محمد الإداري');
            console.log('📧 البريد الإلكتروني: admin@hotel.com');
            console.log('🔑 كلمة المرور: Admin123456');
            console.log('📊 رقم الموظف:', employee.number);
        } else {
            console.log('⚠️ الموظف موجود مسبقاً: admin@hotel.com');
        }

        // 5. إنشاء عميل واحد
        console.log('👥 إنشاء العميل...');
        let customer = await User.findOne({ email: 'customer@example.com' });
        if (!customer) {
            const hashedPassword = await hashPassword('Customer123');
            customer = await User.create({
                firstName: 'محمد',
                lastName: 'أحمد العميل',
                email: 'customer@example.com',
                phoneNumber: '+966507654321',
                password: hashedPassword,
                alternatePhoneNumber: '+966512345678',
                regionId: region._id,
                countryId: country._id,
                cityId: governorate._id,
                detailedAddress: 'شارع الملك فهد، حي العليا، الرياض',
                preferredLanguage: 'Arabic',
                status: 'Active',
                isActive: true
            });
            console.log('✅ تم إنشاء العميل: محمد أحمد العميل');
            console.log('📧 البريد الإلكتروني: customer@example.com');
            console.log('🔑 كلمة المرور: Customer123');
            console.log('📊 رقم العميل:', customer.number);
        } else {
            console.log('⚠️ العميل موجود مسبقاً: customer@example.com');
        }

        console.log('\n🎉 تم إنشاء جميع البيانات الأساسية بنجاح!');
        console.log('\n📋 ملخص البيانات المنشأة:');
        console.log(`🌍 البلد: ${country.name.ar} (${country.code})`);
        console.log(`🏛️ المحافظة: ${governorate.name.ar}`);
        console.log(`🏘️ المنطقة: ${region.name.ar}`);
        console.log(`👤 الموظف: ${employee.fullName} - ${employee.email}`);
        console.log(`👥 العميل: ${customer.firstName} ${customer.lastName} - ${customer.email}`);

        return {
            country,
            governorate,
            region,
            employee,
            customer
        };

    } catch (error) {
        console.error('❌ خطأ في إنشاء البيانات الأساسية:', error);
        throw error;
    }
};

// دالة حذف جميع البيانات
const clearAllData = async () => {
    try {
        console.log('🗑️ بدء حذف جميع البيانات...');

        await User.deleteMany({});
        console.log('✅ تم حذف جميع العملاء');

        await Employee.deleteMany({});
        console.log('✅ تم حذف جميع الموظفين');

        await Region.deleteMany({});
        console.log('✅ تم حذف جميع المناطق');

        await Governorate.deleteMany({});
        console.log('✅ تم حذف جميع المحافظات');

        await Country.deleteMany({});
        console.log('✅ تم حذف جميع البلدان');

        console.log('🎉 تم حذف جميع البيانات بنجاح!');
        return true;

    } catch (error) {
        console.error('❌ خطأ في حذف البيانات:', error);
        throw error;
    }
};

// دالة إعادة تعيين البيانات (حذف ثم إنشاء)
const resetData = async () => {
    try {
        console.log('🔄 بدء إعادة تعيين البيانات...');
        
        await clearAllData();
        const result = await createBasicData();
        
        console.log('🎉 تم إعادة تعيين البيانات بنجاح!');
        return result;

    } catch (error) {
        console.error('❌ خطأ في إعادة تعيين البيانات:', error);
        throw error;
    }
};

// دالة عرض إحصائيات البيانات
const showDataStats = async () => {
    try {
        console.log('📊 إحصائيات البيانات الحالية:');
        
        const countriesCount = await Country.countDocuments();
        const governoratesCount = await Governorate.countDocuments();
        const regionsCount = await Region.countDocuments();
        const employeesCount = await Employee.countDocuments();
        const customersCount = await User.countDocuments();

        console.log(`🌍 البلدان: ${countriesCount}`);
        console.log(`🏛️ المحافظات: ${governoratesCount}`);
        console.log(`🏘️ المناطق: ${regionsCount}`);
        console.log(`👤 الموظفين: ${employeesCount}`);
        console.log(`👥 العملاء: ${customersCount}`);

        return {
            countries: countriesCount,
            governorates: governoratesCount,
            regions: regionsCount,
            employees: employeesCount,
            customers: customersCount
        };

    } catch (error) {
        console.error('❌ خطأ في عرض الإحصائيات:', error);
        throw error;
    }
};

module.exports = {
    createBasicData,
    clearAllData,
    resetData,
    showDataStats
};
