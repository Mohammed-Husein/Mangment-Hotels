require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

// استيراد الروتات الجديدة
const apiRoutes = require('./routes/index');

// استيراد معالج الأخطاء
const { globalErrorHandler } = require('./utils/errorHandler');

// استيراد الوظائف المجدولة
const { startScheduledTasks, initializeRoomStatus } = require('./utils/scheduledTasks');

const app = express();

// إعداد اتصال MongoDB
const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/hotel-reservations';

mongoose.connect(mongoUrl)
.then(async () => {
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    
    // تهيئة حالة الغرف عند بدء التشغيل (بعد 3 ثوانٍ)
    setTimeout(async () => {
        try {
            await initializeRoomStatus();
        } catch (error) {
            console.error("❌ خطأ في تهيئة حالة الغرف:", error);
        }
    }, 3000);
})
.catch((err) => {
    console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err);
    process.exit(1);
});

// إعداد CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ملفات الرفع الثابتة
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// الروتات الرئيسية
app.use('/api', apiRoutes);

// روت الصفحة الرئيسية
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'مرحباً بك في نظام إدارة حجوزات الفنادق',
        version: '1.0.0',
        documentation: '/api',
        timestamp: new Date().toISOString()
    });
});

// معالج الروتات غير الموجودة
// app.all('*', (req, res, next) => {
//     res.status(404).json({
//         status: 'fail',
//         message: `الرابط ${req.originalUrl} غير موجود على هذا الخادم`
//     });
// });

// معالج الأخطاء العام
app.use(globalErrorHandler);

// إعداد المنفذ
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 الرابط: http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(mongoose.connection.readyState); 
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

    // بدء تشغيل الوظائف المجدولة
    startScheduledTasks();
});