const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    // اسم طريقة الدفع (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم طريقة الدفع باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم طريقة الدفع أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم طريقة الدفع 100 حرف']
        },
        en: {
            type: String,
            required: [true, 'اسم طريقة الدفع باللغة الإنجليزية مطلوب'],
            trim: true,
            minlength: [2, 'Payment method name must be more than 2 characters'],
            maxlength: [100, 'Payment method name must not exceed 100 characters']
        }
    },

    // كود طريقة الدفع (فريد)
    code: {
        type: String,
        required: [true, 'كود طريقة الدفع مطلوب'],
        unique: true,
        trim: true,
        uppercase: true,
        minlength: [2, 'كود طريقة الدفع يجب أن يكون أكثر من حرفين'],
        maxlength: [20, 'كود طريقة الدفع يجب أن لا يتجاوز 20 حرف'],
        match: [/^[A-Z0-9_]+$/, 'كود طريقة الدفع يجب أن يحتوي على أحرف إنجليزية كبيرة وأرقام وشرطة سفلية فقط']
    },

    // هل طريقة الدفع نشطة؟
    isActive: {
        type: Boolean,
        default: true
    },

    // وصف طريقة الدفع (اختياري)
    description: {
        ar: {
            type: String,
            trim: true,
            maxlength: [500, 'وصف طريقة الدفع يجب أن لا يتجاوز 500 حرف']
        },
        en: {
            type: String,
            trim: true,
            maxlength: [500, 'Payment method description must not exceed 500 characters']
        }
    },

    // أيقونة طريقة الدفع (اختياري)
    icon: {
        type: String,
        trim: true,
        validate: {
            validator: function(value) {
                if (!value) return true; // اختياري
                return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value);
            },
            message: 'نوع الأيقونة غير مدعوم. الأنواع المدعومة: jpg, jpeg, png, gif, webp, svg'
        }
    },

    // ترتيب العرض
    displayOrder: {
        type: Number,
        default: 0,
        min: [0, 'ترتيب العرض لا يمكن أن يكون سالب']
    },

    // معلومات إضافية (مرنة)
    metadata: {
        type: Map,
        of: String,
        default: new Map()
    }

}, {
    timestamps: true,
    versionKey: false
});

// إنشاء فهارس للبحث والأداء
// paymentMethodSchema.index({ code: 1 }, { unique: true });
paymentMethodSchema.index({ 'name.ar': 'text', 'name.en': 'text' });
paymentMethodSchema.index({ isActive: 1 });
paymentMethodSchema.index({ displayOrder: 1 });

// Method للحصول على الاسم حسب اللغة
paymentMethodSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

// Method للحصول على الوصف حسب اللغة
paymentMethodSchema.methods.getLocalizedDescription = function(language = 'ar') {
    return this.description[language] || this.description.ar || '';
};

// Static method للحصول على طرق الدفع النشطة فقط
paymentMethodSchema.statics.getActivePaymentMethods = function() {
    return this.find({ isActive: true }).sort({ displayOrder: 1, 'name.ar': 1 });
};

// Static method للحصول على أسماء طرق الدفع فقط
paymentMethodSchema.statics.getPaymentMethodNames = function(activeOnly = true) {
    const query = activeOnly ? { isActive: true } : {};
    return this.find(query, { _id: 1, name: 1, code: 1 }).sort({ displayOrder: 1, 'name.ar': 1 });
};

// Middleware قبل الحفظ لتحويل الكود إلى أحرف كبيرة
paymentMethodSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase();
    }
    next();
});

// Middleware قبل التحديث لتحويل الكود إلى أحرف كبيرة
paymentMethodSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
    if (this.getUpdate().code) {
        this.getUpdate().code = this.getUpdate().code.toUpperCase();
    }
    next();
});

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

module.exports = PaymentMethod;
