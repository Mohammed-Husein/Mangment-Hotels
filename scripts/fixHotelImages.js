const mongoose = require('mongoose');
const Hotel = require('../models/hotel.model');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hotels-management');
        console.log('تم الاتصال بقاعدة البيانات بنجاح');
    } catch (error) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', error);
        process.exit(1);
    }
};

// إصلاح مسارات الصور المكررة
const fixDuplicateImagePaths = async () => {
    try {
        console.log('بدء إصلاح مسارات الصور...');
        
        // البحث عن الفنادق التي تحتوي على مسارات مكررة
        const hotels = await Hotel.find({
            images: { $regex: /^uploads\/hotels\/uploads\/hotels\// }
        });
        
        console.log(`تم العثور على ${hotels.length} فندق يحتوي على مسارات مكررة`);
        
        for (const hotel of hotels) {
            const fixedImages = hotel.images.map(imagePath => {
                // إزالة التكرار من المسار
                if (imagePath.startsWith('uploads/hotels/uploads/hotels/')) {
                    return imagePath.replace('uploads/hotels/uploads/hotels/', 'uploads/hotels/');
                }
                return imagePath;
            });
            
            // تحديث الفندق بالمسارات المصححة
            await Hotel.findByIdAndUpdate(hotel._id, { images: fixedImages });
            console.log(`تم إصلاح مسارات الصور للفندق: ${hotel.name?.ar || hotel.name?.en || hotel._id}`);
        }
        
        console.log('تم إصلاح جميع مسارات الصور بنجاح');
    } catch (error) {
        console.error('خطأ في إصلاح مسارات الصور:', error);
    }
};

// تشغيل السكريبت
const runScript = async () => {
    await connectDB();
    await fixDuplicateImagePaths();
    await mongoose.connection.close();
    console.log('تم إغلاق الاتصال بقاعدة البيانات');
    process.exit(0);
};

// تشغيل السكريبت إذا تم استدعاؤه مباشرة
if (require.main === module) {
    runScript();
}

module.exports = { fixDuplicateImagePaths };
