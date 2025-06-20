const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorHandler');

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, avatarsDir);
    },
    filename: function (req, file, cb) {
        // إنشاء اسم ملف فريد
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `avatar-${uniqueSuffix}${extension}`;
        
        // حفظ اسم الملف في req.file للاستخدام لاحقاً
        req.uploadedFilename = `uploads/avatars/${filename}`;
        
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
        fileSize: 5 * 1024 * 1024, // 5MB حد أقصى
        files: 1 // ملف واحد فقط
    },
    fileFilter: fileFilter
});

// middleware لرفع صورة واحدة
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        const uploadSingleFile = upload.single(fieldName);
        
        uploadSingleFile(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('حجم الملف كبير جداً. الحد الأقصى 5MB', 400));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new AppError('يمكن رفع ملف واحد فقط', 400));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new AppError('حقل الملف غير متوقع', 400));
                }
                return next(new AppError(`خطأ في رفع الملف: ${err.message}`, 400));
            } else if (err) {
                return next(err);
            }
            
            // إذا تم رفع ملف، تحديث مسار الملف
            if (req.file) {
                req.file.filename = req.uploadedFilename;
            }
            
            next();
        });
    };
};

// middleware لرفع صورة الملف الشخصي
const uploadAvatar = uploadSingle('imageFile');

// دالة لحذف الملف القديم
const deleteOldFile = (filePath) => {
    if (filePath && filePath !== 'uploads/default-avatar.png') {
        const fullPath = path.join(__dirname, '../', filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
};

module.exports = {
    uploadAvatar,
    uploadSingle,
    deleteOldFile
};
