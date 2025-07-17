const Room = require("../models/room.model.js");
const Hotel = require("../models/hotel.model.js");
const httpStatusText = require("../utils/httpStatusText.js");
const { paginate, extractPaginationParams } = require('../utils/pagination');
const { catchAsync, AppError } = require('../utils/errorHandler');

/**
 * @desc    إضافة غرفة جديدة
 * @route   POST /api/admin/rooms
 * @access  Admin and above
 */
const addRoom = catchAsync(async (req, res) => {
    const {
        nameAr,
        nameEn,
        hotelId,
        type,
        price,
        description,
        services,
        numberRoom,
        bedsCount
    } = req.body;

    // التحقق من الحقول المطلوبة
    if (!nameAr) {
        throw new AppError('اسم الغرفة باللغة العربية مطلوب', 400);
    }

    if (!nameEn) {
        throw new AppError('اسم الغرفة باللغة الإنجليزية مطلوب', 400);
    }

    if (!hotelId) {
        throw new AppError('معرف الفندق مطلوب', 400);
    }

    if (!type) {
        throw new AppError('نوع الغرفة مطلوب', 400);
    }

    if (!price) {
        throw new AppError('سعر الغرفة مطلوب', 400);
    }

    // التحقق من وجود الفندق
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new AppError('الفندق المحدد غير موجود', 404);
    }

    // توليد رقم غرفة تلقائي إذا لم يتم إدخاله
    let roomNumber = numberRoom;
    if (!roomNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        // البحث عن آخر غرفة في نفس اليوم
        const lastRoom = await Room.findOne(
            { numberRoom: new RegExp(`^ROOM-${year}${month}${day}`) },
            { numberRoom: 1 },
            { sort: { numberRoom: -1 } }
        );

        let sequence = 1;
        if (lastRoom?.numberRoom) {
            const lastSeq = parseInt(lastRoom.numberRoom.slice(-4)) || 0;
            sequence = lastSeq < 9999 ? lastSeq + 1 : 1;
        }

        roomNumber = `ROOM-${year}${month}${day}-${sequence.toString().padStart(4, '0')}`;
    }

    // إنشاء بيانات الغرفة الجديدة
    const newRoomData = {
        name: {
            ar: nameAr,
            en: nameEn
        },
        hotel: hotelId,
        type,
        price: parseFloat(price),
        status: 'Available',
        numberRoom: roomNumber,
        bedsCount: bedsCount ? parseInt(bedsCount) : 1
    };

    // إضافة الوصف إذا تم تحديده
    if (description) {
        newRoomData.description = description;
    }

    // إضافة الخدمات الإضافية
    if (services) {
        const servicesMap = new Map();
        if (typeof services === 'string') {
            try {
                const parsedServices = JSON.parse(services);
                Object.keys(parsedServices).forEach(key => {
                    if (parsedServices[key]) {
                        servicesMap.set(key, parsedServices[key]);
                    }
                });
            } catch (error) {
                // إذا فشل التحليل، نتجاهل الخدمات
            }
        } else if (typeof services === 'object') {
            Object.keys(services).forEach(key => {
                if (services[key]) {
                    servicesMap.set(key, services[key]);
                }
            });
        }
        newRoomData.services = servicesMap;
    }

    // إضافة الصور إذا تم رفعها
    if (req.files && req.files.length > 0) {
        newRoomData.images = req.files.map(file => `uploads/rooms/${file.filename}`);
    } else if (req.file) {
        newRoomData.images = [`uploads/rooms/${req.file.filename}`];
    }

    // إنشاء الغرفة الجديدة
    const newRoom = new Room(newRoomData);
    await newRoom.save();

    // جلب البيانات مع populate
    const populatedRoom = await Room.findById(newRoom._id)
        .populate('hotel', 'name');

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة الغرفة بنجاح',
        data: { room: populatedRoom }
    });
});

/**
 * @desc    جلب جميع الغرف مع الباجينيشن والفلترة (Admin)
 * @route   GET /api/admin/rooms
 * @access  Manager and above
 */
