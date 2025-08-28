// استخدام Cloudinary للتخزين السحابي للفنادق
console.log('☁️ استخدام Cloudinary للتخزين السحابي للفنادق');

const {
    uploadSingleImage,
    uploadHotelImages,
    handleCloudinaryUploadErrors,
    processCloudinaryImagesMiddleware,
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary
} = require('./cloudinaryUpload');

// middleware لرفع صورة واحدة للفندق
const uploadSingle = (fieldName) => uploadSingleImage(fieldName);

// middleware لرفع صور متعددة للفندق
const uploadMultiple = (fieldName, maxCount = 10) => uploadHotelImages;

// middleware لرفع صورة الفندق
const uploadHotelImage = uploadSingle('imagefile');

// middleware لمعالجة الصور المرفوعة للفنادق
const processHotelImages = processCloudinaryImagesMiddleware('hotel-images');

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
        description: 'التخزين السحابي باستخدام Cloudinary للفنادق',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder: 'hotel-images',
        features: [
            'تخزين سحابي دائم',
            'تحسين تلقائي للصور',
            'CDN عالمي سريع',
            'نسخ احتياطي آمن'
        ]
    };
};

module.exports = {
    uploadHotelImage,
    uploadSingle,
    uploadMultiple,
    handleUploadErrors: handleCloudinaryUploadErrors,
    processHotelImages,
    deleteOldFiles,
    getStorageInfo,
    useCloudinary: true // نستخدم Cloudinary للتخزين السحابي
};
