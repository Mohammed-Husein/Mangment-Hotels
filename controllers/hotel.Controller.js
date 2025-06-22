const Hotel = require("../models/hotel.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    جلب جميع الفنادق مع الباجينيشن والفلترة (Admin)
 * @route   GET /api/admin/hotels
 * @access  Manager and above
 */
const getAllHotels = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en'];

    // بناء استعلام الفلترة
    let query = {};

    // فلترة حسب الحالة
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    // فلترة حسب البلد
    if (req.query.countryId) {
        query.country = req.query.countryId;
    }

    // فلترة حسب المحافظة
    if (req.query.governorateId) {
        query.governorate = req.query.governorateId;
    }

    // فلترة حسب المدينة (نفس المحافظة)
    if (req.query.cityId) {
        query.governorate = req.query.cityId;
    }

    // فلترة حسب المنطقة
    if (req.query.regionId) {
        query.region = req.query.regionId;
    }

    // إضافة populate للبيانات المرتبطة
    options.populate = [
        { path: 'country', select: 'name' },
        { path: 'governorate', select: 'name' },
        { path: 'region', select: 'name' },
        { path: 'createdByEmployee', select: 'fullName' }
    ];

    const result = await paginate(Hotel, query, options);

    // جلب عدد الغرف لكل فندق
    const hotelsWithRoomCount = await Promise.all(
        result.data.map(async (hotel) => {
            const Room = require('../models/room.model');
            const roomsCount = await Room.countDocuments({ hotel: hotel._id });
            return { ...hotel.toObject(), roomsCount };
        })
    );

    // تنسيق البيانات
    const formattedHotels = hotelsWithRoomCount.map(hotel => ({
        id: hotel._id,
        name: hotel.name,
        image: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
        images: hotel.images || [],
        countryName: hotel.country?.name?.ar || hotel.country?.name?.en || 'غير محدد',
        governorateName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        cityName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        regionName: hotel.region?.name?.ar || hotel.region?.name?.en || 'غير محدد',
        location: hotel.location?.coordinates ? {
            longitude: hotel.location.coordinates[0],
            latitude: hotel.location.coordinates[1]
        } : null,
        roomsCount: hotel.roomsCount || 0,
        isActive: hotel.isActive,
        employeeName: hotel.createdByEmployee?.fullName || 'غير محدد',
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الفنادق بنجاح',
        data: {
            count: result.pagination.totalCount,
            hotels: formattedHotels
        },
        pagination: result.pagination
    });
});

/**
 * @desc    إضافة فندق جديد
 * @route   POST /api/admin/hotels
 * @access  Admin and above
 */
const addHotel = catchAsync(async (req, res) => {
    const {
        nameAr,  // تغيير من namear إلى nameAr لتتوافق مع التحقق
        nameEn,
        countryId,
        governorateId,
        regionId,  // استخدام regionId بدلاً من cityId
        employeeId,
        isActive
    } = req.body;

    // التحقق من الحقول المطلوبة
    if (!nameAr) {
        throw new AppError('اسم الفندق باللغة العربية مطلوب', 400);
    }

    if (!nameEn) {
        throw new AppError('اسم الفندق باللغة الإنجليزية مطلوب', 400);
    }

    if (!countryId) {
        throw new AppError('معرف البلد مطلوب', 400);
    }

    if (!governorateId) {
        throw new AppError('معرف المحافظة مطلوب', 400);
    }

    if (!regionId) {
        throw new AppError('معرف المنطقة مطلوب', 400);
    }

    if (!employeeId) {
        throw new AppError('معرف الموظف مطلوب', 400);
    }

    // التحقق من عدم وجود فندق بنفس الاسم في نفس المنطقة
    const existingHotel = await Hotel.findOne({
        'name.ar': nameAr,
        region: regionId
    });
    if (existingHotel) {
        throw new AppError('يوجد فندق مسجل بهذا الاسم في نفس المنطقة مسبقاً', 400);
    }

    // التحقق من صحة البلد
    const Country = require('../models/country.model');
    const country = await Country.findById(countryId);
    if (!country) {
        throw new AppError('البلد المحدد غير موجود', 400);
    }

    // التحقق من صحة المحافظة
    const Governorate = require('../models/governorate.model');
    const governorate = await Governorate.findById(governorateId);
    if (!governorate) {
        throw new AppError('المحافظة المحددة غير موجودة', 400);
    }

    // التحقق من صحة المنطقة
    const Region = require('../models/region.model');
    const region = await Region.findById(regionId);
    if (!region) {
        throw new AppError('المنطقة المحددة غير موجودة', 400);
    }

    // التحقق من صحة الموظف
    const Employee = require('../models/employee.model');
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw new AppError('الموظف المحدد غير موجود', 400);
    }

    // إنشاء بيانات الفندق الجديد
    const newHotelData = {
        name: {
            ar: nameAr,
            en: nameEn || nameAr // استخدام الاسم العربي إذا لم يتم تقديم الاسم الإنجليزي
        },
        country: countryId,
        governorate: governorateId,
        region: regionId,
        isActive: isActive !== undefined ? isActive : true,
        createdByEmployee: employeeId
    };

    // إضافة الموقع الجغرافي إذا تم تحديده
    if (req.body.longitude && req.body.latitude) {
        newHotelData.location = {
            type: 'Point',
            coordinates: [
                parseFloat(req.body.longitude),
                parseFloat(req.body.latitude)
            ]
        };
    }

    // إضافة الصورة إذا تم رفعها
    if (req.file) {
        newHotelData.images = [`uploads/hotels/${req.file.filename}`];
    }

    // إنشاء الفندق الجديد
    const newHotel = await Hotel.create(newHotelData);

    // جلب البيانات مع populate
    const populatedHotel = await Hotel.findById(newHotel._id)
        .populate('country', 'name')
        .populate('governorate', 'name')
        .populate('region', 'name')
        .populate('createdByEmployee', 'fullName');

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة الفندق بنجاح',
        data: { hotel: populatedHotel }
    });
});