const getAllRooms = catchAsync(async (req, res) => {
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en', 'numberRoom'];

    // بناء استعلام الفلترة
    let query = {};

    // فلترة حسب نوع الغرفة
    if (req.query.type) {
        query.type = req.query.type;
    }

    // فلترة حسب الفندق
    if (req.query.hotelId) {
        query.hotel = req.query.hotelId;
    }

    // إضافة populate للبيانات المرتبطة
    options.populate = [
        {
            path: 'hotel',
            select: 'name'
        }
    ];

    const result = await paginate(Room, query, options);

    // جلب معلومات الحجز لكل غرفة
    const roomsWithBookingInfo = await Promise.all(
        result.data.map(async (room) => {
            const Booking = require('../models/booking.model');
            const activeBooking = await Booking.findOne({
                room: room._id,
                status: { $in: ['confirmed', 'checked_in'] }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name');

            // جلب جميع الحجوزات المستقبلية للغرفة
            const futureBookings = await Booking.find({
                room: room._id,
                status: { $in: ['pending', 'confirmed', 'checked_in'] },
                checkInDate: { $gte: new Date() }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name')
            .sort({ checkInDate: 1 });

            return {
                ...room.toObject(),
                activeBooking: activeBooking ? {
                    customerName: activeBooking.customer?.fullName || 'غير محدد',
                    checkInDate: activeBooking.checkInDate,
                    checkOutDate: activeBooking.checkOutDate,
                    paymentMethodName: activeBooking.payment?.paymentMethod?.name?.ar ||
                                     activeBooking.payment?.paymentMethod?.name?.en || 'غير محدد'
                } : null,
                futureBookings: futureBookings.map(booking => ({
                    id: booking._id,
                    bookingNumber: booking.bookingNumber,
                    customerName: booking.customer?.fullName || 'غير محدد',
                    checkInDate: booking.checkInDate,
                    checkOutDate: booking.checkOutDate,
                    status: booking.status,
                    paymentMethodName: booking.payment?.paymentMethod?.name?.ar ||
                                     booking.payment?.paymentMethod?.name?.en || 'غير محدد'
                }))
            };
        })
    );

    // تنسيق البيانات حسب المطلوب
    const formattedRooms = roomsWithBookingInfo.map(room => ({
        id: room._id,
        nameAr: room.name?.ar,
        nameEn: room.name?.en,
        hotelName: room.hotel?.name?.ar || room.hotel?.name?.en || 'غير محدد',
        type: room.type,
        numberRoom: room.numberRoom,
        bedsCount: room.bedsCount || 1,
        isBooked: room.activeBooking ? true : false,
        currentBooking: room.activeBooking ? {
            customerName: room.activeBooking.customerName,
            checkInDate: room.activeBooking.checkInDate,
            checkOutDate: room.activeBooking.checkOutDate,
            paymentMethodName: room.activeBooking.paymentMethodName
        } : null,
        futureBookings: room.futureBookings || [],
        bookedDates: room.futureBookings?.map(booking => ({
            from: booking.checkInDate,
            to: booking.checkOutDate,
            status: booking.status,
            customerName: booking.customerName
        })) || [],
        pricePerNight: room.price || 0,
        images: room.images || [],
        services: room.services ? Object.fromEntries(room.services) : {},
        description: room.description || '',
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الغرف بنجاح',
        data: {
            count: result.pagination.totalCount,
            rooms: formattedRooms
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب غرف فندق معين
 * @route   GET /api/admin/rooms/hotel/:hotelId
 * @access  Manager and above
 */
const getRoomsByHotelId = catchAsync(async (req, res) => {
    const { hotelId } = req.params;
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en', 'numberRoom'];

    // التحقق من وجود الفندق
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new AppError('الفندق غير موجود', 404);
    }

    // بناء استعلام الفلترة
    let query = { hotel: hotelId };

    // فلترة حسب نوع الغرفة
    if (req.query.type) {
        query.type = req.query.type;
    }

    const result = await paginate(Room, query, options);

    // جلب معلومات الحجز لكل غرفة
    const roomsWithBookingInfo = await Promise.all(
        result.data.map(async (room) => {
            const Booking = require('../models/booking.model');
            const activeBooking = await Booking.findOne({
                room: room._id,
                status: { $in: ['confirmed', 'checked_in'] }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name');

            // جلب جميع الحجوزات المستقبلية للغرفة
            const futureBookings = await Booking.find({
                room: room._id,
                status: { $in: ['pending', 'confirmed', 'checked_in'] },
                checkInDate: { $gte: new Date() }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name')
            .sort({ checkInDate: 1 });

            return {
                ...room.toObject(),
                activeBooking: activeBooking ? {
                    customerName: activeBooking.customer?.fullName || 'غير محدد',
                    checkInDate: activeBooking.checkInDate,
                    checkOutDate: activeBooking.checkOutDate,
                    paymentMethodName: activeBooking.payment?.paymentMethod?.name?.ar ||
                                     activeBooking.payment?.paymentMethod?.name?.en || 'غير محدد'
                } : null,
                futureBookings: futureBookings.map(booking => ({
                    id: booking._id,
                    bookingNumber: booking.bookingNumber,
                    customerName: booking.customer?.fullName || 'غير محدد',
                    checkInDate: booking.checkInDate,
                    checkOutDate: booking.checkOutDate,
                    status: booking.status,
                    paymentMethodName: booking.payment?.paymentMethod?.name?.ar ||
                                     booking.payment?.paymentMethod?.name?.en || 'غير محدد'
                }))
            };
        })
    );

    // تنسيق البيانات حسب المطلوب
    const formattedRooms = roomsWithBookingInfo.map(room => ({
        id: room._id,
        nameAr: room.name?.ar,
        nameEn: room.name?.en,
        numberRoom: room.numberRoom,
        type: room.type,
        bedsCount: room.bedsCount || 1,
        isBooked: room.activeBooking ? true : false,
        currentBooking: room.activeBooking ? {
            customerName: room.activeBooking.customerName,
            checkInDate: room.activeBooking.checkInDate,
            checkOutDate: room.activeBooking.checkOutDate,
            paymentMethodName: room.activeBooking.paymentMethodName
        } : null,
        futureBookings: room.futureBookings || [],
        bookedDates: room.futureBookings?.map(booking => ({
            from: booking.checkInDate,
            to: booking.checkOutDate,
            status: booking.status,
            customerName: booking.customerName
        })) || [],
        pricePerNight: room.price || 0,
        images: room.images,
        services: room.services ? Object.fromEntries(room.services) : {},
        description: room.description || ''
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب غرف الفندق بنجاح',
        data: {
            hotel: {
                id: hotel._id,
                name: hotel.name
            },
            count: result.pagination.totalCount,
            rooms: formattedRooms
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب غرفة واحدة بالمعرف
 * @route   GET /api/admin/rooms/:id
 * @access  Manager and above
 */
const getRoomById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id)
        .populate('hotel', 'name');

    if (!room) {
        throw new AppError('الغرفة غير موجودة', 404);
    }

    // جلب معلومات الحجز النشط
    const Booking = require('../models/booking.model');
    const activeBooking = await Booking.findOne({
        room: room._id,
        status: { $in: ['confirmed', 'checked_in'] }
    })
    .populate('customer', 'fullName')
    .populate('payment.paymentMethod', 'name');

    // جلب جميع الحجوزات المستقبلية للغرفة
    const futureBookings = await Booking.find({
        room: room._id,
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        checkInDate: { $gte: new Date() }
    })
    .populate('customer', 'fullName')
    .populate('payment.paymentMethod', 'name')
    .sort({ checkInDate: 1 });

    // تنسيق البيانات
    const formattedRoom = {
        id: room._id,
        nameAr: room.name?.ar,
        nameEn: room.name?.en,
        numberRoom: room.numberRoom,
        type: room.type,
        bedsCount: room.bedsCount || 1,
        status: room.status,
        pricePerNight: room.price || 0,
        hotelId: room.hotel?._id,
        isBooked: activeBooking ? true : false,
        currentBooking: activeBooking ? {
            customerName: activeBooking.customer?.fullName || null,
            checkInDate: activeBooking.checkInDate,
            checkOutDate: activeBooking.checkOutDate,
            paymentMethodName: activeBooking.payment?.paymentMethod?.name?.ar ||
                              activeBooking.payment?.paymentMethod?.name?.en || null
        } : null,
        futureBookings: futureBookings.map(booking => ({
            id: booking._id,
            bookingNumber: booking.bookingNumber,
            customerName: booking.customer?.fullName || 'غير محدد',
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            status: booking.status,
            paymentMethodName: booking.payment?.paymentMethod?.name?.ar ||
                             booking.payment?.paymentMethod?.name?.en || 'غير محدد'
        })),
        bookedDates: futureBookings.map(booking => ({
            from: booking.checkInDate,
            to: booking.checkOutDate,
            status: booking.status,
            customerName: booking.customer?.fullName || 'غير محدد'
        })),
        images: room.images,
        services: room.services ? Object.fromEntries(room.services) : {},
        description: room.description || '',
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات الغرفة بنجاح',
        data: { room: formattedRoom }
    });
});

/**
 * @desc    تحديث غرفة
 * @route   POST /api/admin/rooms/:id
 * @access  Admin and above
 */
const updateRoom = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        nameAr,
        nameEn,
        type,
        price,
        description,
        services,
        bedsCount,
        deleteImages
    } = req.body;

    const room = await Room.findById(id);
    if (!room) {
        throw new AppError('الغرفة غير موجودة', 404);
    }

    // تحديث البيانات
    const updateData = {};

    if (nameAr || nameEn) {
        updateData.name = {};
        if (nameAr) updateData.name.ar = nameAr;
        if (nameEn) updateData.name.en = nameEn;
        // الحفاظ على القيم الموجودة إذا لم يتم تحديثها
        if (!nameAr && room.name?.ar) updateData.name.ar = room.name.ar;
        if (!nameEn && room.name?.en) updateData.name.en = room.name.en;
    }

    if (type) updateData.type = type;
    if (price) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (bedsCount) updateData.bedsCount = parseInt(bedsCount);

    // تحديث الخدمات الإضافية
    if (services) {
        const servicesMap = new Map();
        if (typeof services === 'string') {
            try {
                const parsedServices = JSON.parse(services);
                Object.keys(parsedServices).forEach(key => {
                    if (parsedServices[key]) {
                        servicesMap.set(key, parsedServices[key]);
                    }
                });
            } catch (error) {
                // إذا فشل التحليل، نحتفظ بالخدمات الموجودة
                updateData.services = room.services;
            }
        } else if (typeof services === 'object') {
            Object.keys(services).forEach(key => {
                if (services[key]) {
                    servicesMap.set(key, services[key]);
                }
            });
        }
        if (servicesMap.size > 0) {
            updateData.services = servicesMap;
        }
    }

    // معالجة حذف الصور المحددة
    let currentImages = room.images || [];

    if (deleteImages) {
        let imagesToDelete = [];

        // تحويل deleteImages إلى array إذا كان string
        if (typeof deleteImages === 'string') {
            try {
                imagesToDelete = JSON.parse(deleteImages);
            } catch (error) {
                // إذا فشل التحليل، نتجاهل العملية
                imagesToDelete = [];
            }
        } else if (Array.isArray(deleteImages)) {
            imagesToDelete = deleteImages;
        }

        if (imagesToDelete.length > 0) {
            // حذف الصور المحددة من النظام
            const { deleteOldFiles } = require('../middelWare/roomUploadMiddleware');
            deleteOldFiles(imagesToDelete);

            // إزالة الصور المحذوفة من قائمة الصور الحالية
            currentImages = currentImages.filter(image => !imagesToDelete.includes(image));
        }
    }

    // تحديث الصور إذا تم رفع صور جديدة
    if (req.files && req.files.length > 0) {
        // إضافة الصور الجديدة إلى الصور الحالية (بعد حذف المحددة)
        const newImages = req.files.map(file => `uploads/rooms/${file.filename}`);
        updateData.images = [...currentImages, ...newImages];
    } else if (req.file) {
        // إضافة الصورة الجديدة إلى الصور الحالية (بعد حذف المحددة)
        const newImage = `uploads/rooms/${req.file.filename}`;
        updateData.images = [...currentImages, newImage];
    } else if (deleteImages) {
        // إذا تم حذف صور فقط بدون إضافة جديدة
        updateData.images = currentImages;
    }

    const updatedRoom = await Room.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('hotel', 'name');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث بيانات الغرفة بنجاح',
        data: { room: updatedRoom }
    });
});

/**
 * @desc    حذف غرفة
 * @route   DELETE /api/admin/rooms/:id
 * @access  Admin and above
 */
const deleteRoom = catchAsync(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id);
    if (!room) {
        throw new AppError('الغرفة غير موجودة', 404);
    }

    // التحقق من عدم وجود حجوزات نشطة للغرفة
    // يمكن إضافة هذا التحقق لاحقاً عند إنشاء نظام الحجوزات

    await Room.findByIdAndDelete(id);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف الغرفة بنجاح'
    });
});

/**
 * @desc    جلب غرف فندق معين للموبايل
 * @route   GET /api/mobile/rooms/hotel/:hotelId
 * @access  Public
 */
const getRoomsByHotelIdForMobile = catchAsync(async (req, res) => {
    const { hotelId } = req.params;
    const options = extractPaginationParams(req);

    // إضافة حقول البحث المخصصة
    options.searchFields = ['name.ar', 'name.en', 'numberRoom'];

    // التحقق من وجود الفندق وأنه نشط
    const hotel = await Hotel.findOne({ _id: hotelId, isActive: true });
    if (!hotel) {
        throw new AppError('الفندق غير موجود أو غير نشط', 404);
    }

    // بناء استعلام الفلترة - فقط الغرف المتاحة للحجز
    let query = {
        hotel: hotelId,
        isAvailableForBooking: true
    };

    // فلترة حسب نوع الغرفة
    if (req.query.type) {
        query.type = req.query.type;
    }

    const result = await paginate(Room, query, options);

    // جلب معلومات الحجز لكل غرفة
    const roomsWithBookingInfo = await Promise.all(
        result.data.map(async (room) => {
            const Booking = require('../models/booking.model');
            const activeBooking = await Booking.findOne({
                room: room._id,
                status: { $in: ['confirmed', 'checked_in'] }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name');

            // جلب جميع الحجوزات المستقبلية للغرفة
            const futureBookings = await Booking.find({
                room: room._id,
                status: { $in: ['pending', 'confirmed', 'checked_in'] },
                checkInDate: { $gte: new Date() }
            })
            .populate('customer', 'fullName')
            .populate('payment.paymentMethod', 'name')
            .sort({ checkInDate: 1 });

            return {
                ...room.toObject(),
                activeBooking: activeBooking ? {
                    customerName: activeBooking.customer?.fullName || 'غير محدد',
                    checkInDate: activeBooking.checkInDate,
                    checkOutDate: activeBooking.checkOutDate,
                    paymentMethodName: activeBooking.payment?.paymentMethod?.name?.ar ||
                                     activeBooking.payment?.paymentMethod?.name?.en || 'غير محدد'
                } : null,
                futureBookings: futureBookings.map(booking => ({
                    id: booking._id,
                    bookingNumber: booking.bookingNumber,
                    customerName: booking.customer?.fullName || 'غير محدد',
                    checkInDate: booking.checkInDate,
                    checkOutDate: booking.checkOutDate,
                    status: booking.status,
                    paymentMethodName: booking.payment?.paymentMethod?.name?.ar ||
                                     booking.payment?.paymentMethod?.name?.en || 'غير محدد'
                }))
            };
        })
    );

    // تنسيق البيانات للموبايل
    const formattedRooms = roomsWithBookingInfo.map(room => ({
        id: room._id,
        nameAr: room.name?.ar,
        nameEn: room.name?.en,
        numberRoom: room.numberRoom,
        type: room.type,
        bedsCount: room.bedsCount || 1,
        isBooked: room.activeBooking ? true : false,
        currentBooking: room.activeBooking ? {
            customerName: room.activeBooking.customerName,
            checkInDate: room.activeBooking.checkInDate,
            checkOutDate: room.activeBooking.checkOutDate,
            paymentMethodName: room.activeBooking.paymentMethodName
        } : null,
        bookedDates: room.futureBookings?.map(booking => ({
            from: booking.checkInDate,
            to: booking.checkOutDate,
            status: booking.status,
            customerName: booking.customerName
        })) || [],
        pricePerNight: room.price || 0,
        images: room.images,
        services: room.services ? Object.fromEntries(room.services) : {},
        description: room.description || ''
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب غرف الفندق بنجاح',
        data: {
            hotel: {
                id: hotel._id,
                name: hotel.name
            },
            count: result.pagination.totalCount,
            rooms: formattedRooms
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب غرفة واحدة بالمعرف للموبايل
 * @route   GET /api/mobile/rooms/:id
 * @access  Public
 */
const getRoomByIdForMobile = catchAsync(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findOne({
        _id: id,
        isAvailableForBooking: true
    }).populate('hotel', 'name isActive');

    if (!room || !room.hotel?.isActive) {
        throw new AppError('الغرفة غير موجودة أو غير متاحة', 404);
    }

    // جلب معلومات الحجز النشط
    const Booking = require('../models/booking.model');
    const activeBooking = await Booking.findOne({
        room: room._id,
        status: { $in: ['confirmed', 'checked_in'] }
    })
    .populate('customer', 'fullName')
    .populate('payment.paymentMethod', 'name');

    // جلب جميع الحجوزات المستقبلية للغرفة
    const futureBookings = await Booking.find({
        room: room._id,
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        checkInDate: { $gte: new Date() }
    })
    .populate('customer', 'fullName')
    .populate('payment.paymentMethod', 'name')
    .sort({ checkInDate: 1 });

    // تنسيق البيانات للموبايل
    const formattedRoom = {
        id: room._id,
        nameAr: room.name?.ar,
        nameEn: room.name?.en,
        numberRoom: room.numberRoom,
        type: room.type,
        bedsCount: room.bedsCount || 1,
        isBooked: activeBooking ? true : false,
        currentBooking: activeBooking ? {
            customerName: activeBooking.customer?.fullName || null,
            checkInDate: activeBooking.checkInDate,
            checkOutDate: activeBooking.checkOutDate,
            paymentMethodName: activeBooking.payment?.paymentMethod?.name?.ar ||
                              activeBooking.payment?.paymentMethod?.name?.en || null
        } : null,
        bookedDates: futureBookings.map(booking => ({
            from: booking.checkInDate,
            to: booking.checkOutDate,
            status: booking.status,
            customerName: booking.customer?.fullName || 'غير محدد'
        })),
        pricePerNight: room.price || 0,
        hotel: {
            id: room.hotel._id,
            name: room.hotel.name
        },
        images: room.images,
        services: room.services ? Object.fromEntries(room.services) : {},
        description: room.description || ''
    };

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب بيانات الغرفة بنجاح',
        data: { room: formattedRoom }
    });
});

module.exports = {
    addRoom,
    getAllRooms,
    getRoomsByHotelId,
    getRoomById,
    updateRoom,
    deleteRoom,
    getRoomsByHotelIdForMobile,
    getRoomByIdForMobile
};
