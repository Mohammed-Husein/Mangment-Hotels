const User = require("../models/user.model.js");
const Country = require("../models/country.model.js");
const genirate_JWT = require("../utils/genirate_JWT.js");
const httpStatusText = require("../utils/httpStatusText.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

// دالة تشفير كلمة المرور
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

// دالة مقارنة كلمة المرور
const comparePassword = async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
};

// دالة توليد رمز التحديث
const generateRefreshToken = () => {
    return jwt.sign(
        { type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
        { expiresIn: '7d' }
    );
};

// دالة حفظ رمز التحديث
const saveRefreshToken = async (userId, refreshToken) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 أيام

    await User.findByIdAndUpdate(userId, {
        $push: {
            refreshTokens: {
                token: refreshToken,
                expiresAt
            }
        }
    });
};

// دالة تنظيف رموز التحديث المنتهية الصلاحية
const cleanExpiredRefreshTokens = async (userId) => {
    await User.findByIdAndUpdate(userId, {
        $pull: {
            refreshTokens: {
                expiresAt: { $lt: new Date() }
            }
        }
    });
};

/**
 * جلب جميع العملاء مع الباجينيشن والبحث والفلترة
 * للوحة التحكم فقط
 */
const getAllUsers = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['firstName', 'lastName', 'email', 'phoneNumber'];

    // بناء استعلام الفلترة
    let query = {};

    // فلترة حسب الحالة
    if (req.query.status) {
        query.status = req.query.status;
    }

    // فلترة حسب البلد
    if (req.query.countryId) {
        query.countryId = req.query.countryId;
    }

    // فلترة حسب المدينة
    if (req.query.cityId) {
        query.cityId = req.query.cityId;
    }

    // فلترة حسب المنطقة
    if (req.query.regionId) {
        query.regionId = req.query.regionId;
    }

    // إضافة populate للبلد والحجوزات
    options.populate = [
        {
            path: 'countryId',
            select: 'name'
        },
 
    ];

    const result = await paginate(User, query, options);

    // تنسيق البيانات حسب المطلوب
    const formattedCustomers = result.data.map(user => ({
        id: user._id,
        number: user.number,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        countryName: user.countryId ?
            (user.countryId.name?.ar || user.countryId.name?.en || 'غير محدد') : 'غير محدد',
        phoneNumber: user.phoneNumber,
        status: user.status,
        lastSeen: user.lastSeen
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب العملاء بنجاح',
        data: {
            count: result.pagination.totalCount,
            customers: formattedCustomers
        },
        pagination: result.pagination
    });
});

/**
 * جلب مستخدم واحد بالمعرف
 */
const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.userId)
        .select('-password -refreshTokens -passwordResetToken -emailVerificationToken');

    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب المستخدم بنجاح',
        data: { user }
    });
});

/**
 * إضافة عميل جديد من لوحة التحكم
 */
const addUser = catchAsync(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        phoneNumber,
        alternatePhoneNumber,
        regionId,
        countryId,
        cityId,
        detailedAddress,
        preferredLanguage
    } = req.body;

    // التحقق من تطابق كلمة المرور
    if (password !== confirmPassword) {
        throw new AppError('كلمة المرور وتأكيد كلمة المرور غير متطابقتان', 400);
    }

    // التحقق من عدم وجود عميل بنفس البريد الإلكتروني
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new AppError('يوجد عميل مسجل بهذا البريد الإلكتروني مسبقاً', 400);
    }

    // التحقق من عدم وجود عميل بنفس رقم الهاتف
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
        throw new AppError('يوجد عميل مسجل بهذا رقم الهاتف مسبقاً', 400);
    }

    // تشفير كلمة المرور
    const hashedPassword = await hashPassword(password);

    // إنشاء العميل الجديد
    const newUser = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        alternatePhoneNumber,
        regionId,
        countryId,
        cityId,
        detailedAddress,
        preferredLanguage: preferredLanguage || 'Arabic',
        status: 'Active',
        emailVerified: true,
        lastSeen: new Date()
    });

    await newUser.save();

    // جلب البيانات مع populate
    const populatedUser = await User.findById(newUser._id)
        .populate('countryId', 'name')
        .populate('regionId', 'name')
        .populate('cityId', 'name');

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة العميل بنجاح',
        data: { customer: populatedUser }
    });
});

/**
 * تسجيل عميل جديد من تطبيق الموبايل
 */
