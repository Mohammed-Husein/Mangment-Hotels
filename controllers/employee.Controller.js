const Employee = require("../models/employee.model.js");
const Country = require("../models/country.model.js");
const Governorate = require("../models/governorate.model.js");
const Region = require("../models/region.model.js");
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
const saveRefreshToken = async (employeeId, refreshToken) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 أيام

    await Employee.findByIdAndUpdate(employeeId, {
        $push: {
            refreshTokens: {
                token: refreshToken,
                expiresAt
            }
        }
    });
};

// دالة تنظيف رموز التحديث المنتهية الصلاحية
const cleanExpiredRefreshTokens = async (employeeId) => {
    await Employee.findByIdAndUpdate(employeeId, {
        $pull: {
            refreshTokens: {
                expiresAt: { $lt: new Date() }
            }
        }
    });
};

// دالة توليد رمز الوصول للوحة التحكم (مدة ساعة واحدة)
const generateAdminAccessToken = async (payload) => {
    try {
        const tokenPayload = {
            ...payload,
            'generate-date': new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3/$1/$2 $4:$5:$6'),
            'iss': 'Issuer',
            'aud': 'Audience'
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1h" } // ساعة واحدة للوحة التحكم
        );
        return token;
    } catch (error) {
        console.error("Error generating admin token:", error);
        throw new Error("Failed to generate admin token");
    }
};

/**
 * @desc    جلب جميع الموظفين مع الباجينيشن والبحث والفلترة
 * @route   GET /api/admin/employees
 * @access  Admin, SuperAdmin
 */