/**
 * @desc    جلب فندق واحد بالمعرف
 * @route   GET /api/admin/hotels/:id
 * @access  Manager and above
 */
const getHotelById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const hotel = await Hotel.findById(id)
        .populate('country', 'name')
        .populate('governorate', 'name')
        .populate('createdByEmployee', 'fullName')
        .populate('updatedByEmployee', 'fullName');

    if (!hotel) {
        throw new AppError('الفندق غير موجود', 404);
    }

    // جلب عدد الغرف
    const Room = require('../models/room.model');
    const roomsCount = await Room.countDocuments({ hotel: hotel._id });

    // تنسيق البيانات
    const formattedHotel = {
        id: hotel._id,
        name: hotel.name,
        countryId: hotel.country?._id,
        countryName: hotel.country?.name?.ar || hotel.country?.name?.en || 'غير محدد',
        governorateId: hotel.governorate?._id,
        governorateName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        cityId: hotel.governorate?._id,
        cityName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        location: hotel.location?.coordinates ? {
            longitude: hotel.location.coordinates[0],
            latitude: hotel.location.coordinates[1]
        } : null,
        images: hotel.images,
        roomsCount: roomsCount,
        isActive: hotel.isActive,
        employeeId: hotel.createdByEmployee?._id,
        employeeName: hotel.createdByEmployee?.fullName || 'غير محدد',
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات الفندق بنجاح',
        data: { hotel: formattedHotel }
    });
});

/**
 * @desc    تحديث بيانات فندق
 * @route   PUT /api/admin/hotels/:id
 * @access  Admin and above
 */
const updateHotel = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        namear,
        nameEn,
        countryId,
        governorateId,
        cityId,
        employeeId,
        isActive
    } = req.body;

    // استخراج إحداثيات الموقع إذا تم إرسالها
    let location = null;
    if (req.body.longitude && req.body.latitude) {
        location = {
            longitude: parseFloat(req.body.longitude),
            latitude: parseFloat(req.body.latitude)
        };
    }

    const hotel = await Hotel.findById(id);
    if (!hotel) {
        throw new AppError('الفندق غير موجود', 404);
    }

    // التحقق من عدم وجود فندق آخر بنفس الاسم في نفس المحافظة
    if (namear && namear !== hotel.name?.ar) {
        const existingHotel = await Hotel.findOne({
            'name.ar': namear,
            governorate: governorateId || cityId || hotel.governorate,
            _id: { $ne: id }
        });
        if (existingHotel) {
            throw new AppError('يوجد فندق آخر مسجل بهذا الاسم في نفس المحافظة', 400);
        }
    }

    // تحديث البيانات
    const updateData = {};

    if (namear || nameEn) {
        updateData.name = {
            ar: namear || hotel.name?.ar,
            en: nameEn || hotel.name?.en
        };
    }

    if (isActive !== undefined) {
        updateData.isActive = isActive;
    }

    // تحديث البلد والمحافظة إذا تم تحديدها
    if (countryId) {
        const Country = require('../models/country.model');
        const country = await Country.findById(countryId);
        if (!country) {
            throw new AppError('البلد المحدد غير موجود', 400);
        }
        updateData.country = countryId;
    }

    if (governorateId || cityId) {
        const Governorate = require('../models/governorate.model');
        const governorate = await Governorate.findById(governorateId || cityId);
        if (!governorate) {
            throw new AppError('المحافظة المحددة غير موجودة', 400);
        }
        updateData.governorate = governorateId || cityId;
    }

    // تحديث الموقع الجغرافي
    if (location && location.longitude && location.latitude) {
        updateData.location = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        };
    }

    // تحديث الصورة إذا تم رفع صورة جديدة
    if (req.file) {
        updateData.images = [`uploads/hotels/${req.file.filename}`];
    }

    // تحديث معرف الموظف المحدث
    if (employeeId) {
        const Employee = require('../models/employee.model');
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            throw new AppError('الموظف المحدد غير موجود', 400);
        }
        updateData.updatedByEmployee = employeeId;
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('country', 'name')
     .populate('governorate', 'name')
     .populate('createdByEmployee', 'fullName')
     .populate('updatedByEmployee', 'fullName');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات الفندق بنجاح',
        data: { hotel: updatedHotel }
    });
});

