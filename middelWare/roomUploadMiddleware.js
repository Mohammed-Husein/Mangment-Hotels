const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorHandler');

// إنشاء مجلد uploads/rooms إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
const roomsDir = path.join(uploadsDir, 'rooms');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(roomsDir)) {
    fs.mkdirSync(roomsDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, roomsDir);
    },
    filename: function (req, file, cb) {
        // إنشاء اسم ملف فريد
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `room-${uniqueSuffix}${extension}`;
        
        cb(null, filename);
    }
});

// فلترة أنواع الملفات المسموحة
const fileFilter = (req, file, cb) => {
    // أنواع الملفات المسموحة
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new AppError('نوع الملف غير مدعوم. يُسمح فقط بملفات الصور (JPEG, JPG, PNG, GIF, WEBP)', 400));
    }
};

// إعداد multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB حد أقصى لكل صورة
        files: 10 // حد أقصى 10 صور
    },
    fileFilter: fileFilter
});

// middleware لرفع صور متعددة
const uploadMultiple = (fieldName, maxCount = 10) => {
    return (req, res, next) => {
        const uploadMultipleFiles = upload.array(fieldName, maxCount);
        
        uploadMultipleFiles(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('حجم الملف كبير جداً. الحد الأقصى 5MB لكل صورة', 400));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new AppError(`يمكن رفع ${maxCount} صور كحد أقصى`, 400));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new AppError('حقل الملف غير متوقع', 400));
                }
                return next(new AppError(`خطأ في رفع الملف: ${err.message}`, 400));
            } else if (err) {
                return next(err);
            }
            
            next();
        });
    };
};

// middleware لرفع صور الغرفة
const uploadRoomImages = uploadMultiple('roomImages', 10);

// دالة لحذف الملفات القديمة
const deleteOldFiles = (filePaths) => {
    if (Array.isArray(filePaths)) {
        filePaths.forEach(filePath => {
            if (filePath && !filePath.includes('default')) {
                const fullPath = path.join(__dirname, '../', filePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (error) {
                        console.error('خطأ في حذف الملف القديم:', error);
                    }
                }
            }
        });
    }
};

module.exports = {
    uploadRoomImages,
    uploadMultiple,
    deleteOldFiles
};
