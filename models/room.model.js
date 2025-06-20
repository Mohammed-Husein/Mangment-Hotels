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
            required: [true, 'اسم الغرفة باللغة الإنجليزية مطلوب'],
            trim: true,
            minlength: [2, 'Room name must be more than 2 characters'],
            maxlength: [100, 'Room name must not exceed 100 characters']
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
            values: ['مفردة', 'مزدوجة', 'ثلاثية', 'جناح', 'جناح ملكي', 'استوديو'],
            message: 'نوع الغرفة المحدد غير صحيح'
        }
    },
    
    // رقم الغرفة
    roomNumber: {
        type: String,
        required: [true, 'رقم الغرفة مطلوب'],
        trim: true,
        maxlength: [10, 'رقم الغرفة يجب أن لا يتجاوز 10 أحرف']
    },
    
    // الطابق
    floor: {
        type: Number,
        required: [true, 'رقم الطابق مطلوب'],
        min: [0, 'رقم الطابق لا يمكن أن يكون سالب'],
        max: [100, 'رقم الطابق يجب أن لا يتجاوز 100']
    },
    
    // عدد الأسرة
    bedsCount: {
        type: Number,
        required: [true, 'عدد الأسرة مطلوب'],
        min: [1, 'يجب أن يكون هناك سرير واحد على الأقل'],
        max: [10, 'عدد الأسرة يجب أن لا يتجاوز 10']
    },
    
    // نوع الأسرة
    bedType: {
        type: String,
        enum: ['مفرد', 'مزدوج', 'كينغ', 'كوين', 'أريكة سرير'],
        default: 'مزدوج'
    },
    
    // مساحة الغرفة (بالمتر المربع)
    area: {
        type: Number,
        required: [true, 'مساحة الغرفة مطلوبة'],
        min: [10, 'مساحة الغرفة يجب أن تكون 10 متر مربع على الأقل'],
        max: [500, 'مساحة الغرفة يجب أن لا تتجاوز 500 متر مربع']
    },
    
    // الحد الأقصى للنزلاء
    maxGuests: {
        type: Number,
        required: [true, 'الحد الأقصى للنزلاء مطلوب'],
        min: [1, 'يجب أن يكون الحد الأقصى للنزلاء 1 على الأقل'],
        max: [20, 'الحد الأقصى للنزلاء يجب أن لا يتجاوز 20']
    },
    
    // وصف الغرفة (متعدد اللغات)
    description: {
        ar: {
            type: String,
            required: [true, 'وصف الغرفة باللغة العربية مطلوب'],
            trim: true,
            maxlength: [1000, 'وصف الغرفة يجب أن لا يتجاوز 1000 حرف']
        },
        en: {
            type: String,
            required: [true, 'وصف الغرفة باللغة الإنجليزية مطلوب'],
            trim: true,
            maxlength: [1000, 'Room description must not exceed 1000 characters']
        }
    },
    
    // صور الغرفة
    images: [{
        type: String,
        required: [true, 'صورة واحدة على الأقل مطلوبة'],
        validate: {
            validator: function(value) {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
            },
            message: 'نوع الصورة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp'
        }
    }],
    
    // المرافق والخدمات
    amenities: {
        // الأساسيات
        hasAirConditioning: { type: Boolean, default: true },
        hasWiFi: { type: Boolean, default: true },
        hasTV: { type: Boolean, default: true },
        hasBalcony: { type: Boolean, default: false },
        hasSeaView: { type: Boolean, default: false },
        hasCityView: { type: Boolean, default: false },
        hasGardenView: { type: Boolean, default: false },
        
        // الحمام
        hasPrivateBathroom: { type: Boolean, default: true },
        hasShower: { type: Boolean, default: true },
        hasBathtub: { type: Boolean, default: false },
        hasHairDryer: { type: Boolean, default: true },
        hasTowels: { type: Boolean, default: true },
        
        // المطبخ (للأجنحة والاستوديوهات)
        hasKitchen: { type: Boolean, default: false },
        hasRefrigerator: { type: Boolean, default: false },
        hasMicrowave: { type: Boolean, default: false },
        hasCoffeeMaker: { type: Boolean, default: false },
        
        // أخرى
        hasSafe: { type: Boolean, default: false },
        hasIroning: { type: Boolean, default: false },
        hasDesk: { type: Boolean, default: true },
        hasCloset: { type: Boolean, default: true },
        
        // خدمات إضافية
        customAmenities: [{
            name: { ar: String, en: String },
            icon: String,
            isAvailable: { type: Boolean, default: true }
        }]
    },
    
    // التسعير
    pricing: {
        // السعر الأساسي (لكل ليلة)
        basePrice: {
            type: Number,
            required: [true, 'السعر الأساسي مطلوب'],
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // العملة
        currency: {
            type: String,
            default: 'SAR',
            enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'EGP']
        },
        
        // تسعير موسمي
        seasonalPricing: [{
            name: { ar: String, en: String },
            startDate: Date,
            endDate: Date,
            price: {
                type: Number,
                min: [0, 'السعر لا يمكن أن يكون سالب']
            },
            isActive: { type: Boolean, default: true }
        }],
        
        // خصومات حسب عدد الليالي
        lengthOfStayDiscounts: [{
            minNights: {
                type: Number,
                min: [2, 'الحد الأدنى للليالي يجب أن يكون 2']
            },
            discountPercentage: {
                type: Number,
                min: [0, 'نسبة الخصم لا يمكن أن تكون سالبة'],
                max: [100, 'نسبة الخصم لا يمكن أن تتجاوز 100%']
            }
        }]
    },
    
    // حالة الغرفة
    status: {
        type: String,
        enum: ['متاحة', 'محجوزة', 'مشغولة', 'صيانة', 'تنظيف', 'غير متاحة'],
        default: 'متاحة'
    },
    
    // هل الغرفة متاحة للحجز؟
    isAvailableForBooking: {
        type: Boolean,
        default: true
    },
    
    // تقييم الغرفة
    rating: {
        average: {
            type: Number,
            default: 0,
            min: [0, 'التقييم يجب أن يكون بين 0 و 5'],
            max: [5, 'التقييم يجب أن يكون بين 0 و 5']
        },
        count: {
            type: Number,
            default: 0,
            min: [0, 'عدد التقييمات لا يمكن أن يكون سالب']
        }
    },
    
    // إعدادات الصيانة
    maintenance: {
        lastCleaningDate: Date,
        lastMaintenanceDate: Date,
        nextMaintenanceDate: Date,
        maintenanceNotes: String
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
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true }); // منع تكرار رقم الغرفة في نفس الفندق
roomSchema.index({ 'pricing.basePrice': 1 });
roomSchema.index({ maxGuests: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ 'rating.average': -1 });

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

