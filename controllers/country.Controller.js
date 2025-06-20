const Country = require("../models/country.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    جلب جميع البلدان مع الباجينيشن والبحث
 * @route   GET /api/admin/countries
 * @access  Manager and above
 */
const getAllCountries = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    
    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en', 'code'];
    
    // بناء استعلام الفلترة
    let query = {};
    
    // فلترة حسب الحالة
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }
    
    // إضافة populate لعدد المحافظات
    options.populate = {
        path: 'governoratesCount',
        options: { count: true }
    };
    
    const result = await paginate(Country, query, options);
    
    // تنسيق البيانات حسب المطلوب
    const formattedCountries = await Promise.all(result.data.map(async (country) => {
        // حساب عدد المدن (المحافظات) لكل بلد
        const Governorate = require('../models/governorate.model');
        const numberOfCities = await Governorate.countDocuments({ country: country._id });
        
        return {
            id: country._id,
            name: country.name?.ar || country.name?.en || 'غير محدد',
            code: country.code,
            numberOfCities: numberOfCities
        };
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب البلدان بنجاح',
        data: {
            count: result.pagination.totalCount,
            countries: formattedCountries
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب جميع أسماء البلدان مع المعرفات فقط
 * @route   GET /api/admin/countries/names
 * @access  Manager and above
 */
const getAllCountryNames = catchAsync(async (req, res) => {
    let query = {};
    
    // فلترة حسب الحالة (افتراضياً النشطة فقط)
    query.isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : true;
    
    const countries = await Country.find(query)
        .select('_id name code')
        .sort({ 'name.ar': 1 });
    
    const formattedCountries = countries.map(country => ({
        id: country._id,
        name: country.name?.ar || country.name?.en || 'غير محدد'
    }));
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء البلدان بنجاح',
        data: {
            count: formattedCountries.length,
            countries: formattedCountries
        }
    });
});

/**
 * @desc    جلب بلد واحد بالمعرف
 * @route   GET /api/admin/countries/:id
 * @access  Manager and above
 */
const getCountryById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const country = await Country.findById(id);
    
    if (!country) {
        throw new AppError('البلد غير موجود', 404);
    }
    
    // حساب عدد المحافظات
    const Governorate = require('../models/governorate.model');
    const numberOfCities = await Governorate.countDocuments({ country: country._id });
    
    // تنسيق البيانات
    const formattedCountry = {
        id: country._id,
        name: {
            ar: country.name?.ar,
            en: country.name?.en
        },
        code: country.code,
        phoneCode: country.phoneCode,
        currency: country.currency,
        isActive: country.isActive,
        numberOfCities: numberOfCities,
        createdAt: country.createdAt,
        updatedAt: country.updatedAt
    };
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات البلد بنجاح',
        data: { country: formattedCountry }
    });
});

/**
 * @desc    إضافة بلد جديد
 * @route   POST /api/admin/countries
 * @access  Admin and above
 */
const addCountry = catchAsync(async (req, res) => {
    const { name, code } = req.body;
    
    // التحقق من عدم وجود بلد بنفس الكود
    const existingCountry = await Country.findOne({ code: code.toUpperCase() });
    if (existingCountry) {
        throw new AppError('يوجد بلد مسجل بهذا الكود مسبقاً', 400);
    }
    
    // التحقق من عدم وجود بلد بنفس الاسم العربي
    if (name.ar) {
        const existingNameAr = await Country.findOne({ 'name.ar': name.ar });
        if (existingNameAr) {
            throw new AppError('يوجد بلد مسجل بهذا الاسم العربي مسبقاً', 400);
        }
    }
    
    // التحقق من عدم وجود بلد بنفس الاسم الإنجليزي
    if (name.en) {
        const existingNameEn = await Country.findOne({ 'name.en': name.en });
        if (existingNameEn) {
            throw new AppError('يوجد بلد مسجل بهذا الاسم الإنجليزي مسبقاً', 400);
        }
    }
    
    // إنشاء البلد الجديد
    const newCountry = new Country({
        name: {
            ar: name.ar,
            en: name.en
        },
        code: code.toUpperCase(),
        isActive: true
    });
    
    await newCountry.save();
    
    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة البلد بنجاح',
        data: { country: newCountry }
    });
});

/**
 * @desc    تحديث بيانات بلد
 * @route   PUT /api/admin/countries/:id
 * @access  Admin and above
 */
const updateCountry = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, code, phoneCode, currency, isActive } = req.body;
    
    const country = await Country.findById(id);
    if (!country) {
        throw new AppError('البلد غير موجود', 404);
    }
    
    // التحقق من عدم وجود بلد آخر بنفس الكود
    if (code && code.toUpperCase() !== country.code) {
        const existingCountry = await Country.findOne({ 
            code: code.toUpperCase(),
            _id: { $ne: id }
        });
        if (existingCountry) {
            throw new AppError('يوجد بلد آخر مسجل بهذا الكود', 400);
        }
    }
    
    // تحديث البيانات
    const updateData = {};
    if (name) {
        updateData.name = {};
        if (name.ar) updateData.name.ar = name.ar;
        if (name.en) updateData.name.en = name.en;
    }
    if (code) updateData.code = code.toUpperCase();
    if (phoneCode) updateData.phoneCode = phoneCode;
    if (currency) updateData.currency = currency;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedCountry = await Country.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات البلد بنجاح',
        data: { country: updatedCountry }
    });
});

/**
 * @desc    حذف بلد
 * @route   DELETE /api/admin/countries/:id
 * @access  Admin and above
 */
const deleteCountry = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const country = await Country.findById(id);
    if (!country) {
        throw new AppError('البلد غير موجود', 404);
    }
    
    // التحقق من عدم وجود محافظات مرتبطة بهذا البلد
    const Governorate = require('../models/governorate.model');
    const governoratesCount = await Governorate.countDocuments({ country: id });
    
    if (governoratesCount > 0) {
        throw new AppError('لا يمكن حذف البلد لوجود محافظات مرتبطة به', 400);
    }
    
    // التحقق من عدم وجود موظفين مرتبطين بهذا البلد
    const Employee = require('../models/employee.model');
    const employeesCount = await Employee.countDocuments({ countryId: id });
    
    if (employeesCount > 0) {
        throw new AppError('لا يمكن حذف البلد لوجود موظفين مرتبطين به', 400);
    }
    
    // التحقق من عدم وجود عملاء مرتبطين بهذا البلد
    const User = require('../models/user.model');
    const usersCount = await User.countDocuments({ countryId: id });
    
    if (usersCount > 0) {
        throw new AppError('لا يمكن حذف البلد لوجود عملاء مرتبطين به', 400);
    }
    
    await Country.findByIdAndDelete(id);
    
    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف البلد بنجاح'
    });
});

module.exports = {
    getAllCountries,
    getAllCountryNames,
    getCountryById,
    addCountry,
    updateCountry,
    deleteCountry
};
