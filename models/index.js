// ملف فهرس النماذج - لتسهيل الاستيراد والإدارة

const User = require('./user.model');
const Country = require('./country.model');
const Governorate = require('./governorate.model');
const Region = require('./region.model');
const Hotel = require('./hotel.model');
const Room = require('./room.model');
const Service = require('./service.model');
const Booking = require('./booking.model');

module.exports = {
    User,
    Country,
    Governorate,
    Region,
    Hotel,
    Room,
    Service,
    Booking
};

// تصدير النماذج بشكل منفصل أيضاً للمرونة
module.exports.models = {
    User,
    Country,
    Governorate,
    Region,
    Hotel,
    Room,
    Service,
    Booking
};

// دالة مساعدة للحصول على جميع النماذج
module.exports.getAllModels = () => {
    return {
        User,
        Country,
        Governorate,
        Region,
        Hotel,
        Room,
        Service,
        Booking
    };
};

// دالة مساعدة لتهيئة الفهارس
module.exports.ensureIndexes = async () => {
    try {
        await Promise.all([
            User.ensureIndexes(),
            Country.ensureIndexes(),
            Governorate.ensureIndexes(),
            Region.ensureIndexes(),
            Hotel.ensureIndexes(),
            Room.ensureIndexes(),
            Service.ensureIndexes(),
            Booking.ensureIndexes()
        ]);
        console.log('✅ تم إنشاء جميع الفهارس بنجاح');
    } catch (error) {
        console.error('❌ خطأ في إنشاء الفهارس:', error);
        throw error;
    }
};

// دالة مساعدة لحذف جميع البيانات (للاختبار فقط)
module.exports.clearAllData = async () => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('لا يمكن حذف البيانات في بيئة الإنتاج');
    }

    try {
        // حذف البيانات بترتيب معين لتجنب مشاكل المراجع
        await Booking.deleteMany({});
        await Service.deleteMany({});
        await Room.deleteMany({});
        await Hotel.deleteMany({});
        await Region.deleteMany({});
        await Governorate.deleteMany({});
        await Country.deleteMany({});
        await User.deleteMany({});

        console.log('✅ تم حذف جميع البيانات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في حذف البيانات:', error);
        throw error;
    }
};