// Method للحصول على الوصف حسب اللغة
roomSchema.methods.getLocalizedDescription = function(language = 'ar') {
    return this.description[language] || this.description.ar;
};

// Method للحصول على السعر الحالي (مع مراعاة التسعير الموسمي)
roomSchema.methods.getCurrentPrice = function(checkInDate = new Date()) {
    const currentDate = new Date(checkInDate);
    
    // البحث عن تسعير موسمي نشط
    const seasonalPrice = this.pricing.seasonalPricing.find(season => 
        season.isActive && 
        currentDate >= season.startDate && 
        currentDate <= season.endDate
    );
    
    return seasonalPrice ? seasonalPrice.price : this.pricing.basePrice;
};

// Method للحصول على خصم حسب عدد الليالي
roomSchema.methods.getLengthOfStayDiscount = function(nights) {
    const applicableDiscount = this.pricing.lengthOfStayDiscounts
        .filter(discount => nights >= discount.minNights)
        .sort((a, b) => b.minNights - a.minNights)[0]; // أخذ أعلى خصم مناسب
    
    return applicableDiscount ? applicableDiscount.discountPercentage : 0;
};

// Method للتحقق من توفر الغرفة في فترة معينة
roomSchema.methods.isAvailableForPeriod = async function(checkIn, checkOut) {
    if (!this.isAvailableForBooking || this.status !== 'متاحة') {
        return false;
    }
    
    const Booking = mongoose.model('Booking');
    const conflictingBookings = await Booking.find({
        room: this._id,
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
            { checkInDate: { $lt: checkOut, $gte: checkIn } },
            { checkOutDate: { $gt: checkIn, $lte: checkOut } },
            { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } }
        ]
    });
    
    return conflictingBookings.length === 0;
};

module.exports = mongoose.model('Room', roomSchema);