const getAllEmployees = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    
    // إضافة حقول البحث المخصصة للموظفين
    options.searchFields = ['fullName', 'email', 'phoneNumber'];
    
    // بناء استعلام الفلترة
    let query = {};
    
    // فلترة حسب الدور
    if (req.query.role) {
        query.role = req.query.role;
    }
    
    // فلترة حسب الحالة
    if (req.query.status) {
        query.status = req.query.status;
    }
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        query.countryId = req.query.countryId;
    }
    
    // فلترة حسب تاريخ التوظيف
    if (req.query.hireDateFrom || req.query.hireDateTo) {
        query.hireDate = {};
        if (req.query.hireDateFrom) {
            query.hireDate.$gte = new Date(req.query.hireDateFrom);
        }
        if (req.query.hireDateTo) {
            query.hireDate.$lte = new Date(req.query.hireDateTo);
        }
    }
    
    // إضافة populate للبلد
    options.populate = {
        path: 'countryId',
        select: 'name code'
    };
    
    const result = await paginate(Employee, query, options);
    
    // تنسيق البيانات حسب المطلوب
    const formattedEmployees = result.data.map(employee => ({
        id: employee._id,
        number: employee.number,
        fullName: employee.fullName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        countryName: employee.countryId ? 
            (employee.countryId.name?.ar || employee.countryId.name?.en || 'غير محدد') : 'غير محدد',
        imageUrl: employee.imageUrl,
        roleName: employee.role,
        lastSeen: employee.lastSeen,
        status: employee.status
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الموظفين بنجاح',
        data: {
            count: result.pagination.totalCount,
            employees: formattedEmployees
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب أسماء ومعرفات جميع الموظفين
 * @route   GET /api/admin/employees/names
 * @access  Admin, SuperAdmin
 */
const getAllNames = catchAsync(async (req, res) => {
    let query = {};
    
    // فلترة حسب الدور
    if (req.query.role) {
        query.role = req.query.role;
    }
    
    // فلترة حسب الحالة (افتراضياً النشطين فقط)
    query.status = req.query.status || 'Active';
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        query.countryId = req.query.countryId;
    }
    
    const employees = await Employee.find(query)
        .select('_id fullName role')
        .sort({ fullName: 1 });
    
    const formattedEmployees = employees.map(employee => ({
        id: employee._id,
        name: employee.fullName,
        role: employee.role
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء الموظفين بنجاح',
        data: {
            count: formattedEmployees.length,
            employees: formattedEmployees
        }
    });
});

/**
 * @desc    جلب موظف واحد بالمعرف
 * @route   GET /api/admin/employees/:id
 * @access  Admin, SuperAdmin
 */
const getEmployeeById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const employee = await Employee.findById(id)
        .populate('countryId', 'name code')
        .populate('createdBy', 'fullName')
        .populate('statusChangedBy', 'fullName');

    if (!employee) {
        throw new AppError('الموظف غير موجود', 404);
    }

    // الحصول على أول محافظة ومنطقة من البلد المحدد
    let cityId = null;
    let regionId = null;
    let governorateName = null;
    let regionName = null;

    if (employee.countryId) {
        // البحث عن أول محافظة في هذا البلد
        const firstGovernorate = await Governorate.findOne({
            country: employee.countryId._id,
            isActive: true
        }).select('name');

        if (firstGovernorate) {
            cityId = firstGovernorate._id;
            governorateName = firstGovernorate.name?.ar || firstGovernorate.name?.en;

            // البحث عن أول منطقة في هذه المحافظة
            const firstRegion = await Region.findOne({
                city: firstGovernorate._id,
                isActive: true
            }).select('name');

            if (firstRegion) {
                regionId = firstRegion._id;
                regionName = firstRegion.name?.ar || firstRegion.name?.en;
            }
        }
    }

    // تنسيق البيانات
    const formattedEmployee = {
        id: employee._id,
        number: employee.number,
        fullName: employee.fullName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        imageUrl: employee.imageUrl,
        role: employee.role,
        countryId: employee.countryId?._id,
        countryName: employee.countryId ?
            (employee.countryId.name?.ar || employee.countryId.name?.en) : null,
        cityId: cityId, // إضافة معرف المحافظة
        governorateName: governorateName, // إضافة اسم المحافظة
        regionId: regionId, // إضافة معرف المنطقة
        regionName: regionName, // إضافة اسم المنطقة
        status: employee.status,
        lastSeen: employee.lastSeen,
        hireDate: employee.hireDate,
        notes: employee.notes,
        permissions: employee.permissions,
        createdBy: employee.createdBy?.fullName,
        statusChangeReason: employee.statusChangeReason,
        statusChangedAt: employee.statusChangedAt,
        statusChangedBy: employee.statusChangedBy?.fullName,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات الموظف بنجاح',
        data: { employee: formattedEmployee }
    });
});

/**
 * @desc    إنشاء موظف جديد
 * @route   POST /api/admin/employees
 * @access  Admin, SuperAdmin
 */
const createEmployee = catchAsync(async (req, res) => {
    const {
        fullName,
        email,
        phoneNumber,
        password,
        role,
        countryId,
        status,
        permissions,
        notes,
        deviceToken
    } = req.body;
    
    // التحقق من عدم وجود موظف بنفس البريد الإلكتروني
    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployee) {
        throw new AppError('يوجد موظف مسجل بهذا البريد الإلكتروني مسبقاً', 400);
    }
    
    // التحقق من عدم وجود موظف بنفس رقم الهاتف
    const existingPhone = await Employee.findOne({ phoneNumber });
    if (existingPhone) {
        throw new AppError('يوجد موظف مسجل بهذا رقم الهاتف مسبقاً', 400);
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await hashPassword(password);
    
    // إنشاء الموظف الجديد
    const newEmployee = new Employee({
        fullName,
        email: email.toLowerCase(),
        phoneNumber,
        password: hashedPassword,
        role,
        countryId,
        status: status || 'Active',
        imageUrl: req.file?.filename || 'uploads/Avatar.png',
        permissions: permissions || [],
        notes,
        deviceToken,
        createdBy: req.decoded?.id // معرف الموظف الذي أنشأ الحساب
    });
    
    await newEmployee.save();
    
    // جلب البيانات مع populate
    const populatedEmployee = await Employee.findById(newEmployee._id)
        .populate('countryId', 'name code');
    
    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة الموظف بنجاح',
        data: { employee: populatedEmployee }
    });
});

/**
 * @desc    تحديث بيانات موظف
 * @route   PUT /api/admin/employees/:id
 * @access  Admin, SuperAdmin
 */
