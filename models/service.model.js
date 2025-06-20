const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const serviceSchema = new mongoose.Schema({
    // اسم الخدمة (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم الخدمة باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم الخدمة أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم الخدمة 100 حرف']
        },
        en: {
            type: String,
            required: [true, 'اسم الخدمة باللغة الإنجليزية مطلوب'],
            trim: true,
            minlength: [2, 'Service name must be more than 2 characters'],
            maxlength: [100, 'Service name must not exceed 100 characters']
        }
    },
    
    // نوع الخدمة
    type: {
        type: String,
        required: [true, 'نوع الخدمة مطلوب'],
        enum: {
            values: [
                'إفطار', 'غداء', 'عشاء', 'وجبات', 
                'نقل', 'مواصلات', 'تاكسي',
                'جولة سياحية', 'رحلة', 'نشاط ترفيهي',
                'سبا', 'مساج', 'صالة رياضية',
                'غسيل ملابس', 'تنظيف جاف', 'كي',
                'إنترنت', 'واي فاي', 'اتصالات',
                'مواقف سيارات', 'خدمة الغرف', 'استقبال',
                'أخرى'
            ],
            message: 'نوع الخدمة المحدد غير صحيح'
        }
    },
    
    // وصف الخدمة (متعدد اللغات)
    description: {
        ar: {
            type: String,
            trim: true,
            maxlength: [500, 'وصف الخدمة يجب أن لا يتجاوز 500 حرف']
        },
        en: {
            type: String,
            trim: true,
            maxlength: [500, 'Service description must not exceed 500 characters']
        }
    },
    
    // السعر
    price: {
        type: Number,
        required: [true, 'سعر الخدمة مطلوب'],
        min: [0, 'السعر لا يمكن أن يكون سالب']
    },
    
    // العملة
    currency: {
        type: String,
        default: 'SAR',
        enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'EGP']
    },
    
    // نوع التسعير
    pricingType: {
        type: String,
        required: [true, 'نوع التسعير مطلوب'],
        enum: {
            values: ['لكل شخص', 'لكل حجز', 'لكل ليلة', 'لكل ساعة', 'لكل استخدام'],
            message: 'نوع التسعير المحدد غير صحيح'
        }
    },
    
    // هل الخدمة إلزامية؟
    isMandatory: {
        type: Boolean,
        default: false
    },
    
    // هل الخدمة متاحة حالياً؟
    isAvailable: {
        type: Boolean,
        default: true
    },
    
    // الفنادق المرتبطة بالخدمة
    hotels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel'
    }],
    
    // هل الخدمة متاحة لجميع الفنادق؟
    isGlobal: {
        type: Boolean,
        default: false
    },
    
    // أيقونة الخدمة
    icon: {
        type: String,
        validate: {
            validator: function(value) {
                return !value || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value);
            },
            message: 'نوع الأيقونة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp, svg'
        }
    },
    
    // صور الخدمة
    images: [{
        type: String,
        validate: {
            validator: function(value) {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
            },
            message: 'نوع الصورة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp'
        }
    }],
    
    // إعدادات الخدمة
    settings: {
        // الحد الأقصى للكمية (للخدمات القابلة للعد)
        maxQuantity: {
            type: Number,
            min: [1, 'الحد الأقصى للكمية يجب أن يكون 1 على الأقل'],
            default: 1
        },
        
        // هل يمكن طلب الخدمة أكثر من مرة؟
        allowMultiple: {
            type: Boolean,
            default: true
        },
        
        // أوقات توفر الخدمة
        availability: {
            // أيام الأسبوع (0 = الأحد، 6 = السبت)
            daysOfWeek: [{
                type: Number,
                min: [0, 'يوم الأسبوع يجب أن يكون بين 0 و 6'],
                max: [6, 'يوم الأسبوع يجب أن يكون بين 0 و 6']
            }],
            
            // ساعات العمل
            startTime: {
                type: String,
                validate: {
                    validator: function(value) {
                        return !value || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
                    },
                    message: 'تنسيق الوقت غير صحيح. استخدم HH:MM'
                }
            },
            
            endTime: {
                type: String,
                validate: {
                    validator: function(value) {
                        return !value || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
                    },
                    message: 'تنسيق الوقت غير صحيح. استخدم HH:MM'
                }
            },
            
            // هل الخدمة متاحة 24/7؟
            isAlwaysAvailable: {
                type: Boolean,
                default: false
            }
        },
        
        // مدة الخدمة (بالدقائق)
        duration: {
            type: Number,
            min: [1, 'مدة الخدمة يجب أن تكون دقيقة واحدة على الأقل']
        },
        
        // هل تحتاج الخدمة لحجز مسبق؟
        requiresAdvanceBooking: {
            type: Boolean,
            default: false
        },
        
        // المدة المطلوبة للحجز المسبق (بالساعات)
        advanceBookingHours: {
            type: Number,
            min: [1, 'المدة المطلوبة للحجز المسبق يجب أن تكون ساعة واحدة على الأقل'],
            default: 24
        }
    },
    
    // شروط وأحكام الخدمة
    terms: {
        ar: String,
        en: String
    },
    
    // سياسة الإلغاء
    cancellationPolicy: {
        ar: String,
        en: String
    },
    
    // تقييم الخدمة
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
    
    // إحصائيات الخدمة
    stats: {
        totalBookings: {
            type: Number,
            default: 0,
            min: [0, 'عدد الحجوزات لا يمكن أن يكون سالب']
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: [0, 'إجمالي الإيرادات لا يمكن أن يكون سالب']
        }
    },
    
    // ترتيب العرض
    sortOrder: {
        type: Number,
        default: 0,
        min: [0, 'ترتيب العرض لا يمكن أن يكون سالب']
    },
    
    // معرف منشئ الخدمة
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'منشئ الخدمة مطلوب']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
serviceSchema.index({ type: 1 });
serviceSchema.index({ isAvailable: 1 });
serviceSchema.index({ isMandatory: 1 });
serviceSchema.index({ isGlobal: 1 });
serviceSchema.index({ hotels: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ 'name.ar': 'text', 'name.en': 'text', 'description.ar': 'text', 'description.en': 'text' });
serviceSchema.index({ sortOrder: 1 });
serviceSchema.index({ 'rating.average': -1 });
serviceSchema.index({ createdBy: 1 });

