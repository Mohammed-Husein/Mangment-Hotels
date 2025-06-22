const PaymentMethod = require("../models/paymentMethod.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    إضافة طريقة دفع جديدة
 * @route   POST /api/admin/payment-methods
 * @access  Admin and above
 */
const addPaymentMethod = catchAsync(async (req, res) => {
    const {
        nameAr,
        nameEn,
        code,
        descriptionAr,
        descriptionEn,
        displayOrder,
        isActive
    } = req.body;
    
    // التحقق من عدم وجود طريقة دفع بنفس الكود
    const existingPaymentMethod = await PaymentMethod.findOne({ code: code.toUpperCase() });
    if (existingPaymentMethod) {
        throw new AppError('يوجد طريقة دفع مسجلة بهذا الكود مسبقاً', 400);
    }
    
    // إنشاء بيانات طريقة الدفع الجديدة
    const newPaymentMethodData = {
        name: {
            ar: nameAr,
            en: nameEn
        },
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0
    };
    
    // إضافة الوصف إذا تم تحديده
    if (descriptionAr || descriptionEn) {
        newPaymentMethodData.description = {
            ar: descriptionAr || '',
            en: descriptionEn || ''
        };
    }
    
    // إضافة الأيقونة إذا تم رفعها
    if (req.file) {
        newPaymentMethodData.icon = `uploads/payment-methods/${req.file.filename}`;
    }
    
    // إضافة المعلومات الإضافية
    if (req.body.metadata) {
        const metadata = new Map();
        Object.keys(req.body.metadata).forEach(key => {
            if (req.body.metadata[key]) {
                metadata.set(key, req.body.metadata[key]);
            }
        });
        newPaymentMethodData.metadata = metadata;
    }
    
    // إنشاء طريقة الدفع الجديدة
    const newPaymentMethod = new PaymentMethod(newPaymentMethodData);
    await newPaymentMethod.save();
    
    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة طريقة الدفع بنجاح',
        data: { paymentMethod: newPaymentMethod }
    });
});

/**
 * @desc    جلب جميع طرق الدفع مع الباجينيشن والبحث (Admin)
 * @route   GET /api/admin/payment-methods
 * @access  Manager and above
 */
const getAllPaymentMethods = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    
    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en', 'code'];
    
    // بناء استعلام الفلترة
    let query = {};
    
    // فلترة حسب الحالة
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }
    
    // ترتيب افتراضي حسب ترتيب العرض ثم الاسم العربي
    if (!options.sortBy) {
        options.sortBy = 'displayOrder';
        options.sortOrder = 'asc';
    }
    
    const result = await paginate(PaymentMethod, query, options);
    
    // تنسيق البيانات حسب المطلوب
    const formattedPaymentMethods = result.data.map(paymentMethod => ({
        id: paymentMethod._id,
        name: {
            ar: paymentMethod.name?.ar,
            en: paymentMethod.name?.en
        },
        code: paymentMethod.code,
        description: {
            ar: paymentMethod.description?.ar || '',
            en: paymentMethod.description?.en || ''
        },
        icon: paymentMethod.icon,
        isActive: paymentMethod.isActive,
        displayOrder: paymentMethod.displayOrder,
        metadata: paymentMethod.metadata ? Object.fromEntries(paymentMethod.metadata) : {},
        createdAt: paymentMethod.createdAt,
        updatedAt: paymentMethod.updatedAt
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب طرق الدفع بنجاح',
        data: {
            count: result.pagination.totalCount,
            paymentMethods: formattedPaymentMethods
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب طريقة دفع واحدة بالمعرف
 * @route   GET /api/admin/payment-methods/:id
 * @access  Manager and above
 */
const getPaymentMethodById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const paymentMethod = await PaymentMethod.findById(id);
    
    if (!paymentMethod) {
        throw new AppError('طريقة الدفع غير موجودة', 404);
    }
    
    // تنسيق البيانات
    const formattedPaymentMethod = {
        id: paymentMethod._id,
        name: {
            ar: paymentMethod.name?.ar,
            en: paymentMethod.name?.en
        },
        code: paymentMethod.code,
        description: {
            ar: paymentMethod.description?.ar || '',
            en: paymentMethod.description?.en || ''
        },
        icon: paymentMethod.icon,
        isActive: paymentMethod.isActive,
        displayOrder: paymentMethod.displayOrder,
        metadata: paymentMethod.metadata ? Object.fromEntries(paymentMethod.metadata) : {},
        createdAt: paymentMethod.createdAt,
        updatedAt: paymentMethod.updatedAt
    };
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات طريقة الدفع بنجاح',
        data: { paymentMethod: formattedPaymentMethod }
    });
});

/**
 * @desc    تحديث طريقة دفع
 * @route   PUT /api/admin/payment-methods/:id
 * @access  Admin and above
 */
