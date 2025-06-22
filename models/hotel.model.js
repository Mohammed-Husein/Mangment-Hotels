const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const hotelSchema = new mongoose.Schema({
    // اسم الفندق (متعدد اللغات)
    name: {
        ar: {
            type: String,
            // required: [true, 'اسم الفندق باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم الفندق أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم الفندق 100 حرف']
        },
        en: {
            type: String,
            trim: true,
            minlength: [2, 'Hotel name must be more than 2 characters'],
            maxlength: [100, 'Hotel name must not exceed 100 characters']
        }
    },

    // نوع الفندق
    type: {
        type: String,
        default: 'فندق',
        enum: {
            values: ['فندق', 'نزل', 'منتجع', 'شقق فندقية', 'بيت ضيافة'],
            message: 'نوع الفندق المحدد غير صحيح'
        }
    },

    // تصنيف النجوم
    stars: {
        type: Number,
        default: 1,
        min: [1, 'تصنيف النجوم يجب أن يكون بين 1 و 5'],
        max: [5, 'تصنيف النجوم يجب أن يكون بين 1 و 5'],
        validate: {
            validator: Number.isInteger,
            message: 'تصنيف النجوم يجب أن يكون رقم صحيح'
        }
    },
    
    // البلد
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: [true, 'البلد مطلوب']
    },

    // المحافظة
    governorate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Governorate',
        required: [true, 'المحافظة مطلوبة']
    },

    // المنطقة
    region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Region',
        required: [true, 'المنطقة مطلوبة']
    },
    
    // العنوان التفصيلي (متعدد اللغات)
    address: {
        ar: {
            type: String,
            trim: true,
            default: ''
        },
        en: {
            type: String,
            trim: true,
            default: ''
        }
    },

    // وصف الفندق (متعدد اللغات)
    description: {
        ar: {
            type: String,
            trim: true,
            maxlength: [2000, 'وصف الفندق يجب أن لا يتجاوز 2000 حرف'],
            default: ''
        },
        en: {
            type: String,
            trim: true,
            maxlength: [2000, 'Hotel description must not exceed 2000 characters'],
            default: ''
        }
    },
    
    // رقم الهاتف
    phone: {
        type: String,
        validate: {
            validator: function(value) {
                return !value || /^[\+]?[1-9][\d]{0,15}$/.test(value);
            },
            message: 'رقم الهاتف غير صحيح'
        }
    },
    
    // البريد الإلكتروني
    email: {
        type: String,
        validate: {
            validator: function(value) {
                return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: 'البريد الإلكتروني غير صحيح'
        }
    },
    
    // الموقع الجغرافي
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            validate: {
                validator: function(value) {
                    return !value || (Array.isArray(value) && value.length === 2);
                },
                message: 'الإحداثيات يجب أن تكون مصفوفة من رقمين [longitude, latitude]'
            }
        }
    },
    
    // صور الفندق
    images: [{
        type: String,
        validate: {
            validator: function(value) {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
            },
            message: 'نوع الصورة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp'
        }
    }],
    
    // المرافق والخدمات
    amenities: [{
        type: String,
        trim: true
    }],
    
    // سياسات الفندق
    policies: {
        checkIn: {
            type: String,
            default: '14:00'
        },
        checkOut: {
            type: String,
            default: '12:00'
        },
        cancellationPolicy: {
            ar: String,
            en: String
        },
        petPolicy: {
            ar: String,
            en: String
        },
        smokingPolicy: {
            ar: String,
            en: String
        }
    },
    
    // معلومات الاتصال
    contactInfo: {
        website: String,
        socialMedia: {
            facebook: String,
            instagram: String,
            twitter: String
        }
    },
    
    // حالة الفندق
    isActive: {
        type: Boolean,
        default: true
    },
    
    // تقييم الفندق
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
    
    // معرف المالك/المدير (اختياري)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // معرف الموظف الذي أنشأ الفندق
    createdByEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'معرف الموظف المنشئ مطلوب']
    },

    // معرف الموظف الذي قام بآخر تحديث
    updatedByEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
hotelSchema.index({ country: 1 });
hotelSchema.index({ governorate: 1 });
hotelSchema.index({ region: 1 });
hotelSchema.index({ type: 1 });
hotelSchema.index({ stars: 1 });
hotelSchema.index({ 'name.ar': 'text', 'name.en': 'text', 'description.ar': 'text', 'description.en': 'text' });
hotelSchema.index({ location: '2dsphere' }); // للبحث الجغرافي
hotelSchema.index({ isActive: 1 });
hotelSchema.index({ 'rating.average': -1 });

// Virtual للحصول على عدد الغرف
hotelSchema.virtual('roomsCount', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'hotel',
    count: true
});

// Virtual للحصول على عدد الحجوزات النشطة
hotelSchema.virtual('activeBookingsCount', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'hotel',
    count: true,
    match: { status: { $in: ['confirmed', 'checked_in'] } }
});

// Middleware للتحقق من تطابق البلد والمحافظة والمنطقة قبل الحفظ
hotelSchema.pre('save', async function(next) {
    // إضافة الاسم الإنجليزي إذا لم يتم تحديده
    if (!this.name.en && this.name.ar) {
        this.name.en = this.name.ar;
    }

    if (this.isModified('country') || this.isModified('governorate') || this.isModified('region')) {
        const Governorate = mongoose.model('Governorate');
        const Region = mongoose.model('Region');

        // التحقق من المحافظة
        const governorate = await Governorate.findById(this.governorate).populate('country');
        if (!governorate) {
            return next(new Error('المحافظة المحددة غير موجودة'));
        }

        if (governorate.country._id.toString() !== this.country.toString()) {
            return next(new Error('المحافظة المحددة لا تنتمي للبلد المحدد'));
        }

        // التحقق من المنطقة
        if (this.region) {
            const region = await Region.findById(this.region);
            if (!region) {
                return next(new Error('المنطقة المحددة غير موجودة'));
            }

            if (region.governorate.toString() !== this.governorate.toString()) {
                return next(new Error('المنطقة المحددة لا تنتمي للمحافظة المحددة'));
            }
        }
    }
    next();
});

// Middleware لحذف الغرف المرتبطة عند حذف الفندق
hotelSchema.pre('remove', async function(next) {
    await this.model('Room').deleteMany({ hotel: this._id });
    next();
});

// Method للحصول على اسم الفندق حسب اللغة
hotelSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

// Method للحصول على الوصف حسب اللغة
hotelSchema.methods.getLocalizedDescription = function(language = 'ar') {
    return this.description[language] || this.description.ar;
};

// Method للحصول على العنوان حسب اللغة
hotelSchema.methods.getLocalizedAddress = function(language = 'ar') {
    return this.address[language] || this.address.ar;
};

module.exports = mongoose.model('Hotel', hotelSchema);