const register = catchAsync(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        phoneNumber,
        alternatePhoneNumber,
        regionId,
        countryId,
        cityId,
        detailedAddress,
        preferredLanguage,
        location
    } = req.body;

    // التحقق من تطابق كلمة المرور
    if (password !== confirmPassword) {
        throw new AppError('كلمة المرور وتأكيد كلمة المرور غير متطابقتان', 400);
    }

    // التحقق من وجود العميل مسبقاً
    const existingUser = await User.findOne({
        $or: [
            { email: email.toLowerCase() },
            { phoneNumber }
        ]
    });

    if (existingUser) {
        throw new AppError('العميل موجود مسبقاً بنفس البريد الإلكتروني أو رقم الهاتف', 400);
    }

    // تشفير كلمة المرور
    const hashedPassword = await hashPassword(password);

    // إنشاء العميل الجديد
    const newUserData = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        alternatePhoneNumber,
        detailedAddress,
        preferredLanguage: preferredLanguage || 'Arabic',
        status: 'Active',
        emailVerified: false, // يحتاج تفعيل
        lastSeen: new Date()
    };

    // إضافة الحقول الاختيارية إذا تم توفيرها
    if (regionId) newUserData.regionId = regionId;
    if (countryId) newUserData.countryId = countryId;
    if (cityId) newUserData.cityId = cityId;
    if (location && (location.latitude || location.longitude)) {
        newUserData.location = location;
    }

    const newUser = new User(newUserData);

    await newUser.save();

    // توليد رمز الوصول
    const accessToken = await genirate_JWT({
        email: newUser.email,
        id: newUser._id,
        'user-type': 'User'
    });

    // توليد رمز التحديث
    const refreshToken = generateRefreshToken();

    // حفظ رمز التحديث
    await saveRefreshToken(newUser._id, refreshToken);

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم التسجيل بنجاح',
        data: {
            user: newUser,
            userInfo: {
                id: newUser._id,
                name: `${newUser.firstName} ${newUser.lastName}`
            },
            accessToken,
            refreshToken
        }
    });
});

/**
 * تسجيل الدخول للعملاء من تطبيق الموبايل
 */
const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // التحقق من وجود البيانات المطلوبة
    if (!email || !password) {
        throw new AppError('البريد الإلكتروني وكلمة المرور مطلوبان', 400);
    }

    // البحث عن العميل
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // التحقق من حالة الحساب
    if (user.status !== 'Active') {
        throw new AppError('الحساب غير مفعل. يرجى التواصل مع الإدارة', 401);
    }

    // مقارنة كلمة المرور
    const isPasswordCorrect = await comparePassword(password, user.password);

    if (!isPasswordCorrect) {
        throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // تحديث آخر ظهور
    await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });

    // تنظيف رموز التحديث المنتهية الصلاحية
    await cleanExpiredRefreshTokens(user._id);

    // توليد رمز الوصول
    const accessToken = await genirate_JWT({
        email: user.email,
        id: user._id,
        'user-type': 'User'
    });

    // توليد رمز التحديث
    const refreshToken = generateRefreshToken();

    // حفظ رمز التحديث
    await saveRefreshToken(user._id, refreshToken);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
            user: user,
            userInfo: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`
            },
            accessToken,
            refreshToken
        }
    });
});

/**
 * تحديث رمز الوصول باستخدام رمز التحديث
 */
const refreshToken = catchAsync(async (req, res) => {
    const { userId, refreshToken: userRefreshToken } = req.body;

    // التحقق من وجود البيانات المطلوبة
    if (!userId || !userRefreshToken) {
        throw new AppError('معرف المستخدم ورمز التحديث مطلوبان', 400);
    }

    // البحث عن المستخدم
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    // التحقق من حالة الحساب
    if (user.status !== 'Active') {
        throw new AppError('الحساب غير مفعل', 401);
    }

    // تنظيف رموز التحديث المنتهية الصلاحية
    await cleanExpiredRefreshTokens(userId);

    // البحث عن رمز التحديث في قاعدة البيانات
    const tokenRecord = user.refreshTokens.find(
        tokenObj => tokenObj.token === userRefreshToken && tokenObj.expiresAt > new Date()
    );

    if (!tokenRecord) {
        throw new AppError('رمز التحديث غير صحيح أو منتهي الصلاحية', 401);
    }

    // توليد رمز وصول جديد
    const newAccessToken = await genirate_JWT({
        email: user.email,
        id: user._id,
        'user-type': 'User'
    });

    // توليد رمز تحديث جديد
    const newRefreshToken = generateRefreshToken();

    // إزالة رمز التحديث القديم وإضافة الجديد
    await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: userRefreshToken } }
    });

    await saveRefreshToken(userId, newRefreshToken);

    // تحديث آخر ظهور
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث رمز الوصول بنجاح',
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            userInfo: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`
            }
        }
    });
});

/**
 * تحديث بيانات المستخدم
 */
const updateUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const updateData = { ...req.body };

    // إزالة الحقول التي لا يجب تحديثها مباشرة
    delete updateData.passwordResetToken;
    delete updateData.emailVerificationToken;

    // تحديث الصورة إذا تم رفعها
    if (req.file) {
        updateData.avatar = req.file.filename;
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).select('-passwordResetToken -emailVerificationToken');

    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات المستخدم بنجاح',
        data: { user }
    });
});

/**
 * تحديث كلمة المرور للعملاء من تطبيق الموبايل
 */
const updatePassword = catchAsync(async (req, res) => {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body;
    // يمكن أخذ userId من body أو من middleware التحقق
    const targetUserId = userId || req.user?.id;

    // التحقق من وجود userId
    if (!targetUserId) {
        throw new AppError('معرف المستخدم مطلوب', 400);
    }

    // التحقق من تطابق كلمة المرور الجديدة
    if (newPassword !== confirmPassword) {
        throw new AppError('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتان', 400);
    }

    // البحث عن العميل
    const user = await User.findById(targetUserId);

    if (!user) {
        throw new AppError('العميل غير موجود', 404);
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordCorrect = await comparePassword(currentPassword, user.password);

    if (!isCurrentPasswordCorrect) {
        throw new AppError('كلمة المرور الحالية غير صحيحة', 400);
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await hashPassword(newPassword);

    // تحديث كلمة المرور
    await User.findByIdAndUpdate(targetUserId, {
        password: hashedNewPassword
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث كلمة المرور بنجاح'
    });
});

// تم إزالة updateUserRole للمستخدمين العاديين لأنهم لا يحتاجون أدوار

/**
 * تفعيل/إلغاء تفعيل المستخدم
 */
const toggleUserStatus = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true, runValidators: true }
    ).select('-password -refreshTokens -passwordResetToken -emailVerificationToken');

    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    // إزالة رموز التحديث إذا تم إلغاء التفعيل
    if (!isActive) {
        await User.findByIdAndUpdate(userId, {
            $set: { refreshTokens: [] }
        });
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: `تم ${isActive ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`,
        data: { user }
    });
});

/**
 * حذف المستخدم
 */
const deleteUser = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف المستخدم بنجاح',
        data: null
    });
});

// تم إزالة logout و logoutAll للمستخدمين العاديين لأنهم لا يحتاجون نظام مصادقة معقد

/**
 * الحصول على الملف الشخصي للعميل
 */
const getProfile = catchAsync(async (req, res) => {
    // يمكن أخذ userId من params أو query أو من middleware التحقق
    const userId = req.params.userId || req.query.userId || req.user?.id;

    // التحقق من وجود userId
    if (!userId) {
        throw new AppError('معرف المستخدم مطلوب', 400);
    }

    const user = await User.findById(userId)
        .populate('countryId', 'name')
        .populate('regionId', 'name')
        .populate('cityId', 'name')
        .populate('bookings', '_id bookingNumber status totalAmount createdAt')
        .select('-passwordResetToken -emailVerificationToken');

    if (!user) {
        throw new AppError('العميل غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الملف الشخصي بنجاح',
        data: {
            customer: user,
            profile: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phoneNumber: user.phoneNumber,
                status: user.status
            }
        }
    });
});

/**
 * تحديث الملف الشخصي للعميل من تطبيق الموبايل
 */
const updateProfile = catchAsync(async (req, res) => {
    const { userId } = req.body;
    // يمكن أخذ userId من body أو من middleware التحقق
    const targetUserId = userId || req.user?.id;

    // التحقق من وجود userId
    if (!targetUserId) {
        throw new AppError('معرف المستخدم مطلوب', 400);
    }

    // البحث عن العميل
    const existingUser = await User.findById(targetUserId);
    if (!existingUser) {
        throw new AppError('العميل غير موجود', 404);
    }

    // إعداد البيانات للتحديث
    const updateData = { ...req.body };

    // إزالة الحقول التي لا يجب تحديثها مباشرة
    delete updateData.userId;
    delete updateData.password;
    delete updateData.passwordResetToken;
    delete updateData.emailVerificationToken;
    delete updateData.status;
    delete updateData.emailVerified;
    delete updateData.number;

    // التحقق من عدم تكرار البريد الإلكتروني
    if (updateData.email && updateData.email.toLowerCase() !== existingUser.email) {
        const emailExists = await User.findOne({
            email: updateData.email.toLowerCase(),
            _id: { $ne: targetUserId }
        });

        if (emailExists) {
            throw new AppError('البريد الإلكتروني مستخدم من قبل عميل آخر', 400);
        }

        updateData.email = updateData.email.toLowerCase();
    }

    // التحقق من عدم تكرار رقم الهاتف
    if (updateData.phoneNumber && updateData.phoneNumber !== existingUser.phoneNumber) {
        const phoneExists = await User.findOne({
            phoneNumber: updateData.phoneNumber,
            _id: { $ne: targetUserId }
        });

        if (phoneExists) {
            throw new AppError('رقم الهاتف مستخدم من قبل عميل آخر', 400);
        }
    }

    // تحديث الصورة إذا تم رفعها
    if (req.file) {
        updateData.avatar = req.file.filename;
    }

    // تحديث بيانات العميل
    const updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
    .populate('countryId', 'name')
    .populate('regionId', 'name')
    .populate('cityId', 'name')
    .select('-passwordResetToken -emailVerificationToken');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث الملف الشخصي بنجاح',
        data: {
            user: updatedUser,
            profile: {
                id: updatedUser._id,
                name: `${updatedUser.firstName} ${updatedUser.lastName}`,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                avatar: updatedUser.avatar
            }
        }
    });
});

