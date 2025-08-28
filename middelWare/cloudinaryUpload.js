// تحميل مكتبات Cloudinary
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// إعداد تخزين مخصص لـ Cloudinary بدون multer-storage-cloudinary
const storage = multer.memoryStorage();

// إعداد Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// إعداد multer للتخزين في الذاكرة
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB حد أقصى
        files: 10 // حد أقصى 10 ملفات
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يُسمح فقط بملفات الصور'), false);
        }
    }
});

// middleware لرفع صور متعددة
const uploadMultipleImages = upload.array('images', 10);

// middleware لرفع صورة واحدة
const uploadSingleImage = (fieldName) => upload.single(fieldName);

// middleware لرفع صور الفنادق
const uploadHotelImages = upload.array('hotelImages', 10);

// middleware لرفع صور الغرف
const uploadRoomImages = upload.array('roomImages', 10);

// middleware لرفع أيقونة طريقة الدفع
const uploadPaymentMethodIcon = upload.single('icon');

// middleware لمعالجة أخطاء الرفع
const handleCloudinaryUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'fail',
                message: 'حجم الملف كبير جداً. الحد الأقصى 10MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                status: 'fail',
                message: 'عدد الملفات كبير جداً. الحد الأقصى 10 ملفات'
            });
        }
    }
    
    if (err) {
        return res.status(400).json({
            status: 'fail',
            message: err.message || 'خطأ في رفع الملف'
        });
    }
    
    next();
};

// دالة لحذف صورة من Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
    if (!cloudinary) {
        console.warn('⚠️ Cloudinary غير متوفر، لا يمكن حذف الصورة');
        return false;
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('خطأ في حذف الصورة من Cloudinary:', error);
        return false;
    }
};

// دالة لحذف عدة صور من Cloudinary
const deleteMultipleImagesFromCloudinary = async (publicIds) => {
    try {
        const results = await Promise.all(
            publicIds.map(publicId => deleteImageFromCloudinary(publicId))
        );
        return results;
    } catch (error) {
        console.error('خطأ في حذف الصور من Cloudinary:', error);
        return [];
    }
};

// دالة لرفع صورة واحدة إلى Cloudinary
const uploadToCloudinary = async (fileBuffer, originalName, folder = 'hotel-images') => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const publicId = `${folder}-${timestamp}-${randomNum}`;

        cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: publicId,
                transformation: [
                    { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        filename: result.public_id,
                        originalName: originalName,
                        url: result.secure_url,
                        publicId: result.public_id,
                        uploadedAt: new Date()
                    });
                }
            }
        ).end(fileBuffer);
    });
};

// دالة لمعالجة الصور المرفوعة إلى Cloudinary
const processCloudinaryImages = async (req, files, folder = 'hotel-images') => {
    if (!files || files.length === 0) {
        return [];
    }

    const uploadPromises = files.map(file =>
        uploadToCloudinary(file.buffer, file.originalname, folder)
    );

    try {
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        console.error('خطأ في رفع الصور إلى Cloudinary:', error);
        throw error;
    }
};

// middleware لإضافة معلومات الصور إلى req.body
const processCloudinaryImagesMiddleware = (folder = 'hotel-images') => {
    return async (req, res, next) => {
        try {
            if (req.files && req.files.length > 0) {
                req.processedImages = await processCloudinaryImages(req, req.files, folder);
            } else if (req.file) {
                // للصور المفردة
                const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, folder);
                req.processedImage = result;
            } else {
                req.processedImages = [];
            }
            next();
        } catch (error) {
            console.error('خطأ في معالجة الصور:', error);
            return res.status(500).json({
                status: 'fail',
                message: 'خطأ في رفع الصور إلى Cloudinary'
            });
        }
    };
};

// دالة للتحقق من إعداد Cloudinary
const checkCloudinaryConfig = () => {
    const requiredEnvVars = [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('❌ متغيرات Cloudinary مفقودة:', missingVars.join(', '));
        throw new Error(`متغيرات Cloudinary مطلوبة: ${missingVars.join(', ')}`);
    }

    console.log('✅ تم إعداد Cloudinary بنجاح');
    console.log(`☁️ Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    return true;
};

// تشغيل التحقق عند تحميل الملف
checkCloudinaryConfig();

module.exports = {
    // Upload middlewares
    uploadMultipleImages,
    uploadSingleImage,
    uploadHotelImages,
    uploadRoomImages,
    uploadPaymentMethodIcon,
    
    // Error handling
    handleCloudinaryUploadErrors,
    
    // Image processing
    processCloudinaryImages,
    processCloudinaryImagesMiddleware,
    
    // Delete functions
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary,
    
    // Utility functions
    checkCloudinaryConfig,
    uploadToCloudinary,
    cloudinary
};
