const Region = require("../models/region.model.js");
const Governorate = require("../models/governorate.model.js");
const Country = require("../models/country.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    جلب جميع المناطق مع الباجينيشن والبحث
 * @route   GET /api/admin/regions
 * @access  Manager and above
 */
const getAllRegions = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    
    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en'];
    
    // بناء استعلام الفلترة
    let query = {};
    
    // فلترة حسب المحافظة
    if (req.query.governorateId) {
        query.governorate = req.query.governorateId;
    }
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        // البحث عن المحافظات في البلد المحدد أولاً
        const governorates = await Governorate.find({ country: req.query.countryId }).select('_id');
        const governorateIds = governorates.map(gov => gov._id);
        query.governorate = { $in: governorateIds };
    }
    
    // فلترة حسب الحالة
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }
    
    // إضافة populate للمحافظة والبلد
    options.populate = [
        {
            path: 'governorate',
            select: 'name country',
            populate: {
                path: 'country',
                select: 'name code'
            }
        }
    ];
    
    const result = await paginate(Region, query, options);
    
    // تنسيق البيانات حسب المطلوب
    const formattedRegions = result.data.map(region => ({
        id: region._id,
        name: region.name?.ar || region.name?.en || 'غير محدد',
        cityName: region.governorate ? 
            (region.governorate.name?.ar || region.governorate.name?.en || 'غير محدد') : 'غير محدد',
        countryName: region.governorate?.country ? 
            (region.governorate.country.name?.ar || region.governorate.country.name?.en || 'غير محدد') : 'غير محدد'
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب المناطق بنجاح',
        data: {
            count: result.pagination.totalCount,
            regions: formattedRegions
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب جميع أسماء المناطق مع المعرفات والمحافظة والبلد
 * @route   GET /api/admin/regions/names
 * @access  Manager and above
 */
const getAllRegionNames = catchAsync(async (req, res) => {
    let query = {};
    
    // فلترة حسب المحافظة
    if (req.query.governorateId) {
        query.governorate = req.query.governorateId;
    }
    
    // فلترة حسب البلد
    if (req.query.countryId) {
        const governorates = await Governorate.find({ country: req.query.countryId }).select('_id');
        const governorateIds = governorates.map(gov => gov._id);
        query.governorate = { $in: governorateIds };
    }
    
    // فلترة حسب الحالة (افتراضياً النشطة فقط)
    query.isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : true;
    
    const regions = await Region.find(query)
        .select('_id name governorate')
        .populate({
            path: 'governorate',
            select: '_id name country',
            populate: {
                path: 'country',
                select: '_id name'
            }
        })
        .sort({ 'name.ar': 1 });
    
    const formattedRegions = regions.map(region => ({
        id: region._id,
        name: region.name?.ar || region.name?.en || 'غير محدد',
        governorateId: region.governorate?._id,
        governorateName: region.governorate ? 
            (region.governorate.name?.ar || region.governorate.name?.en) : null,
        countryId: region.governorate?.country?._id,
        countryName: region.governorate?.country ? 
            (region.governorate.country.name?.ar || region.governorate.country.name?.en) : null
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء المناطق بنجاح',
        data: {
            count: formattedRegions.length,
            regions: formattedRegions
        }
    });
});

/**
 * @desc    جلب أسماء المدن (المحافظات) حسب البلد
 * @route   GET /api/admin/regions/cities
 * @access  Manager and above
 */
const getCitiesByCountry = catchAsync(async (req, res) => {
    const { countryId } = req.query;
    
    if (!countryId) {
        throw new AppError('معرف البلد مطلوب', 400);
    }
    
    // التحقق من وجود البلد
    const country = await Country.findById(countryId);
    if (!country) {
        throw new AppError('البلد غير موجود', 404);
    }
    
    let query = { country: countryId };
    
    // فلترة حسب الحالة (افتراضياً النشطة فقط)
    query.isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : true;
    
    const cities = await Governorate.find(query)
        .select('_id name')
        .sort({ 'name.ar': 1 });
    
    const formattedCities = cities.map(city => ({
        id: city._id,
        name: city.name?.ar || city.name?.en || 'غير محدد'
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء المدن بنجاح',
        data: {
            count: formattedCities.length,
            cities: formattedCities,
            country: {
                id: country._id,
                name: country.name?.ar || country.name?.en
            }
        }
    });
});

/**
 * @desc    جلب منطقة واحدة بالمعرف
 * @route   GET /api/admin/regions/:id
 * @access  Manager and above
 */
const getRegionById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const region = await Region.findById(id)
        .populate({
            path: 'governorate',
            select: 'name country',
            populate: {
                path: 'country',
                select: 'name code'
            }
        });
    
    if (!region) {
        throw new AppError('المنطقة غير موجودة', 404);
    }
    
    // تنسيق البيانات
    const formattedRegion = {
        id: region._id,
        name: {
            ar: region.name?.ar,
            en: region.name?.en
        },
        // governorate: {
        //     id: region.governorate?._id,
        //     name: region.governorate?.name
        // },
        // country: {
        //     id: region.governorate?.country?._id,
        //     name: region.governorate?.country?.name
        // },
        governorateId:region.governorate?._id,
        countryId:region.governorate?.country?._id,
        isActive: region.isActive,
        createdAt: region.createdAt,
        updatedAt: region.updatedAt
    };
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات المنطقة بنجاح',
        data: { region: formattedRegion }
    });
});

/**
 * @desc    إضافة منطقة جديدة
 * @route   POST /api/admin/regions
 * @access  Admin and above
 */
const addRegion = catchAsync(async (req, res) => {
    const { name, governorateId, countryId } = req.body;
    
    // التحقق من وجود البلد
    const country = await Country.findById(countryId);
    if (!country) {
        throw new AppError('البلد المحدد غير موجود', 404);
    }
    
    // التحقق من وجود المحافظة وأنها تنتمي للبلد المحدد
    const governorate = await Governorate.findOne({ 
        _id: governorateId, 
        country: countryId 
    });
    if (!governorate) {
        throw new AppError('المحافظة المحددة غير موجودة أو لا تنتمي للبلد المحدد', 404);
    }
    
    // التحقق من عدم وجود منطقة بنفس الاسم في نفس المحافظة
    if (name.ar) {
        const existingNameAr = await Region.findOne({ 
            'name.ar': name.ar,
            governorate: governorateId
        });
        if (existingNameAr) {
            throw new AppError('يوجد منطقة بهذا الاسم العربي في نفس المحافظة مسبقاً', 400);
        }
    }
    
    // إنشاء المنطقة الجديدة
    const newRegion = new Region({
        name: {
            ar: name.ar,
            en: name.en
        },
        governorate: governorateId,
        isActive: true
    });
    
    await newRegion.save();
    
    // جلب البيانات مع populate
    const populatedRegion = await Region.findById(newRegion._id)
        .populate({
            path: 'governorate',
            select: 'name country',
            populate: {
                path: 'country',
                select: 'name code'
            }
        });
    
    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة المنطقة بنجاح',
        data: { region: populatedRegion }
    });
});

