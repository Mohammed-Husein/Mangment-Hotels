// استخدام Cloudinary للتخزين السحابي العام
console.log('☁️ استخدام Cloudinary للتخزين السحابي العام');

const {
    uploadSingleImage,
    uploadMultipleImages,
    handleCloudinaryUploadErrors,
    processCloudinaryImagesMiddleware,
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary
} = require('./cloudinaryUpload');

// middleware لرفع صورة واحدة (للصور الشخصية والأفاتار)
const uploadSingle = (fieldName) => uploadSingleImage(fieldName);

// middleware لرفع صورة الملف الشخصي
const uploadAvatar = uploadSingle('imageFile');

// middleware لمعالجة الصور المرفوعة للأفاتار
const processAvatarImages = processCloudinaryImagesMiddleware('user-avatars');

// دالة موحدة لحذف الصور من Cloudinary
const deleteOldFile = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
        return false;
    }

    // استخراج public ID من URL
    const matches = imageUrl.match(/\/v\d+\/(.+)\./);
    const publicId = matches ? matches[1] : null;

    if (publicId) {
        return await deleteImageFromCloudinary(publicId);
    }

    return false;
};

// معلومات عن نوع التخزين المستخدم
const getStorageInfo = () => {
    return {
        type: 'cloudinary',
        description: 'التخزين السحابي باستخدام Cloudinary للصور الشخصية',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder: 'user-avatars',
        features: [
            'تخزين سحابي دائم',
            'تحسين تلقائي للصور',
            'CDN عالمي سريع',
            'نسخ احتياطي آمن'
        ]
    };
};

module.exports = {
    uploadAvatar,
    uploadSingle,
    handleUploadErrors: handleCloudinaryUploadErrors,
    processAvatarImages,
    deleteOldFile,
    getStorageInfo,
    useCloudinary: true // نستخدم Cloudinary للتخزين السحابي
};
