const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const bookingSchema = new mongoose.Schema({
    // رقم الحجز (فريد)
    bookingNumber: {
        type: String,
        unique: true,
        required: [true, 'رقم الحجز مطلوب']
    },

    // معرف العميل
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'العميل مطلوب']
    },

    // معرف الفندق (اختياري - يمكن الحصول عليه من الغرفة)
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel'
    },

    // معرف الغرفة
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'الغرفة مطلوبة']
    },
    
    // بيانات النزيل الرئيسي
    guestInfo: {
        fullName: {
            type: String,
            required: [true, 'اسم النزيل مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون الاسم أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز الاسم 100 حرف']
        },
        email: {
            type: String,
            required: [true, 'البريد الإلكتروني مطلوب'],
            validate: {
                validator: function(value) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                },
                message: 'البريد الإلكتروني غير صحيح'
            }
        },
        phone: {
            type: String,
            required: [true, 'رقم الهاتف مطلوب'],
            validate: {
                validator: function(value) {
                    return /^[\+]?[1-9][\d]{0,15}$/.test(value);
                },
                message: 'رقم الهاتف غير صحيح'
            }
        },
        nationality: String,
        idNumber: String,
        dateOfBirth: Date,
        specialRequests: String
    },
    
    // النزلاء الإضافيون
    additionalGuests: [{
        fullName: {
            type: String,
            required: [true, 'اسم النزيل مطلوب'],
            trim: true
        },
        age: {
            type: Number,
            min: [0, 'العمر لا يمكن أن يكون سالب'],
            max: [120, 'العمر غير منطقي']
        },
        relationship: {
            type: String,
            enum: ['زوج/زوجة', 'ابن/ابنة', 'والد/والدة', 'أخ/أخت', 'صديق', 'أخرى']
        }
    }],
    
    // عدد النزلاء
    guestsCount: {
        adults: {
            type: Number,
            required: [true, 'عدد البالغين مطلوب'],
            min: [1, 'يجب أن يكون هناك بالغ واحد على الأقل'],
            max: [20, 'عدد البالغين يجب أن لا يتجاوز 20']
        },
        children: {
            type: Number,
            default: 0,
            min: [0, 'عدد الأطفال لا يمكن أن يكون سالب'],
            max: [10, 'عدد الأطفال يجب أن لا يتجاوز 10']
        },
        infants: {
            type: Number,
            default: 0,
            min: [0, 'عدد الرضع لا يمكن أن يكون سالب'],
            max: [5, 'عدد الرضع يجب أن لا يتجاوز 5']
        }
    },
    
    // تواريخ الإقامة
    checkInDate: {
        type: Date,
        required: [true, 'تاريخ الوصول مطلوب'],
        validate: {
            validator: function(value) {
                return value >= new Date().setHours(0, 0, 0, 0);
            },
            message: 'تاريخ الوصول يجب أن يكون في المستقبل'
        }
    },
    
    checkOutDate: {
        type: Date,
        required: [true, 'تاريخ المغادرة مطلوب'],
        validate: {
            validator: function(value) {
                return value > this.checkInDate;
            },
            message: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول'
        }
    },
    
    // عدد الليالي (محسوب تلقائياً)
    numberOfNights: {
        type: Number,
        min: [1, 'عدد الليالي يجب أن يكون ليلة واحدة على الأقل']
    },
    
    // حالة الحجز
    status: {
        type: String,
        enum: {
            values: ['معلق', 'مؤكد', 'تم تسجيل الدخول', 'تم تسجيل الخروج', 'ملغي', 'لم يحضر'],
            message: 'حالة الحجز المحددة غير صحيحة'
        },
        default: 'معلق'
    },
    
    // تفاصيل التسعير
    pricing: {
        // سعر الغرفة الأساسي (لكل ليلة)
        roomBasePrice: {
            type: Number,
            required: [true, 'سعر الغرفة الأساسي مطلوب'],
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // إجمالي سعر الغرفة (عدد الليالي × السعر)
        roomTotalPrice: {
            type: Number,
            required: [true, 'إجمالي سعر الغرفة مطلوب'],
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // إجمالي سعر الخدمات الإضافية
        servicesTotalPrice: {
            type: Number,
            default: 0,
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // المبلغ الفرعي (قبل الضرائب والخصومات)
        subtotal: {
            type: Number,
            required: [true, 'المبلغ الفرعي مطلوب'],
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // الضرائب
        taxes: {
            rate: {
                type: Number,
                default: 0,
                min: [0, 'معدل الضريبة لا يمكن أن يكون سالب'],
                max: [100, 'معدل الضريبة لا يمكن أن يتجاوز 100%']
            },
            amount: {
                type: Number,
                default: 0,
                min: [0, 'مبلغ الضريبة لا يمكن أن يكون سالب']
            }
        },
        
        // الخصومات
        discounts: {
            lengthOfStay: {
                percentage: { type: Number, default: 0 },
                amount: { type: Number, default: 0 }
            },
            promotional: {
                code: String,
                percentage: { type: Number, default: 0 },
                amount: { type: Number, default: 0 }
            },
            other: {
                reason: String,
                amount: { type: Number, default: 0 }
            }
        },
        
        // الحسم (اختياري)
        discount: {
            type: Number,
            default: 0,
            min: [0, 'الحسم لا يمكن أن يكون سالب']
        },

        // المبلغ الإجمالي النهائي
        totalAmount: {
            type: Number,
            required: [true, 'المبلغ الإجمالي مطلوب'],
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        
        // العملة
        currency: {
            type: String,
            default: 'SAR',
            enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'EGP']
        }
    },
    
    // معلومات الدفع
    payment: {
        // طريقة الدفع (معرف من جدول طرق الدفع)
        paymentMethod: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PaymentMethod',
            required: [true, 'طريقة الدفع مطلوبة']
        },

        status: {
            type: String,
            enum: ['معلق', 'مدفوع', 'مدفوع جزئياً', 'مرفوض', 'مسترد'],
            default: 'معلق'
        },

        paidAmount: {
            type: Number,
            default: 0,
            min: [0, 'المبلغ المدفوع لا يمكن أن يكون سالب']
        },

        remainingAmount: {
            type: Number,
            default: 0,
            min: [0, 'المبلغ المتبقي لا يمكن أن يكون سالب']
        },

        transactionId: String,
        paymentDate: Date,

        // تفاصيل إضافية للدفع
        details: {
            cardLast4: String, // آخر 4 أرقام من البطاقة
            bankName: String,
            transferReference: String,
            notes: String
        }
    },
    
    // الخدمات الإضافية المحجوزة
    services: [{
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: [1, 'الكمية يجب أن تكون 1 على الأقل']
        },
        unitPrice: {
            type: Number,
            required: true,
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        totalPrice: {
            type: Number,
            required: true,
            min: [0, 'السعر لا يمكن أن يكون سالب']
        },
        scheduledDate: Date,
        scheduledTime: String,
        status: {
            type: String,
            enum: ['معلق', 'مؤكد', 'مكتمل', 'ملغي'],
            default: 'معلق'
        },
        notes: String
    }],
    
    // ملاحظات الحجز
    notes: {
        customer: String, // ملاحظات العميل
        staff: String,    // ملاحظات الموظفين
        internal: String  // ملاحظات داخلية
    },
    
    // معلومات الإلغاء
    cancellation: {
        isCancelled: {
            type: Boolean,
            default: false
        },
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        refundAmount: {
            type: Number,
            default: 0,
            min: [0, 'مبلغ الاسترداد لا يمكن أن يكون سالب']
        },
        refundStatus: {
            type: String,
            enum: ['غير مطلوب', 'معلق', 'مكتمل', 'مرفوض'],
            default: 'غير مطلوب'
        }
    },
    
    // تواريخ مهمة
    timestamps: {
        bookedAt: {
            type: Date,
            default: Date.now
        },
        confirmedAt: Date,
        checkedInAt: Date,
        checkedOutAt: Date,
        lastModifiedAt: {
            type: Date,
            default: Date.now
        }
    },
    
    // معرف الموظف المسؤول
    assignedStaff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
// bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ customer: 1 });
bookingSchema.index({ hotel: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkInDate: 1 });
bookingSchema.index({ checkOutDate: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ 'guestInfo.email': 1 });
bookingSchema.index({ 'guestInfo.phone': 1 });
bookingSchema.index({ 'timestamps.bookedAt': -1 });

// Virtual للحصول على إجمالي عدد النزلاء
bookingSchema.virtual('totalGuests').get(function() {
    return this.guestsCount.adults + this.guestsCount.children + this.guestsCount.infants;
});

// Middleware لحساب عدد الليالي قبل الحفظ
bookingSchema.pre('save', function(next) {
    if (this.checkInDate && this.checkOutDate) {
        const timeDiff = this.checkOutDate.getTime() - this.checkInDate.getTime();
        this.numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    // تحديث تاريخ آخر تعديل
    this.timestamps.lastModifiedAt = new Date();
    
    next();
});

// Middleware لتوليد رقم حجز فريد
bookingSchema.pre('save', async function(next) {
    if (!this.bookingNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // البحث عن آخر رقم حجز في نفس اليوم
        const lastBooking = await this.constructor.findOne({
            bookingNumber: new RegExp(`^${year}${month}${day}`)
        }).sort({ bookingNumber: -1 });
        
        let sequence = 1;
        if (lastBooking) {
            const lastSequence = parseInt(lastBooking.bookingNumber.slice(-4));
            sequence = lastSequence + 1;
        }
        
        this.bookingNumber = `${year}${month}${day}${sequence.toString().padStart(4, '0')}`;
    }
    next();
});

// Method للتحقق من إمكانية الإلغاء
bookingSchema.methods.canBeCancelled = function() {
    const now = new Date();
    const checkIn = new Date(this.checkInDate);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);
    
    // يمكن الإلغاء إذا كان الحجز معلق أو مؤكد وقبل 24 ساعة من الوصول
    return ['معلق', 'مؤكد'].includes(this.status) && hoursUntilCheckIn > 24;
};

// Method لحساب مبلغ الاسترداد
bookingSchema.methods.calculateRefundAmount = function() {
    const now = new Date();
    const checkIn = new Date(this.checkInDate);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);
    
    if (hoursUntilCheckIn > 48) {
        return this.pricing.totalAmount; // استرداد كامل
    } else if (hoursUntilCheckIn > 24) {
        return this.pricing.totalAmount * 0.5; // استرداد 50%
    } else {
        return 0; // لا يوجد استرداد
    }
};

// Method للحصول على حالة الدفع
bookingSchema.methods.getPaymentStatus = function() {
    if (this.payment.paidAmount >= this.pricing.totalAmount) {
        return 'مدفوع بالكامل';
    } else if (this.payment.paidAmount > 0) {
        return 'مدفوع جزئياً';
    } else {
        return 'غير مدفوع';
    }
};

module.exports = mongoose.model('Booking', bookingSchema);