const updateEmployee = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        fullName,
        email,
        phoneNumber,
        role,
        countryId,
        status,
        permissions,
        notes,
        deviceToken,
        statusChangeReason
    } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('الموظف غير موجود', 404);
    }

    // التحقق من عدم وجود موظف آخر بنفس البريد الإلكتروني
    if (email && email.toLowerCase() !== employee.email) {
        const existingEmployee = await Employee.findOne({
            email: email.toLowerCase(),
            _id: { $ne: id }
        });
        if (existingEmployee) {
            throw new AppError('يوجد موظف مسجل بهذا البريد الإلكتروني مسبقاً', 400);
        }
    }

    // التحقق من عدم وجود موظف آخر بنفس رقم الهاتف
    if (phoneNumber && phoneNumber !== employee.phoneNumber) {
        const existingPhone = await Employee.findOne({
            phoneNumber,
            _id: { $ne: id }
        });
        if (existingPhone) {
            throw new AppError('يوجد موظف مسجل بهذا رقم الهاتف مسبقاً', 400);
        }
    }

    // تحديث البيانات
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email.toLowerCase();
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (role) updateData.role = role;
    if (countryId) updateData.countryId = countryId;
    if (permissions) updateData.permissions = permissions;
    if (notes !== undefined) updateData.notes = notes;
    if (deviceToken) updateData.deviceToken = deviceToken;
    if (req.file) updateData.imageUrl = req.file.filename;

    // تحديث الحالة مع تسجيل السبب
    if (status && status !== employee.status) {
        updateData.status = status;
        updateData.statusChangedAt = new Date();
        updateData.statusChangedBy = req.decoded?.id;
        if (statusChangeReason) {
            updateData.statusChangeReason = statusChangeReason;
        }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('countryId', 'name code');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات الموظف بنجاح',
        data: { employee: updatedEmployee }
    });
});

/**
 * @desc    حذف موظف
 * @route   DELETE /api/admin/employees/:id
 * @access  SuperAdmin only
 */
const deleteEmployee = catchAsync(async (req, res) => {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('الموظف غير موجود', 404);
    }

    // منع حذف الموظف إذا كان SuperAdmin (للحماية)
    if (employee.role === Employee.roles.SUPER_ADMIN) {
        throw new AppError('لا يمكن حذف المدير العام', 403);
    }

    await Employee.findByIdAndDelete(id);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف الموظف بنجاح'
    });
});

/**
 * @desc    تسجيل دخول الموظف
 * @route   POST /api/admin/employees/login
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
    const { email, password, deviceToken } = req.body;

    // البحث عن الموظف
    const employee = await Employee.findOne({
        email: email.toLowerCase()
    }).populate('countryId', 'name');

    if (!employee) {
        throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // التحقق من حالة الموظف
    if (employee.status !== 'Active') {
        throw new AppError('حسابك غير نشط، يرجى التواصل مع الإدارة', 403);
    }

    // مقارنة كلمة المرور
    const isPasswordCorrect = await comparePassword(password, employee.password);

    if (!isPasswordCorrect) {
        throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // تنظيف رموز التحديث المنتهية الصلاحية
    await cleanExpiredRefreshTokens(employee._id);

    // توليد رموز الوصول (ساعة واحدة للوحة التحكم)
    const accessToken = await generateAdminAccessToken({
        email: employee.email,
        id: employee._id,
        role: employee.role,
        'user-type': 'Employee'
    });

    const refreshToken = generateRefreshToken();

    // حفظ رمز التحديث
    await saveRefreshToken(employee._id, refreshToken);

    // تحديث آخر ظهور ورمز الجهاز
    const updateData = { lastSeen: new Date() };
    if (deviceToken) {
        updateData.deviceToken = deviceToken;
    }

    await Employee.findByIdAndUpdate(employee._id, updateData);

    // تنسيق الاستجابة
    const loginResponse = {
        id: employee._id,
        name: employee.fullName,
        imageUrl: employee.imageUrl,
        permissions: employee.permissions,
        deviceToken: deviceToken || employee.deviceToken,
        accessToken,
        refreshToken
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تسجيل الدخول بنجاح',
        data: loginResponse
    });
});

/**
 * @desc    تحديث رمز الوصول باستخدام رمز التحديث
 * @route   POST /api/admin/employees/refresh-token
 * @access  Public
 */
const refreshToken = catchAsync(async (req, res) => {
    const { employeeId, refreshToken: token } = req.body;

    if (!employeeId || !token) {
        throw new AppError('معرف الموظف ورمز التحديث مطلوبان', 400);
    }

    // البحث عن الموظف والتحقق من رمز التحديث
    const employee = await Employee.findOne({
        _id: employeeId,
        'refreshTokens.token': token,
        'refreshTokens.expiresAt': { $gt: new Date()}
    });

    if (!employee) {
        throw new AppError('رمز التحديث غير صحيح أو منتهي الصلاحية', 401);
    }

    // التحقق من حالة الموظف
    if (employee.status !== 'Active') {
        throw new AppError('حسابك غير نشط، يرجى التواصل مع الإدارة', 403);
    }

    // توليد رمز وصول جديد (ساعة واحدة للوحة التحكم)
    const newAccessToken = await generateAdminAccessToken({
        email: employee.email,
        id: employee._id,
        role: employee.role,
        'user-type': 'Employee'
    });

    // توليد رمز تحديث جديد (اختياري)
    const newRefreshToken = generateRefreshToken();

    // إزالة الرمز القديم وإضافة الجديد
    await Employee.findByIdAndUpdate(employee._id, {
        $pull: { refreshTokens: { token } },
        $push: {
            refreshTokens: {
                token: newRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 أيام
            }
        }
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث الرمز بنجاح',
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }
    });
});

