const Governorate = require("../models/governorate.model.js");
const Country = require("../models/country.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    جلب جميع المحافظات مع الباجينيشن والبحث
 * @route   GET /api/admin/governorates
 * @access  Manager and above
 */
const getAllGovernorates = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    
    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en'];
    
    // بناء استعلام الفلترة
    let query = {};
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        query.country = req.query.countryId;
    }
    
    // فلترة حسب الحالة
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }
    
    // إضافة populate للبلد
    options.populate = {
        path: 'country',
        select: 'name code'
    };
    
    const result = await paginate(Governorate, query, options);
    
    // تنسيق البيانات حسب المطلوب
    const formattedCities = await Promise.all(result.data.map(async (governorate) => {
        // حساب عدد المناطق لكل محافظة
        const Region = require('../models/region.model');
        const numberOfRegions = await Region.countDocuments({ governorate: governorate._id });
        
        return {
            id: governorate._id,
            name: governorate.name?.ar || governorate.name?.en || 'غير محدد',
            country: governorate.country ? 
                (governorate.country.name?.ar || governorate.country.name?.en || 'غير محدد') : 'غير محدد',
            numberOfRegions: numberOfRegions
        };
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب المحافظات بنجاح',
        data: {
            count: result.pagination.totalCount,
            cities: formattedCities
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب جميع أسماء المحافظات مع المعرفات فقط
 * @route   GET /api/admin/governorates/names
 * @access  Manager and above
 */
const getAllGovernorateNames = catchAsync(async (req, res) => {
    let query = {};
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        query.country = req.query.countryId;
    }
    
    // فلترة حسب الحالة (افتراضياً النشطة فقط)
    query.isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : true;
    
    const governorates = await Governorate.find(query)
        .select('_id name')
        .sort({ 'name.ar': 1 });
    
    const formattedGovernorates = governorates.map(governorate => ({
        id: governorate._id,
        name: governorate.name?.ar || governorate.name?.en || 'غير محدد'
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء المحافظات بنجاح',
        data: {
            count: formattedGovernorates.length,
            governorates: formattedGovernorates
        }
    });
});

/**
 * @desc    جلب محافظة واحدة بالمعرف
 * @route   GET /api/admin/governorates/:id
 * @access  Manager and above
 */
const getGovernorateById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const governorate = await Governorate.findById(id)
        .populate('country', 'name code');
    
    if (!governorate) {
        throw new AppError('المحافظة غير موجودة', 404);
    }
    
    // حساب عدد المناطق
    const Region = require('../models/region.model');
    const numberOfRegions = await Region.countDocuments({ governorate: governorate._id });
    
    // تنسيق البيانات
    const formattedGovernorate = {
        id: governorate._id,
        name: {
            ar: governorate.name?.ar,
            en: governorate.name?.en
        },
        country: {
            id: governorate.country?._id,
            name: governorate.country?.name
        },
        isActive: governorate.isActive,
        numberOfRegions: numberOfRegions,
        createdAt: governorate.createdAt,
        updatedAt: governorate.updatedAt
    };
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات المحافظة بنجاح',
        data: { governorate: formattedGovernorate }
    });
});

/**
 * @desc    إضافة أو تحديث محافظة (Upsert)
 * @route   POST /api/admin/governorates/upsert
 * @access  Admin and above
 */
const upsertGovernorate = catchAsync(async (req, res) => {
    const { id, name, countryId } = req.body;
    
    // التحقق من وجود البلد
    const country = await Country.findById(countryId);
    if (!country) {
        throw new AppError('البلد المحدد غير موجود', 404);
    }
    
    let governorate;
    let isUpdate = false;
    
    if (id) {
        // تحديث محافظة موجودة
        governorate = await Governorate.findById(id);
        if (!governorate) {
            throw new AppError('المحافظة غير موجودة', 404);
        }
        
        // التحقق من عدم وجود محافظة أخرى بنفس الاسم في نفس البلد
        if (name.ar) {
            const existingNameAr = await Governorate.findOne({ 
                'name.ar': name.ar,
                country: countryId,
                _id: { $ne: id }
            });
            if (existingNameAr) {
                throw new AppError('يوجد محافظة أخرى بهذا الاسم العربي في نفس البلد', 400);
            }
        }
        
        // تحديث البيانات
        const updateData = {};
        if (name) {
            updateData.name = {};
            if (name.ar) updateData.name.ar = name.ar;
            if (name.en) updateData.name.en = name.en;
        }
        if (countryId) updateData.country = countryId;
        
        governorate = await Governorate.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('country', 'name code');
        
        isUpdate = true;
    } else {
        // إضافة محافظة جديدة
        // التحقق من عدم وجود محافظة بنفس الاسم في نفس البلد
        if (name.ar) {
            const existingNameAr = await Governorate.findOne({ 
                'name.ar': name.ar,
                country: countryId
            });
            if (existingNameAr) {
                throw new AppError('يوجد محافظة بهذا الاسم العربي في نفس البلد مسبقاً', 400);
            }
        }
        
        // إنشاء المحافظة الجديدة
        const newGovernorate = new Governorate({
            name: {
                ar: name.ar,
                en: name.en
            },
            country: countryId,
            isActive: true
        });
        
        governorate = await newGovernorate.save();
        governorate = await Governorate.findById(governorate._id)
            .populate('country', 'name code');
    }
    
    res.status(isUpdate ? 200 : 201).json({
        status: httpStatusText.SUCCESS,
        message: isUpdate ? 'تم تحديث المحافظة بنجاح' : 'تم إضافة المحافظة بنجاح',
        data: { governorate }
    });
});

/**
 * @desc    حذف محافظة
 * @route   DELETE /api/admin/governorates/:id
 * @access  Admin and above
 */
const deleteGovernorate = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const governorate = await Governorate.findById(id);
    if (!governorate) {
        throw new AppError('المحافظة غير موجودة', 404);
    }
    
    // التحقق من عدم وجود مناطق مرتبطة بهذه المحافظة
    const Region = require('../models/region.model');
    const regionsCount = await Region.countDocuments({ governorate: id });
    
    if (regionsCount > 0) {
        throw new AppError('لا يمكن حذف المحافظة لوجود مناطق مرتبطة بها', 400);
    }
    
    // التحقق من عدم وجود عملاء مرتبطين بهذه المحافظة
    const User = require('../models/user.model');
    const usersCount = await User.countDocuments({ cityId: id });
    
    if (usersCount > 0) {
        throw new AppError('لا يمكن حذف المحافظة لوجود عملاء مرتبطين بها', 400);
    }
    
    await Governorate.findByIdAndDelete(id);
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف المحافظة بنجاح'
    });
});

module.exports = {
    getAllGovernorates,
    getAllGovernorateNames,
    getGovernorateById,
    upsertGovernorate,
    deleteGovernorate
};