const updatePaymentMethod = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        nameAr,
        nameEn,
        code,
        descriptionAr,
        descriptionEn,
        displayOrder,
        isActive
    } = req.body;
    
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
        throw new AppError('طريقة الدفع غير موجودة', 404);
    }
    
    // التحقق من عدم وجود طريقة دفع أخرى بنفس الكود
    if (code && code.toUpperCase() !== paymentMethod.code) {
        const existingPaymentMethod = await PaymentMethod.findOne({ 
            code: code.toUpperCase(),
            _id: { $ne: id }
        });
        if (existingPaymentMethod) {
            throw new AppError('يوجد طريقة دفع أخرى مسجلة بهذا الكود', 400);
        }
    }
    
    // تحديث البيانات
    const updateData = {};
    
    if (nameAr || nameEn) {
        updateData.name = {};
        if (nameAr) updateData.name.ar = nameAr;
        if (nameEn) updateData.name.en = nameEn;
        // الحفاظ على القيم الموجودة إذا لم يتم تحديثها
        if (!nameAr && paymentMethod.name?.ar) updateData.name.ar = paymentMethod.name.ar;
        if (!nameEn && paymentMethod.name?.en) updateData.name.en = paymentMethod.name.en;
    }
    
    if (code) updateData.code = code.toUpperCase();
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // تحديث الوصف
    if (descriptionAr !== undefined || descriptionEn !== undefined) {
        updateData.description = {};
        updateData.description.ar = descriptionAr || paymentMethod.description?.ar || '';
        updateData.description.en = descriptionEn || paymentMethod.description?.en || '';
    }
    
    // تحديث الأيقونة إذا تم رفع أيقونة جديدة
    if (req.file) {
        updateData.icon = `uploads/payment-methods/${req.file.filename}`;
    }
    
    // تحديث المعلومات الإضافية
    if (req.body.metadata) {
        const metadata = new Map();
        Object.keys(req.body.metadata).forEach(key => {
            if (req.body.metadata[key]) {
                metadata.set(key, req.body.metadata[key]);
            }
        });
        updateData.metadata = metadata;
    }
    
    const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات طريقة الدفع بنجاح',
        data: { paymentMethod: updatedPaymentMethod }
    });
});

/**
 * @desc    جلب أسماء طرق الدفع فقط (Admin)
 * @route   GET /api/admin/payment-methods/names
 * @access  Manager and above
 */
const getAllPaymentMethodNames = catchAsync(async (req, res) => {
    const activeOnly = req.query.activeOnly !== 'false'; // افتراضي true
    
    const paymentMethods = await PaymentMethod.getPaymentMethodNames(activeOnly);
    
    // تنسيق البيانات
    const formattedNames = paymentMethods.map(paymentMethod => ({
        id: paymentMethod._id,
        name: {
            ar: paymentMethod.name?.ar,
            en: paymentMethod.name?.en
        },
        code: paymentMethod.code ,
        isActive :paymentMethod.isActive,
        // metadata:{
        //     fees:paymentMethod.metadata[0]?.fees,
        //     provider:paymentMethod.metadata[1]?.provider
        // }
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء طرق الدفع بنجاح',
        data: {
            count: formattedNames.length,
            paymentMethods: formattedNames
        }
    });
});

/**
 * @desc    جلب أسماء طرق الدفع للموبايل
 * @route   GET /api/mobile/payment-methods/names
 * @access  Public
 */
const getAllPaymentMethodNamesForMobile = catchAsync(async (req, res) => {
    // جلب طرق الدفع النشطة فقط
    const paymentMethods = await PaymentMethod.getPaymentMethodNames(true);
    
    // تنسيق البيانات للموبايل
const formattedNames = paymentMethods.map(paymentMethod => ({
    id: paymentMethod._id,
    name: {
        ar: paymentMethod.name?.ar,
        en: paymentMethod.name?.en
    },
    code: paymentMethod.code,
    icon: paymentMethod.icon || null, 
    metadata: paymentMethod.metadata ? Object.fromEntries(paymentMethod.metadata) : {},
 

}));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء طرق الدفع بنجاح',
        data: {
            count: formattedNames.length,
            paymentMethods: formattedNames
        }
    });
});
const deletePayment = catchAsync(async (req, res) => {
    const { id } = req.params;

    const payment = await PaymentMethod.findById(id);
    if (!payment) {
        throw new AppError('طريقة الدفع غير موجود', 404);
    }


    await PaymentMethod.findByIdAndDelete(id);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف طريقة الدفع بنجاح'
    });
});

module.exports = {
    addPaymentMethod,
    getAllPaymentMethods,
    getPaymentMethodById,
    updatePaymentMethod,
    getAllPaymentMethodNames,
    getAllPaymentMethodNamesForMobile,
    deletePayment
};