// Virtual للحصول على عدد الحجوزات
serviceSchema.virtual('bookingsCount', {
    ref: 'ServiceBooking',
    localField: '_id',
    foreignField: 'service',
    count: true
});

// Method للحصول على اسم الخدمة حسب اللغة
serviceSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

// Method للحصول على الوصف حسب اللغة
serviceSchema.methods.getLocalizedDescription = function(language = 'ar') {
    return this.description[language] || this.description.ar;
};

// Method للتحقق من توفر الخدمة في وقت معين
serviceSchema.methods.isAvailableAt = function(dateTime) {
    if (!this.isAvailable) return false;
    
    const { availability } = this.settings;
    
    if (availability.isAlwaysAvailable) return true;
    
    const date = new Date(dateTime);
    const dayOfWeek = date.getDay();
    const timeString = date.toTimeString().slice(0, 5); // HH:MM format
    
    // التحقق من اليوم
    if (availability.daysOfWeek.length > 0 && !availability.daysOfWeek.includes(dayOfWeek)) {
        return false;
    }
    
    // التحقق من الوقت
    if (availability.startTime && availability.endTime) {
        return timeString >= availability.startTime && timeString <= availability.endTime;
    }
    
    return true;
};

// Method للتحقق من إمكانية الحجز المسبق
serviceSchema.methods.canBookInAdvance = function(requestedDateTime) {
    if (!this.settings.requiresAdvanceBooking) return true;
    
    const now = new Date();
    const requested = new Date(requestedDateTime);
    const hoursDifference = (requested - now) / (1000 * 60 * 60);
    
    return hoursDifference >= this.settings.advanceBookingHours;
};

// Method للحصول على السعر الإجمالي حسب الكمية ونوع التسعير
serviceSchema.methods.calculateTotalPrice = function(quantity = 1, nights = 1, guests = 1) {
    let totalPrice = this.price;
    
    switch (this.pricingType) {
        case 'لكل شخص':
            totalPrice *= guests;
            break;
        case 'لكل ليلة':
            totalPrice *= nights;
            break;
        case 'لكل حجز':
        case 'لكل ساعة':
        case 'لكل استخدام':
        default:
            // السعر ثابت
            break;
    }
    
    return totalPrice * quantity;
};

module.exports = mongoose.model('Service', serviceSchema);
