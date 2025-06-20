const mongoose = require('mongoose');
const validator = require('validator');
const { validationMessages } = require('../utils/errorHandler');

const userSchema = new mongoose.Schema({
    // رقم العميل (تلقائي)
    number: {
        type: Number,
        unique: true
    },

    // الاسم الأول
    firstName: {
        type: String,
        required: [true, validationMessages.required],
        trim: true,
        minlength: [2, 'يجب أن يكون الاسم الأول أكثر من حرفين'],
        maxlength: [50, 'يجب أن لا يتجاوز الاسم الأول 50 حرف']
    },

    // الاسم الأخير
    lastName: {
        type: String,
        required: [true, validationMessages.required],
        trim: true,
        minlength: [2, 'يجب أن يكون الاسم الأخير أكثر من حرفين'],
        maxlength: [50, 'يجب أن لا يتجاوز الاسم الأخير 50 حرف']
    },

    // البريد الإلكتروني
    email: {
        type: String,
        required: [true, validationMessages.required],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(value) {
                return validator.isEmail(value);
            },
            message: 'يرجى إدخال بريد إلكتروني صحيح'
        }
    },

    // كلمة المرور
    password: {
        type: String,
        required: [true, validationMessages.required],
        minlength: [6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل']
    },

    // رقم الهاتف الأساسي
    phoneNumber: {
        type: String,
        required: [true, validationMessages.required],
        validate: {
            validator: function(value) {
                return validator.isMobilePhone(value, 'any');
            },
            message: 'يرجى إدخال رقم هاتف صحيح'
        }
    },

    // رقم الهاتف البديل
    alternatePhoneNumber: {
        type: String,
        validate: {
            validator: function(value) {
                return !value || validator.isMobilePhone(value, 'any');
            },
            message: 'يرجى إدخال رقم هاتف بديل صحيح'
        }
    },

    // معرف المنطقة (اختياري للموبايل)
    regionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Region'
    },

    // معرف البلد (اختياري للموبايل)
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country'
    },

    // معرف المدينة (اختياري للموبايل)
    cityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Governorate'
    },

    // العنوان التفصيلي
    detailedAddress: {
        type: String,
        required: [true, 'العنوان التفصيلي مطلوب'],
    },

    // إحداثيات الموقع (اختيارية)
    location: {
        latitude: {
            type: Number,
            min: [-90, 'خط العرض يجب أن يكون بين -90 و 90'],
            max: [90, 'خط العرض يجب أن يكون بين -90 و 90']
        },
        longitude: {
            type: Number,
            min: [-180, 'خط الطول يجب أن يكون بين -180 و 180'],
            max: [180, 'خط الطول يجب أن يكون بين -180 و 180']
        }
    },

    // صورة الملف الشخصي
    avatar: {
        type: String,
        default: 'uploads/default-avatar.png'
    },

    // اللغة المفضلة
    preferredLanguage: {
        type: String,
        enum: ['Arabic', 'English'],
        default: 'Arabic'
    },

    // حالة العميل
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    },

    // آخر ظهور
    lastSeen: {
        type: Date,
        default: Date.now
    },

    // رمز التحقق لإعادة تعيين كلمة المرور
    passwordResetToken: String,
    passwordResetExpires: Date,

    // رمز تفعيل الحساب
    emailVerificationToken: String,
    emailVerified: {
        type: Boolean,
        default: false
    },

    // معلومات إضافية للعميل
    notes: {
        type: String,
        maxlength: [500, 'الملاحظات يجب أن لا تتجاوز 500 حرف']
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // إزالة كلمة المرور من الاستجابة
            delete ret.password;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
// userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ status: 1 });
userSchema.index({ countryId: 1 });
userSchema.index({ regionId: 1 });
userSchema.index({ cityId: 1 });
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual للاسم الكامل
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual للحصول على اسم البلد
userSchema.virtual('countryName', {
    ref: 'Country',
    localField: 'countryId',
    foreignField: '_id',
    justOne: true
});

// Virtual للحصول على الحجوزات
userSchema.virtual('bookings', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'customer',
    options: { sort: { createdAt: -1 } }
});

// Middleware لتوليد رقم العميل تلقائياً
userSchema.pre('save', async function(next) {
    if (this.isNew && !this.number) {
        const lastUser = await this.constructor.findOne({}, {}, { sort: { number: -1 } });
        this.number = lastUser ? lastUser.number + 1 : 1;
    }
    next();
});

// Middleware لتحديث lastSeen
userSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    return this.save();
};

module.exports = mongoose.model('User', userSchema);