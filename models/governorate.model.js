const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const governorateSchema = new mongoose.Schema({
    // اسم المحافظة (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم المحافظة باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم المحافظة أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم المحافظة 100 حرف']
        },
        en: {
            type: String,
            trim: true,
            minlength: [2, 'Governorate name must be more than 2 characters'],
            maxlength: [100, 'Governorate name must not exceed 100 characters']
        }
    },
    
    // معرف البلد (مطلوب)
    country: {
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
    

    
    // حالة المحافظة
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
governorateSchema.index({ country: 1 });
governorateSchema.index({ 'name.ar': 1 });
governorateSchema.index({ 'name.en': 1 });
governorateSchema.index({ country: 1, 'name.ar': 1 }, { unique: true }); // منع تكرار اسم المحافظة في نفس البلد
governorateSchema.index({ 'name.ar': 'text', 'name.en': 'text' });
governorateSchema.index({ isActive: 1 });

// Virtual للحصول على عدد المناطق
governorateSchema.virtual('regionsCount', {
    ref: 'Region',
    localField: '_id',
    foreignField: 'governorate',
    count: true
});



// Middleware لحذف المناطق المرتبطة عند حذف المحافظة
governorateSchema.pre('remove', async function(next) {
    await this.model('Region').deleteMany({ governorate: this._id });
    next();
});

// Middleware للتحقق من وجود البلد قبل الحفظ
governorateSchema.pre('save', async function(next) {
    if (this.isModified('country')) {
        const Country = mongoose.model('Country');
        const country = await Country.findById(this.country);
        if (!country) {
            return next(new Error('البلد المحدد غير موجود'));
        }
        if (!country.isActive) {
            return next(new Error('البلد المحدد غير نشط'));
        }
    }
    next();
});

// Method للحصول على اسم المحافظة حسب اللغة
governorateSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

// Method للحصول على المسار الكامل (البلد > المحافظة)
governorateSchema.methods.getFullPath = async function(language = 'ar') {
    await this.populate('country');
    const countryName = this.country.getLocalizedName(language);
    const governorateName = this.getLocalizedName(language);
    return `${countryName} > ${governorateName}`;
};

module.exports = mongoose.model('Governorate', governorateSchema);
