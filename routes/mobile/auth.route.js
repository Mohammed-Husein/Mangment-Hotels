const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// استيراد controllers
const {
    register,
    login,
    refreshToken,
    getProfile,
    updatePassword,
    updateProfile
} = require('../../controllers/user.Controller');

// استيراد middleware
const verifyToken = require('../../middelWare/verifyToken');

// استيراد validation middleware
const {
    validateRegister,
    validateLogin,
    validateRefreshToken,
    validateUpdatePassword,
    validateUpdateProfile
} = require('../../middelWare/customerValidation');

// استيراد upload middleware
const { uploadAvatar, processAvatarImages, handleUploadErrors } = require('../../middelWare/uploadMiddleware');

const uploadUserImage = uploadAvatar;

/**
 * @route   POST /api/mobile/auth/register
 * @desc    تسجيل عميل جديد من تطبيق الموبايل
 * @access  Public
 * @body    firstName, lastName, email, password, confirmPassword, phoneNumber, alternatePhoneNumber, detailedAddress, preferredLanguage, location (اختياري), regionId (اختياري), countryId (اختياري), cityId (اختياري)
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/mobile/auth/login
 * @desc    تسجيل الدخول للعملاء
 * @access  Public
 * @body    email, password
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/mobile/auth/refresh-token
 * @desc    تحديث رمز الوصول باستخدام رمز التحديث
 * @access  Public
 * @body    userId, refreshToken
 */
router.post('/refresh-token', validateRefreshToken, refreshToken);

/**
 * @route   GET /api/mobile/auth/profile
 * @desc    جلب الملف الشخصي للعميل الحالي
 * @access  Private
 */
router.get('/profile', verifyToken, getProfile);

/**
 * @route   GET /api/mobile/auth/profile/:userId
 * @desc    جلب الملف الشخصي لعميل محدد بالمعرف
 * @access  Private
 * @param   userId - معرف المستخدم
 */
router.get('/profile/:userId', verifyToken, getProfile);

/**
 * @route   PUT /api/mobile/auth/change-password
 * @desc    تغيير كلمة المرور للعميل
 * @access  Private
 * @body    userId (اختياري - إذا لم يتم توفيره سيتم أخذه من token), currentPassword, newPassword, confirmPassword
 */
router.put('/change-password', verifyToken, validateUpdatePassword, updatePassword);

/**
 * @route   PUT /api/mobile/auth/update-profile
 * @desc    تحديث الملف الشخصي للعميل من تطبيق الموبايل
 * @access  Private
 * @body    userId (اختياري), firstName, lastName, email, phoneNumber, alternatePhoneNumber, detailedAddress, regionId, countryId, cityId, preferredLanguage, location, notes
 * @files   imageFile (اختياري) - صورة الملف الشخصي
 */
router.put('/update-profile',
    verifyToken,
    uploadAvatar,
    handleUploadErrors,
    processAvatarImages,
    validateUpdateProfile,
    updateProfile
);

module.exports = router;
