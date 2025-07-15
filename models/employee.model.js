const mongoose = require('mongoose');
const validator = require('validator');
const { validationMessages } = require('../utils/errorHandler');

// أدوار الموظفين
const employeeRoles = {
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    RECEPTIONIST: 'Receptionist',
    SUPERVISOR: 'Supervisor',
    WORKER: 'Worker'
};

// حالات الموظف
const employeeStatus = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
    ON_LEAVE: 'OnLeave'
};

const employeeSchema = new mongoose.Schema({
    // رقم الموظف (تلقائي)
    number: {
        type: Number,
        unique: true
    },

    // الاسم الكامل
    fullName: {
        type: String,
        required: [true, validationMessages.required],
        trim: true,
        minlength: [2, 'يجب أن يكون الاسم أكثر من حرفين'],
        maxlength: [100, 'يجب أن لا يتجاوز الاسم 100 حرف']
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

    // رقم الهاتف
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

    // رقم الهاتف الاحتياطي (اختياري)
    alternatePhoneNumber: {
        type: String,
        validate: {
            validator: function(value) {
                // إذا تم توفير القيمة، يجب أن تكون رقم هاتف صحيح
                return !value || validator.isMobilePhone(value, 'any');
            },
            message: 'يرجى إدخال رقم هاتف احتياطي صحيح'
        }
    },

    // كلمة المرور
    password: {
        type: String,
        required: [true, validationMessages.required],
        minlength: [6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل']
    },

    // صورة الموظف
    imageUrl: {
        type: String,
        default: "uploads/Avatar.png"
    },

    // دور الموظف
    role: {
        type: String,
        enum: {
            values: Object.values(employeeRoles),
            message: 'الدور المحدد غير صحيح'
        },
        required: [true, 'دور الموظف مطلوب']
    },

    // معرف البلد/المدينة
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: [true, 'البلد مطلوب'],
        validate: {
            validator: async function(countryId) {
                const Country = mongoose.model('Country');
                const country = await Country.findById(countryId);
                return !!country;
            },
            message: 'البلد المحدد غير موجود'
        }
    },

    // معرف الفندق الذي يعمل به الموظف
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: [true, 'الفندق مطلوب'],
        validate: {
            validator: async function(hotelId) {
                const Hotel = mongoose.model('Hotel');
                const hotel = await Hotel.findById(hotelId);
                return !!hotel;
            },
            message: 'الفندق المحدد غير موجود'
        }
    },

    // حالة الموظف
    status: {
        type: String,
        enum: {
            values: Object.values(employeeStatus),
            message: 'حالة الموظف غير صحيحة'
        },
        default: employeeStatus.ACTIVE
    },

    // آخر ظهور
    lastSeen: {
        type: Date,
        default: Date.now
    },

    // رموز التحديث
    refreshTokens: [{
        token: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }],

    // رمز الجهاز للإشعارات
    deviceToken: {
        type: String
    },

    // الصلاحيات (للأدوار المخصصة)
    permissions: [{
        type: String
    }],

    // معلومات إضافية
    notes: {
        type: String,
        maxlength: [500, 'الملاحظات يجب أن لا تتجاوز 500 حرف']
    },

    // وصف مهام الموظف
    taskDescription: {
        type: String,
        maxlength: [1000, 'وصف المهام يجب أن لا يتجاوز 1000 حرف'],
        trim: true
    },

    // معلومات تغيير الحالة
    statusChangeReason: String,
    statusChangedAt: Date,
    statusChangedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // تاريخ التوظيف
    hireDate: {
        type: Date,
        default: Date.now
    },

    // معلومات إنشاء الحساب
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            // إزالة كلمة المرور من الاستجابة
            delete ret.password;
            delete ret.refreshTokens;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
// employeeSchema.index({ email: 1 });
employeeSchema.index({ phoneNumber: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ countryId: 1 });
employeeSchema.index({ hotelId: 1 });
employeeSchema.index({ fullName: 'text', email: 'text' });

// Virtual للحصول على اسم البلد
employeeSchema.virtual('countryName', {
    ref: 'Country',
    localField: 'countryId',
    foreignField: '_id',
    justOne: true
});

// Virtual للحصول على اسم الفندق
employeeSchema.virtual('hotelName', {
    ref: 'Hotel',
    localField: 'hotelId',
    foreignField: '_id',
    justOne: true
});

// Virtual للحصول على اسم الدور
employeeSchema.virtual('roleName').get(function() {
    return this.role;
});

// Middleware لتوليد رقم الموظف تلقائياً
employeeSchema.pre('save', async function(next) {
    if (this.isNew && !this.number) {
        const lastEmployee = await this.constructor.findOne({}, {}, { sort: { number: -1 } });
        this.number = lastEmployee ? lastEmployee.number + 1 : 1;
    }
    next();
});

// Middleware لتحديث lastSeen عند تسجيل الدخول
employeeSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    return this.save();
};

// Middleware للتحقق من وجود البلد قبل الحفظ
employeeSchema.pre('save', async function(next) {
    if (this.isModified('countryId')) {
        const Country = mongoose.model('Country');
        const country = await Country.findById(this.countryId);
        if (!country) {
            return next(new Error('البلد المحدد غير موجود'));
        }
        if (!country.isActive) {
            return next(new Error('البلد المحدد غير نشط'));
        }
    }
    next();
});

// Middleware للتحقق من وجود الفندق قبل الحفظ
employeeSchema.pre('save', async function(next) {
    if (this.isModified('hotelId')) {
        const Hotel = mongoose.model('Hotel');
        const hotel = await Hotel.findById(this.hotelId);
        if (!hotel) {
            return next(new Error('الفندق المحدد غير موجود'));
        }
        if (!hotel.isActive) {
            return next(new Error('الفندق المحدد غير نشط'));
        }
    }
    next();
});

// تصدير الثوابت مع النموذج
employeeSchema.statics.roles = employeeRoles;
employeeSchema.statics.status = employeeStatus;

module.exports = mongoose.model('Employee', employeeSchema);