/**
 * @desc    تحديث بيانات منطقة
 * @route   PUT /api/admin/regions/:id
 * @access  Admin and above
 */
const updateRegion = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, governorateId, countryId } = req.body;

    const region = await Region.findById(id);
    if (!region) {
        throw new AppError('المنطقة غير موجودة', 404);
    }

    // إذا تم تحديد بلد ومحافظة جديدة
    if (governorateId && countryId) {
        // التحقق من وجود البلد
        const country = await Country.findById(countryId);
        if (!country) {
            throw new AppError('البلد المحدد غير موجود', 404);
        }

        // التحقق من وجود المحافظة وأنها تنتمي للبلد المحدد
        const governorate = await Governorate.findOne({
            _id: governorateId,
            country: countryId
        });
        if (!governorate) {
            throw new AppError('المحافظة المحددة غير موجودة أو لا تنتمي للبلد المحدد', 404);
        }
    }

    // التحقق من عدم وجود منطقة أخرى بنفس الاسم في نفس المحافظة
    if (name && name.ar) {
        const targetGovernorateId = governorateId || region.governorate;
        const existingNameAr = await Region.findOne({
            'name.ar': name.ar,
            governorate: targetGovernorateId,
            _id: { $ne: id }
        });
        if (existingNameAr) {
            throw new AppError('يوجد منطقة أخرى بهذا الاسم العربي في نفس المحافظة', 400);
        }
    }

    // تحديث البيانات
    const updateData = {};
    if (name) {
        updateData.name = {};
        if (name.ar) updateData.name.ar = name.ar;
        if (name.en) updateData.name.en = name.en;
    }
    if (governorateId) updateData.governorate = governorateId;

    const updatedRegion = await Region.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate({
        path: 'governorate',
        select: 'name country',
        populate: {
            path: 'country',
            select: 'name code'
        }
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات المنطقة بنجاح',
        data: { region: updatedRegion }
    });
});

/**
 * @desc    حذف منطقة
 * @route   DELETE /api/admin/regions/:id
 * @access  Admin and above
 */
const deleteRegion = catchAsync(async (req, res) => {
    const { id } = req.params;

    const region = await Region.findById(id);
    if (!region) {
        throw new AppError('المنطقة غير موجودة', 404);
    }

    // التحقق من عدم وجود عملاء مرتبطين بهذه المنطقة
    const User = require('../models/user.model');
    const usersCount = await User.countDocuments({ regionId: id });

    if (usersCount > 0) {
        throw new AppError('لا يمكن حذف المنطقة لوجود عملاء مرتبطين بها', 400);
    }

    await Region.findByIdAndDelete(id);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف المنطقة بنجاح'
    });
});

module.exports = {
    getAllRegions,
    getAllRegionNames,
    getCitiesByCountry,
    getRegionById,
    addRegion,
    updateRegion,
    deleteRegion
};
