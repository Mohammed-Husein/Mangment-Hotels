#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const { createBasicData, clearAllData, resetData, showDataStats } = require('./utils/seedData');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
        process.exit(1);
    }
};

// قطع الاتصال بقاعدة البيانات
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    } catch (error) {
        console.error('❌ خطأ في قطع الاتصال بقاعدة البيانات:', error);
    }
};

// دالة رئيسية
const main = async () => {
    try {
        await connectDB();

        const command = process.argv[2];

        switch (command) {
            case 'create':
                console.log('🚀 تشغيل أمر إنشاء البيانات الأساسية...\n');
                await createBasicData();
                break;

            case 'clear':
                console.log('🗑️ تشغيل أمر حذف جميع البيانات...\n');
                await clearAllData();
                break;

            case 'reset':
                console.log('🔄 تشغيل أمر إعادة تعيين البيانات...\n');
                await resetData();
                break;

            case 'stats':
                console.log('📊 عرض إحصائيات البيانات...\n');
                await showDataStats();
                break;

            default:
                console.log('📋 الأوامر المتاحة:');
                console.log('  node seed.js create  - إنشاء البيانات الأساسية');
                console.log('  node seed.js clear   - حذف جميع البيانات');
                console.log('  node seed.js reset   - إعادة تعيين البيانات (حذف ثم إنشاء)');
                console.log('  node seed.js stats   - عرض إحصائيات البيانات');
                break;
        }

    } catch (error) {
        console.error('💥 خطأ في تشغيل الأمر:', error);
        process.exit(1);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

// تشغيل الدالة الرئيسية
main();
