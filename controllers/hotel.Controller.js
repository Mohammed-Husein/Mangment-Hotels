const Hotel = require("../models/hotel.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

// دالة حساب المسافة بين نقطتين جغرافيتين (معادلة Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // المسافة بالكيلومتر
};

/**
 * @desc    جلب جميع الفنادق مع الباجينيشن والفلترة (Admin)
 * @route   GET /api/admin/hotels
 * @access  Admin and above
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

    // فلترة حسب الموظف المنشئ
    if (req.query.employeeId) {
        query.createdByEmployee = req.query.employeeId;
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
 * @desc    جلب أسماء ومعرفات جميع الفنادق
 * @route   GET /api/admin/hotels/GetAllNames
 * @access  Admin and above
 */
const getAllHotelNames = catchAsync(async (req, res) => {
    let query = { isActive: true }; // فقط الفنادق النشطة

    // فلترة حسب البلد
    if (req.query.countryId) {
        query.country = req.query.countryId;
    }

    // فلترة حسب المحافظة
    if (req.query.governorateId) {
        query.governorate = req.query.governorateId;
    }

    // فلترة حسب المنطقة
    if (req.query.regionId) {
        query.region = req.query.regionId;
    }

    const hotels = await Hotel.find(query)
        .select('_id name')
        .sort({ 'name.ar': 1 });

    const formattedHotels = hotels.map(hotel => ({
        id: hotel._id,
        name: hotel.name?.ar || hotel.name?.en || 'غير محدد'
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب أسماء الفنادق بنجاح',
        data: {
            count: formattedHotels.length,
            hotels: formattedHotels
        }
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
        createdByEmployee: req.decoded?.id // استخدام معرف الموظف المسجل دخوله
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
    if (req.processedImage) {
        newHotelData.images = [req.processedImage.url];
    } else if (req.file) {
        newHotelData.images = [req.file.filename];
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
 * @access  Admin and above
 */
const getHotelById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const hotel = await Hotel.findById(id)
        .populate('country', 'name')
        .populate('governorate', 'name')
        .populate('region', 'name')
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
        regionId: hotel.region?._id,
        regionName: hotel.region?.name?.ar || hotel.region?.name?.en || 'غير محدد',
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
 * @route   POST /api/admin/hotels/:id/update
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
        regionId,
        isActive,
        deleteImage
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

    if (regionId) {
        const Region = require('../models/region.model');
        const region = await Region.findById(regionId);
        if (!region) {
            throw new AppError('المنطقة المحددة غير موجودة', 400);
        }
        updateData.region = regionId;
    }

    // تحديث الموقع الجغرافي
    if (location && location.longitude && location.latitude) {
        updateData.location = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        };
    }

    // معالجة حذف الصورة المحددة
    let currentImages = hotel.images || [];

    if (deleteImage) {
        // حذف الصورة المحددة من Cloudinary
        const { deleteOldFiles } = require('../middelWare/hotelUploadMiddleware');
        await deleteOldFiles([deleteImage]);

        // إزالة الصورة المحذوفة من قائمة الصور الحالية
        currentImages = currentImages.filter(image => image !== deleteImage);
    }

    // تحديث الصورة إذا تم رفع صورة جديدة
    if (req.processedImage) {
        // إذا كان هناك صور حالية وتم رفع صورة جديدة، نحذف القديمة ونضع الجديدة
        if (currentImages.length > 0 && !deleteImage) {
            const { deleteOldFiles } = require('../middelWare/hotelUploadMiddleware');
            await deleteOldFiles(currentImages);
        }
        updateData.images = [req.processedImage.url];
    } else if (req.file) {
        // للتوافق مع النظام القديم
        if (currentImages.length > 0 && !deleteImage) {
            const { deleteOldFiles } = require('../middelWare/hotelUploadMiddleware');
            await deleteOldFiles(currentImages);
        }
        updateData.images = [req.file.filename];
    } else if (deleteImage && currentImages.length === 0) {
        // إذا تم حذف الصورة الوحيدة ولم يتم رفع جديدة
        updateData.images = [];
    } else if (deleteImage) {
        // إذا تم حذف صورة معينة فقط
        updateData.images = currentImages;
    }

    // تحديث معرف الموظف المحدث
    updateData.updatedByEmployee = req.decoded?.id;

    const updatedHotel = await Hotel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('country', 'name')
     .populate('governorate', 'name')
     .populate('region', 'name')
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
 * @desc    جلب جميع الفنادق للموبايل مع الباجينيشن والفلترة والبحث الجغرافي
 * @route   GET /api/mobile/hotels
 * @access  Public
 * @query   longitude, latitude, search, governorateId/cityId, page, limit
 */
const getAllHotelsForMobile = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);
    const { longitude, latitude, search } = req.query;

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en'];

    // بناء استعلام الفلترة - فقط الفنادق النشطة
    let query = { isActive: true };
    let useLocationFilter = false;

    // البحث النصي في اسم الفندق
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
            { 'name.ar': searchRegex },
            { 'name.en': searchRegex }
        ];
    }

    // فلترة حسب المحافظة
    if (req.query.governorateId || req.query.cityId) {
        query.governorate = req.query.governorateId || req.query.cityId;
    }

    // البحث الجغرافي إذا تم تمرير الإحداثيات
    if (longitude && latitude) {
        const lng = parseFloat(longitude);
        const lat = parseFloat(latitude);

        // التحقق من صحة الإحداثيات
        if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
            // البحث ضمن دائرة نصف قطرها 50 كيلومتر (50000 متر)
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 50000 // 50 كيلومتر
                }
            };
            useLocationFilter = true;
        }
    }

    // إضافة populate للبيانات المرتبطة
    options.populate = [
        { path: 'country', select: 'name' },
        { path: 'governorate', select: 'name' }
    ];

    let result = await paginate(Hotel, query, options);

    // إذا تم استخدام فلتر الموقع ولم يتم العثور على فنادق، جلب جميع الفنادق
    if (useLocationFilter && result.data.length === 0) {
        // إزالة فلتر الموقع والبحث مرة أخرى
        const fallbackQuery = { isActive: true };

        // الاحتفاظ بالفلاتر الأخرى
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            fallbackQuery.$or = [
                { 'name.ar': searchRegex },
                { 'name.en': searchRegex }
            ];
        }

        if (req.query.governorateId || req.query.cityId) {
            fallbackQuery.governorate = req.query.governorateId || req.query.cityId;
        }

        result = await paginate(Hotel, fallbackQuery, options);
    }

    // جلب عدد الغرف لكل فندق
    const hotelsWithRoomCount = await Promise.all(
        result.data.map(async (hotel) => {
            const Room = require('../models/room.model');
            const roomsCount = await Room.countDocuments({ hotel: hotel._id });

            // حساب المسافة إذا تم تمرير إحداثيات المستخدم
            let distance = null;
            if (longitude && latitude && hotel.location && hotel.location.coordinates) {
                const hotelLng = hotel.location.coordinates[0];
                const hotelLat = hotel.location.coordinates[1];

                // حساب المسافة باستخدام معادلة Haversine (بالكيلومتر)
                distance = calculateDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    hotelLat,
                    hotelLng
                );
            }

            return {
                ...hotel.toObject(),
                roomsCount,
                distance: distance ? Math.round(distance * 100) / 100 : null // تقريب لرقمين عشريين
            };
        })
    );

    // ترتيب الفنادق حسب المسافة إذا تم تمرير إحداثيات
    if (longitude && latitude) {
        hotelsWithRoomCount.sort((a, b) => {
            // الفنادق التي لها مسافة محسوبة تأتي أولاً
            if (a.distance !== null && b.distance === null) return -1;
            if (a.distance === null && b.distance !== null) return 1;
            if (a.distance === null && b.distance === null) return 0;
            return a.distance - b.distance; // ترتيب تصاعدي حسب المسافة
        });
    }

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
        distance: hotel.distance, // المسافة بالكيلومتر (null إذا لم يتم تمرير إحداثيات المستخدم)
        roomsCount: hotel.roomsCount || 0
    }));

    // تحديد رسالة الاستجابة بناءً على نوع البحث
    let message = 'تم جلب الفنادق بنجاح';
    if (useLocationFilter && result.data.length > 0) {
        message = 'تم جلب الفنادق القريبة من موقعك بنجاح';
    } else if (useLocationFilter && result.data.length === 0) {
        message = 'لم يتم العثور على فنادق قريبة، تم جلب جميع الفنادق المتاحة';
    } else if (search) {
        message = `تم جلب الفنادق المطابقة لـ "${search}" بنجاح`;
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: message,
        data: {
            count: result.pagination.totalCount,
            hotels: formattedHotels,
            searchInfo: {
                hasLocationFilter: useLocationFilter,
                searchTerm: search || null,
                userLocation: longitude && latitude ? {
                    longitude: parseFloat(longitude),
                    latitude: parseFloat(latitude)
                } : null
            }
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
    getAllHotelNames,
    addHotel,
    getHotelById,
    updateHotel,
    deleteHotel,
    getAllHotelsForMobile,
    getHotelByIdForMobile
};
