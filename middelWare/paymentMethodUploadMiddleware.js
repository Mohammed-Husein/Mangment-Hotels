// استخدام Cloudinary للتخزين السحابي لطرق الدفع
console.log('☁️ استخدام Cloudinary للتخزين السحابي لطرق الدفع');

const {
    uploadPaymentMethodIcon,
    handleCloudinaryUploadErrors,
    processCloudinaryImagesMiddleware,
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary
} = require('./cloudinaryUpload');

// middleware لرفع أيقونة طريقة الدفع
const uploadSingle = (fieldName) => uploadPaymentMethodIcon;

// middleware لرفع أيقونة طريقة الدفع
const uploadPaymentIcon = uploadPaymentMethodIcon;

// middleware لرفع أيقونة طريقة الدفع
const uploadPaymentIcon = uploadPaymentMethodIcon;

// middleware لمعالجة الأيقونة المرفوعة لطرق الدفع
const processPaymentMethodImages = processCloudinaryImagesMiddleware('payment-method-icons');

// دالة موحدة لحذف الأيقونات من Cloudinary
const deleteOldFiles = async (imageUrls) => {
    if (!Array.isArray(imageUrls) && imageUrls) {
        imageUrls = [imageUrls];
    }

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return [];
    }

    // استخراج public IDs من URLs
    const publicIds = imageUrls
        .filter(url => url && url.includes('cloudinary.com'))
        .map(url => {
            // استخراج public ID من Cloudinary URL
            const matches = url.match(/\/v\d+\/(.+)\./);
            return matches ? matches[1] : null;
        })
        .filter(id => id);

    if (publicIds.length > 0) {
        return await deleteMultipleImagesFromCloudinary(publicIds);
    }

    return [];
};

// معلومات عن نوع التخزين المستخدم
const getStorageInfo = () => {
    return {
        type: 'cloudinary',
        description: 'التخزين السحابي باستخدام Cloudinary لأيقونات طرق الدفع',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder: 'payment-method-icons',
        features: [
            'تخزين سحابي دائم',
            'تحسين تلقائي للأيقونات',
            'CDN عالمي سريع',
            'نسخ احتياطي آمن'
        ]
    };
};

module.exports = {
    uploadPaymentIcon,
    uploadSingle,
    handleUploadErrors: handleCloudinaryUploadErrors,
    processPaymentMethodImages,
    deleteOldFiles,
    getStorageInfo,
    useCloudinary: true // نستخدم Cloudinary للتخزين السحابي
};
