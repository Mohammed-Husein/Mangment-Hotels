const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const roomSchema = new mongoose.Schema({
    // اسم الغرفة (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم الغرفة باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم الغرفة أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم الغرفة 100 حرف']
        },
        en: {
            type: String,
            trim: true,
            minlength: [2, 'Room name must be more than 2 characters'],
            maxlength: [100, 'Room name must not exceed 100 characters'],
            default: ''
        }
    },
    
    // معرف الفندق
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: [true, 'الفندق مطلوب']
    },
    
    // نوع الغرفة
    type: {
        type: String,
        required: [true, 'نوع الغرفة مطلوب'],
        enum: {
            values: ['sweet', 'singleRoom', 'doubleRoom', 'suite', 'deluxe', 'standard'],
            message: 'نوع الغرفة المحدد غير صحيح'
        }
    },
    
    // رقم الغرفة
    numberRoom: {
        type: String,
        required: [true, 'رقم الغرفة مطلوب'],
        trim: true,
        maxlength: [50, 'رقم الغرفة يجب أن لا يتجاوز 50 حرف']
    },
    

    
    // عدد الأسرة (اختياري)
    bedsCount: {
        type: Number,
        min: [1, 'يجب أن يكون هناك سرير واحد على الأقل'],
        max: [10, 'عدد الأسرة يجب أن لا يتجاوز 10'],
        default: 1
    },

    // سعر الغرفة (لكل ليلة)
    price: {
        type: Number,
        required: [true, 'سعر الغرفة مطلوب'],
        min: [0, 'السعر لا يمكن أن يكون سالب']
    },

    // وصف الغرفة (اختياري)
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'وصف الغرفة يجب أن لا يتجاوز 1000 حرف'],
        default: ''
    },


    // صور الغرفة
    images: [{
        type: String,
        validate: {
            validator: function(value) {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
            },
            message: 'نوع الصورة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp'
        }
    }],
    
    // الخدمات الإضافية (مرن)
    services: {
        type: Map,
        of: String,
        default: new Map()
    },
    

    
    // حالة الغرفة
    status: {
        type: String,
        enum: ['Available', 'Reserved', 'Inactive'],
        default: 'Available'
    },

    // تفاصيل الحجز المستقبلي
    futureBooking: {
        isBooked: {
            type: Boolean,
            default: false
        },
        bookedFrom: {
            type: Date
        },
        bookedTo: {
            type: Date
        },
        bookingNote: {
            type: String,
            trim: true
        }
    },
    
    // هل الغرفة متاحة للحجز؟
    isAvailableForBooking: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
roomSchema.index({ hotel: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ isAvailableForBooking: 1 });
// تم إزالة الفهرس الفريد لرقم الغرفة للسماح بالتكرار

roomSchema.index({ 'name.ar': 'text', 'name.en': 'text' });

// Virtual للحصول على عدد الحجوزات
roomSchema.virtual('bookingsCount', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'room',
    count: true
});

// Virtual للحصول على الحجوزات النشطة
roomSchema.virtual('activeBookings', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'room',
    match: { status: { $in: ['confirmed', 'checked_in'] } }
});

// Middleware للتحقق من وجود الفندق قبل الحفظ
roomSchema.pre('save', async function(next) {
    if (this.isModified('hotel')) {
        const Hotel = mongoose.model('Hotel');
        const hotel = await Hotel.findById(this.hotel);
        if (!hotel) {
            return next(new Error('الفندق المحدد غير موجود'));
        }
        if (!hotel.isActive) {
            return next(new Error('الفندق المحدد غير نشط'));
        }
    }
    next();
});

// Method للحصول على اسم الغرفة حسب اللغة
roomSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

// Method للتحقق من توفر الغرفة في فترة معينة
roomSchema.methods.isAvailableForPeriod = function(checkIn, checkOut) {
    if (!this.isAvailableForBooking || this.status !== 'Available') {
        return false;
    }

    // التحقق من الحجز المستقبلي
    if (this.futureBooking.isBooked) {
        const bookingStart = new Date(this.futureBooking.bookedFrom);
        const bookingEnd = new Date(this.futureBooking.bookedTo);
        const requestStart = new Date(checkIn);
        const requestEnd = new Date(checkOut);

        // التحقق من التداخل
        if (requestStart < bookingEnd && requestEnd > bookingStart) {
            return false;
        }
    }

    return true;
};

module.exports = mongoose.model('Room', roomSchema);