/**
 * جلب مستخدم واحد بالمعرف (تابع منفصل)
 * GetUserById
 */
const getUserById = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId)
        .select('-passwordResetToken -emailVerificationToken')
      

    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب المستخدم بنجاح',
        data: { user }
    });
});

/**
 * جلب جميع أسماء المستخدمين مع المعرفات فقط
 * GetAllUserNames
 */
const getAllUserNames = catchAsync(async (req, res) => {
    // يمكن إضافة فلاتر اختيارية
    const { isActive } = req.query;

    let query = {};

    // إضافة فلاتر إذا تم تحديدها
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
        .select('_id firstName lastName email status')
        .sort({ firstName: 1, lastName: 1 }); // ترتيب أبجدي

    // تنسيق البيانات لتكون أكثر وضوحاً
    const userNames = users.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: user.status
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء المستخدمين بنجاح',
        data: {
            users: userNames,
            count: userNames.length
        }
    });
});

/**
 * تحديث بيانات المستخدم (تابع محسن)
 * UpdateUser
 */
const updateUserData = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const updateData = { ...req.body };

    // إزالة الحقول التي لا يجب تحديثها مباشرة
    delete updateData.passwordResetToken;
    delete updateData.emailVerificationToken;
    delete updateData.isActive; // الحالة تحدث من endpoint منفصل

    // التحقق من وجود المستخدم أولاً
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    // التحقق من عدم تكرار البريد الإلكتروني
    if (updateData.email) {
        const emailExists = await User.findOne({
            email: updateData.email.toLowerCase(),
            _id: { $ne: userId }
        });

        if (emailExists) {
            throw new AppError('البريد الإلكتروني مستخدم من قبل مستخدم آخر', 400);
        }

        updateData.email = updateData.email.toLowerCase();
    }

    // التحقق من عدم تكرار رقم الهاتف
    if (updateData.phoneNumber) {
        const phoneExists = await User.findOne({
            phoneNumber: updateData.phoneNumber,
            _id: { $ne: userId }
        });

        if (phoneExists) {
            throw new AppError('رقم الهاتف مستخدم من قبل مستخدم آخر', 400);
        }
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).select('-passwordResetToken -emailVerificationToken');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات المستخدم بنجاح',
        data: { user }
    });
});

/**
 * تغيير حالة المستخدم (حظر/إلغاء حظر)
 * ChangeStatus
 */
const changeUserStatus = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    // التحقق من صحة الحالة المرسلة
    const validStatuses = ['Active', 'Inactive', 'Suspended'];
    if (!validStatuses.includes(status)) {
        throw new AppError('حالة المستخدم غير صحيحة. يجب أن تكون Active أو Inactive أو Suspended', 400);
    }

    // تحديث حالة المستخدم
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            status,
            ...(reason && { statusChangeReason: reason }),
            statusChangedAt: new Date(),
            statusChangedBy: req.user?.id
        },
        { new: true, runValidators: true }
    ).select('-passwordResetToken -emailVerificationToken');

    let statusMessage;
    let actionType;

    switch(status) {
        case 'Active':
            statusMessage = 'تم تفعيل العميل بنجاح';
            actionType = 'تفعيل';
            break;
        case 'Inactive':
            statusMessage = 'تم إلغاء تفعيل العميل بنجاح';
            actionType = 'إلغاء تفعيل';
            break;
        case 'Suspended':
            statusMessage = 'تم تعليق العميل بنجاح';
            actionType = 'تعليق';
            break;
        default:
            statusMessage = 'تم تحديث حالة العميل بنجاح';
            actionType = 'تحديث';
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: statusMessage,
        data: {
            user: updatedUser,
            action: actionType,
            reason: reason || null,
            timestamp: new Date()
        }
    });
});

module.exports = {
    getAllUsers,
    getUser,
    getUserById,
    getAllUserNames,
    addUser,
    register,
    login,
    refreshToken,
    updateUser,
    updateUserData,
    updatePassword,
    changeUserStatus,
    deleteUser,
    getProfile,
    updateProfile
};
