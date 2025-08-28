// استخدام Cloudinary للتخزين السحابي للغرف
console.log('☁️ استخدام Cloudinary للتخزين السحابي للغرف');

const {
    uploadRoomImages,
    handleCloudinaryUploadErrors,
    processCloudinaryImagesMiddleware,
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary
} = require('./cloudinaryUpload');

// middleware لرفع صور متعددة للغرف
const uploadMultiple = (fieldName, maxCount = 10) => uploadRoomImages;

// middleware لرفع صور الغرفة
const uploadRoomImagesMiddleware = uploadRoomImages;

// middleware لمعالجة الصور المرفوعة للغرف
const processRoomImages = processCloudinaryImagesMiddleware('room-images');

// دالة موحدة لحذف الصور من Cloudinary
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
        description: 'التخزين السحابي باستخدام Cloudinary للغرف',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder: 'room-images',
        features: [
            'تخزين سحابي دائم',
            'تحسين تلقائي للصور',
            'CDN عالمي سريع',
            'نسخ احتياطي آمن'
        ]
    };
};

module.exports = {
    uploadRoomImages: uploadRoomImagesMiddleware,
    uploadMultiple,
    handleUploadErrors: handleCloudinaryUploadErrors,
    processRoomImages,
    deleteOldFiles,
    getStorageInfo,
    useCloudinary: true // نستخدم Cloudinary للتخزين السحابي
};
