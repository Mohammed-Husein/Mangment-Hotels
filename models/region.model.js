const mongoose = require('mongoose');
const { validationMessages } = require('../utils/errorHandler');

const regionSchema = new mongoose.Schema({
    // اسم المنطقة (متعدد اللغات)
    name: {
        ar: {
            type: String,
            required: [true, 'اسم المنطقة باللغة العربية مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون اسم المنطقة أكثر من حرفين'],
            maxlength: [100, 'يجب أن لا يتجاوز اسم المنطقة 100 حرف']
        },
        en: {
            type: String,
            trim: true,
            minlength: [2, 'Region name must be more than 2 characters'],
            maxlength: [100, 'Region name must not exceed 100 characters']
        }
    },
    

    
    // معرف المحافظة (مطلوب)
    governorate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Governorate',
        required: [true, 'المحافظة مطلوبة'],
        validate: {
            validator: async function(governorateId) {
                const Governorate = mongoose.model('Governorate');
                const governorate = await Governorate.findById(governorateId);
                return !!governorate && governorate.isActive;
            },
            message: 'المحافظة المحددة غير موجودة أو غير نشطة'
        }
    },
    

    
    // حالة المنطقة
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
regionSchema.index({ governorate: 1 });
regionSchema.index({ 'name.ar': 1 });
regionSchema.index({ 'name.en': 1 });
regionSchema.index({ governorate: 1, 'name.ar': 1 }, { unique: true }); // منع تكرار اسم المنطقة في نفس المحافظة
regionSchema.index({ 'name.ar': 'text', 'name.en': 'text' });
regionSchema.index({ isActive: 1 });

// Virtual للحصول على عدد العملاء في هذه المنطقة
regionSchema.virtual('customersCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'regionId',
    count: true
});

// Middleware للتحقق من صحة المحافظة قبل الحفظ
regionSchema.pre('save', async function(next) {
    if (this.isModified('governorate')) {
        const Governorate = mongoose.model('Governorate');
        const governorate = await Governorate.findById(this.governorate);

        if (!governorate) {
            return next(new Error('المحافظة المحددة غير موجودة'));
        }

        if (!governorate.isActive) {
            return next(new Error('المحافظة المحددة غير نشطة'));
        }
    }
    next();
});

// Method للحصول على اسم المنطقة حسب اللغة
regionSchema.methods.getLocalizedName = function(language = 'ar') {
    return this.name[language] || this.name.ar;
};

module.exports = mongoose.model('Region', regionSchema);