/**
 * @desc    تسجيل خروج الموظف
 * @route   POST /api/admin/employees/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
    const { refreshToken: token } = req.body;
    const employeeId = req.decoded.id;

    if (token) {
        // إزالة رمز التحديث المحدد
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { refreshTokens: { token } }
        });
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تسجيل الخروج بنجاح'
    });
});

/**
 * @desc    تسجيل خروج من جميع الأجهزة
 * @route   POST /api/admin/employees/logout-all
 * @access  Private
 */
const logoutAll = catchAsync(async (req, res) => {
    const employeeId = req.decoded.id;

    // إزالة جميع رموز التحديث
    await Employee.findByIdAndUpdate(employeeId, {
        $set: { refreshTokens: [] }
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح'
    });
});

/**
 * @desc    تحديث كلمة مرور الموظف
 * @route   PUT /api/admin/employees/:id/password
 * @access  Admin, SuperAdmin
 */
const updatePassword = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('الموظف غير موجود', 404);
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await hashPassword(newPassword);

    // تحديث كلمة المرور وإزالة جميع رموز التحديث (لإجبار إعادة تسجيل الدخول)
    await Employee.findByIdAndUpdate(id, {
        password: hashedPassword,
        refreshTokens: []
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث كلمة المرور بنجاح'
    });
});

/**
 * @desc    تغيير حالة الموظف
 * @route   PUT /api/admin/employees/:id/status
 * @access  Admin, SuperAdmin
 */
const changeEmployeeStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    // التحقق من وجود الموظف
    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('الموظف غير موجود', 404);
    }

    // التحقق من صحة الحالة المرسلة
    const validStatuses = ['Active', 'Inactive', 'Suspended', 'OnLeave'];
    if (!validStatuses.includes(status)) {
        throw new AppError('حالة الموظف غير صحيحة. يجب أن تكون Active أو Inactive أو Suspended أو OnLeave', 400);
    }

    // منع الموظف من تعطيل نفسه
    if (req.user?.id === id && status === 'Inactive') {
        throw new AppError('لا يمكنك تعطيل حسابك الخاص', 400);
    }

    // إعداد البيانات للتحديث
    const updateData = {
        status,
        statusChangeReason: reason || `تم تغيير الحالة إلى ${status}`,
        statusChangedAt: new Date(),
        statusChangedBy: req.user?.id
    };

    // إزالة رموز التحديث إذا تم تعطيل الموظف
    if (status === 'Inactive' || status === 'Suspended') {
        updateData.refreshTokens = [];
    }

    // تحديث حالة الموظف
    const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('countryId', 'name');

    let statusMessage;
    let actionType;

    switch(status) {
        case 'Active':
            statusMessage = 'تم تفعيل الموظف بنجاح';
            actionType = 'تفعيل';
            break;
        case 'Inactive':
            statusMessage = 'تم تعطيل الموظف بنجاح';
            actionType = 'تعطيل';
            break;
        case 'Suspended':
            statusMessage = 'تم تعليق الموظف بنجاح';
            actionType = 'تعليق';
            break;
        case 'OnLeave':
            statusMessage = 'تم وضع الموظف في إجازة بنجاح';
            actionType = 'إجازة';
            break;
        default:
            statusMessage = 'تم تحديث حالة الموظف بنجاح';
            actionType = 'تحديث';
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: statusMessage,
        data: {
            employee: updatedEmployee,
            action: actionType,
            reason: reason || `تم تغيير الحالة إلى ${status}`,
            timestamp: new Date()
        }
    });
});

module.exports = {
    getAllEmployees,
    getAllNames,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    login,
    refreshToken,
    logout,
    logoutAll,
    updatePassword,
    changeEmployeeStatus
};
