const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const countrySchema = new mongoose.Schema({
    // اسم البلد (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم البلد باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم البلد أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم البلد 100 حرف'],

        },
        en: {
            type: String,
            trim: true,
            minlength: [2, 'Country name must be more than 2 characters'],
            maxlength: [100, 'Country name must not exceed 100 characters']
        }
    },
    
    // رمز البلد (ISO Code)
    code: {
        type: String,
        required: [true, 'رمز البلد مطلوب'],
        uppercase: true,
        minlength: [2, 'رمز البلد يجب أن يكون حرفين على الأقل'],
        maxlength: [3, 'رمز البلد يجب أن لا يتجاوز 3 أحرف'],
        unique: true,
        validate: {
            validator: function(value) {
                return /^[A-Z]{2,3}$/.test(value);
            },
            message: 'رمز البلد يجب أن يحتوي على أحرف إنجليزية كبيرة فقط'
        }
    },
    
    // رمز الهاتف الدولي
    phoneCode: {
        type: String,
        validate: {
            validator: function(value) {
                return !value || /^\+\d{1,4}$/.test(value);
            },
            message: 'رمز الهاتف الدولي غير صحيح (مثال: +966)'
        }
    },
    
    // العملة
    currency: {
        code: {
            type: String,
            uppercase: true,
            minlength: [3, 'رمز العملة يجب أن يكون 3 أحرف'],
            maxlength: [3, 'رمز العملة يجب أن يكون 3 أحرف'],
            validate: {
                validator: function(value) {
                    return !value || /^[A-Z]{3}$/.test(value);
                },
                message: 'رمز العملة يجب أن يحتوي على 3 أحرف إنجليزية كبيرة'
            }
        },
        name: {
            ar: String,
            en: String
        },
        symbol: String
    },
    
    // حالة البلد
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// فهرسة للبحث السريع
countrySchema.index({ 'name.ar': 1 });
countrySchema.index({ 'name.en': 1 });
// countrySchema.index({ code: 1 });
countrySchema.index({ 'name.ar': 'text', 'name.en': 'text' });

// Virtual للحصول على عدد المحافظات
countrySchema.virtual('governoratesCount', {
    ref: 'Governorate',
    localField: '_id',
    foreignField: 'country',
    count: true
});

// Virtual للحصول على عدد المناطق
countrySchema.virtual('regionsCount', {
    ref: 'Region',
    localField: '_id',
    foreignField: 'country',
    count: true
});

// Middleware لحذف المحافظات والمناطق المرتبطة عند حذف البلد
countrySchema.pre('remove', async function(next) {
    await this.model('Governorate').deleteMany({ country: this._id });
    await this.model('Region').deleteMany({ country: this._id });
    next();
});

// Method للحصول على اسم البلد حسب اللغة
countrySchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

module.exports = mongoose.model('Country', countrySchema);
