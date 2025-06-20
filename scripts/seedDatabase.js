#!/usr/bin/env node

/**
 * سكريبت لتشغيل بذور البيانات
 * يمكن تشغيله من سطر الأوامر: node scripts/seedDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runCompleteSetup } = require('../utils/seedData');
const { ensureIndexes } = require('../models');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-reservations';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        return true;
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
        throw error;
    }
};

// دالة رئيسية لتشغيل السكريبت
const main = async () => {
    try {
        console.log('🚀 بدء تشغيل سكريبت بذور البيانات...');
        console.log('=' .repeat(50));
        
        // الاتصال بقاعدة البيانات
        await connectDB();
        
        // إنشاء الفهارس
        console.log('📊 إنشاء فهارس قاعدة البيانات...');
        await ensureIndexes();
        
        // تشغيل بذور البيانات
        console.log('🌱 تشغيل بذور البيانات...');
        await runCompleteSetup();
        
        console.log('=' .repeat(50));
        console.log('🎉 تم الانتهاء من جميع العمليات بنجاح!');
        console.log('');
        console.log('📋 ملخص ما تم إنجازه:');
        console.log('✅ تم إنشاء فهارس قاعدة البيانات');
        console.log('✅ تم إضافة البلدان الأساسية');
        console.log('✅ تم إضافة المحافظات السعودية');
        console.log('✅ تم إضافة مناطق الرياض');
        console.log('✅ تم إنشاء مستخدم مدير افتراضي');
        console.log('');
        console.log('🔐 بيانات تسجيل الدخول للمدير:');
        console.log('📧 البريد الإلكتروني: admin@hotel.com');
        console.log('🔑 كلمة المرور: admin123456');
        console.log('');
        console.log('⚠️  تذكير: يرجى تغيير كلمة مرور المدير بعد أول تسجيل دخول!');
        
    } catch (error) {
        console.error('💥 حدث خطأ أثناء تشغيل السكريبت:', error);
        process.exit(1);
    } finally {
        // إغلاق الاتصال بقاعدة البيانات
        await mongoose.connection.close();
        console.log('🔌 تم إغلاق الاتصال بقاعدة البيانات');
        process.exit(0);
    }
};

// التحقق من وجود متغيرات البيئة المطلوبة
const checkEnvironmentVariables = () => {
    const requiredVars = ['MONGO_URI'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn('⚠️  متغيرات البيئة المفقودة:', missingVars.join(', '));
        console.warn('سيتم استخدام القيم الافتراضية');
    }
};

// التحقق من متغيرات البيئة
checkEnvironmentVariables();

// تشغيل السكريبت
if (require.main === module) {
    main();
}

module.exports = { main, connectDB };