/**
 * @desc    حذف فندق
 * @route   DELETE /api/admin/hotels/:id
 * @access  Admin and above
 */
const deleteHotel = catchAsync(async (req, res) => {
    const { id } = req.params;

    const hotel = await Hotel.findById(id);
    if (!hotel) {
        throw new AppError('الفندق غير موجود', 404);
    }

    await Hotel.findByIdAndDelete(id);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف الفندق بنجاح'
    });
});

/**
 * @desc    جلب جميع الفنادق للموبايل مع الباجينيشن والفلترة
 * @route   GET /api/mobile/hotels
 * @access  Public
 */
const getAllHotelsForMobile = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en'];

    // بناء استعلام الفلترة - فقط الفنادق النشطة
    let query = { isActive: true };

    // فلترة حسب المحافظة
    if (req.query.governorateId || req.query.cityId) {
        query.governorate = req.query.governorateId || req.query.cityId;
    }

    // إضافة populate للبيانات المرتبطة
    options.populate = [
        { path: 'country', select: 'name' },
        { path: 'governorate', select: 'name' }
    ];

    const result = await paginate(Hotel, query, options);

    // جلب عدد الغرف لكل فندق
    const hotelsWithRoomCount = await Promise.all(
        result.data.map(async (hotel) => {
            const Room = require('../models/room.model');
            const roomsCount = await Room.countDocuments({ hotel: hotel._id });
            return { ...hotel.toObject(), roomsCount };
        })
    );

    // تنسيق البيانات للموبايل
    const formattedHotels = hotelsWithRoomCount.map(hotel => ({
        id: hotel._id,
        name: hotel.name,
        image: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
        countryName: hotel.country?.name?.ar || hotel.country?.name?.en || 'غير محدد',
        cityName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        location: hotel.location?.coordinates ? {
            longitude: hotel.location.coordinates[0],
            latitude: hotel.location.coordinates[1]
        } : null,
        roomsCount: hotel.roomsCount || 0
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الفنادق بنجاح',
        data: {
            count: result.pagination.totalCount,
            hotels: formattedHotels
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب فندق واحد بالمعرف للموبايل
 * @route   GET /api/mobile/hotels/:id
 * @access  Public
 */
const getHotelByIdForMobile = catchAsync(async (req, res) => {
    const { id } = req.params;

    const hotel = await Hotel.findOne({ _id: id, isActive: true })
        .populate('country', 'name')
        .populate('governorate', 'name');

    if (!hotel) {
        throw new AppError('الفندق غير موجود أو غير نشط', 404);
    }

    // جلب عدد الغرف
    const Room = require('../models/room.model');
    const roomsCount = await Room.countDocuments({ hotel: hotel._id });

    // تنسيق البيانات للموبايل
    const formattedHotel = {
        id: hotel._id,
        name: hotel.name,
        countryName: hotel.country?.name?.ar || hotel.country?.name?.en || 'غير محدد',
        cityName: hotel.governorate?.name?.ar || hotel.governorate?.name?.en || 'غير محدد',
        location: hotel.location?.coordinates ? {
            longitude: hotel.location.coordinates[0],
            latitude: hotel.location.coordinates[1]
        } : null,
        images: hotel.images,
        roomsCount: roomsCount
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات الفندق بنجاح',
        data: { hotel: formattedHotel }
    });
});
// const deleteHotel = catchAsync(async (req, res) => {
//     const { id } = req.params;

//     const hotel = await Hotel.findById(id);
//     if (!payment) {
//         throw new AppError('طريقة الدفع غير موجود', 404);
//     }


//     await PaymentMethod.findByIdAndDelete(id);

//     res.status(200).json({
//         status: httpStatusText.SUCCESS,
//         message: 'تم حذف طريقة الدفع بنجاح'
//     });
// });
module.exports = {
    getAllHotels,
    addHotel,
    getHotelById,
    updateHotel,
    deleteHotel,
    getAllHotelsForMobile,
    getHotelByIdForMobile
};
