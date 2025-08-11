const cron = require('node-cron');
const { Booking, Room } = require('../models');

/**
 * تحديث حالة الغرف تلقائياً بناءً على انتهاء فترة الحجز
 * يتم تشغيل هذه الوظيفة كل ساعة
 */
const updateRoomStatus = async () => {
    try {
        console.log('🔄 بدء تحديث حالة الغرف...');
        
        const now = new Date();
        
        // البحث عن الغرف التي انتهت فترة حجزها
        const roomsToUpdate = await Room.find({
            'futureBooking.isBooked': true,
            'futureBooking.bookedTo': { $lt: now }
        });
        
        console.log(`📊 تم العثور على ${roomsToUpdate.length} غرفة تحتاج لتحديث الحالة`);
        
        // تحديث حالة الغرف
        for (const room of roomsToUpdate) {
            // التحقق من عدم وجود حجوزات نشطة للغرفة
            const activeBookings = await Booking.find({
                room: room._id,
                status: { $in: ['pending', 'confirmed', 'checked_in'] },
                checkOutDate: { $gt: now }
            });
            
            if (activeBookings.length === 0) {
                // لا توجد حجوزات نشطة، تحديث الغرفة إلى متاحة
                await Room.findByIdAndUpdate(room._id, {
                    status: 'Available',
                    'futureBooking.isBooked': false,
                    'futureBooking.bookedFrom': null,
                    'futureBooking.bookedTo': null,
                    'futureBooking.bookingNote': ''
                });
                
                console.log(`✅ تم تحديث الغرفة ${room.numberRoom} إلى متاحة`);
            } else {
                // توجد حجوزات نشطة، تحديث معلومات الحجز المستقبلي
                const nextBooking = activeBookings.sort((a, b) => a.checkInDate - b.checkInDate)[0];
                
                await Room.findByIdAndUpdate(room._id, {
                    'futureBooking.bookedFrom': nextBooking.checkInDate,
                    'futureBooking.bookedTo': nextBooking.checkOutDate,
                    'futureBooking.bookingNote': `حجز رقم: ${nextBooking.bookingNumber}`
                });
                
                console.log(`🔄 تم تحديث معلومات الحجز المستقبلي للغرفة ${room.numberRoom}`);
            }
        }
        
        console.log('✅ تم الانتهاء من تحديث حالة الغرف');
        
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الغرف:', error);
    }
};

/**
 * تحديث حالة الحجوزات تلقائياً
 * يتم تشغيل هذه الوظيفة كل 30 دقيقة
 */
const updateBookingStatus = async () => {
    try {
        console.log('🔄 بدء تحديث حالة الحجوزات...');

        const now = new Date();

        // تحديث الحجوزات التي انتهت إلى checked_out
        const expiredBookings = await Booking.find({
            status: { $in: ['confirmed', 'checked_in'] },
            checkOutDate: { $lt: now }
        });

        console.log(`📊 تم العثور على ${expiredBookings.length} حجز منتهي`);

        for (const booking of expiredBookings) {
            // تحديث حالة الحجز
            const updatedBooking = await Booking.findByIdAndUpdate(booking._id, {
                status: 'checked_out',
                'timestamps.lastModifiedAt': now
            }, { new: true });

            // تحديث حالة الغرفة باستخدام method المخصص
            if (updatedBooking) {
                await updatedBooking.updateRoomStatus();
                console.log(`✅ تم تحديث الحجز ${booking.bookingNumber} إلى checked_out وتحديث حالة الغرفة`);
            }
        }

        // تحديث الحجوزات المعلقة التي تجاوزت وقت تسجيل الوصول بدون تأكيد
        const overdueBookings = await Booking.find({
            status: 'pending',
            checkInDate: { $lt: now },
            'payment.status': { $ne: 'paid' }
        });

        console.log(`📊 تم العثور على ${overdueBookings.length} حجز معلق متأخر`);

        for (const booking of overdueBookings) {
            // تحديث حالة الحجز إلى no_show
            const updatedBooking = await Booking.findByIdAndUpdate(booking._id, {
                status: 'no_show',
                'timestamps.lastModifiedAt': now
            }, { new: true });

            // تحديث حالة الغرفة باستخدام method المخصص
            if (updatedBooking) {
                await updatedBooking.updateRoomStatus();
                console.log(`⚠️ تم تحديث الحجز ${booking.bookingNumber} إلى no_show وتحديث حالة الغرفة`);
            }
        }

        console.log('✅ تم الانتهاء من تحديث حالة الحجوزات');

    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الحجوزات:', error);
    }
};

/**
 * تحديث حالة الغرف عند بدء التشغيل
 */
const initializeRoomStatus = async () => {
    try {
        console.log('🔄 بدء تهيئة حالة الغرف...');
        await updateRoomStatus();
        await updateBookingStatus();
        console.log('✅ تم الانتهاء من تهيئة حالة الغرف');
    } catch (error) {
        console.error('❌ خطأ في تهيئة حالة الغرف:', error);
    }
};

/**
 * بدء تشغيل الوظائف المجدولة
 */
const startScheduledTasks = () => {
    console.log('🚀 بدء تشغيل الوظائف المجدولة...');
    
    // تحديث حالة الغرف كل ساعة
    cron.schedule('0 * * * *', updateRoomStatus, {
        scheduled: true,
        timezone: "Asia/Riyadh"
    });
    
    // تحديث حالة الحجوزات كل 30 دقيقة
    cron.schedule('*/30 * * * *', updateBookingStatus, {
        scheduled: true,
        timezone: "Asia/Riyadh"
    });
    
    console.log('✅ تم تشغيل الوظائف المجدولة بنجاح');
    
    // تهيئة حالة الغرف عند بدء التشغيل (بعد 10 ثوانٍ)
    setTimeout(initializeRoomStatus, 10000);
};

/**
 * إيقاف الوظائف المجدولة
 */
const stopScheduledTasks = () => {
    console.log('🛑 إيقاف الوظائف المجدولة...');
    cron.getTasks().forEach(task => task.stop());
    console.log('✅ تم إيقاف الوظائف المجدولة');
};

module.exports = {
    updateRoomStatus,
    updateBookingStatus,
    initializeRoomStatus,
    startScheduledTasks,
    stopScheduledTasks
}; 