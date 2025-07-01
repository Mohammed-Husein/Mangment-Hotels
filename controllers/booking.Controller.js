const { Booking, User, Room, PaymentMethod } = require('../models');
const { catchAsync, AppError } = require('../utils/errorHandler');
const httpStatusText = require('../utils/httpStatusText');
const { paginate, generateBookingNumber } = require('../utils/pagination');

/**
 * @desc    التحقق من توفر الغرفة في فترة معينة
 */
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, excludeBookingId = null) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // البحث عن الحجوزات المتضاربة
    const conflictingBookings = await Booking.find({
        room: roomId,
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        _id: { $ne: excludeBookingId },
        $or: [
            // الحجز الجديد يبدأ أثناء حجز موجود
            {
                checkInDate: { $lte: checkIn },
                checkOutDate: { $gt: checkIn }
            },
            // الحجز الجديد ينتهي أثناء حجز موجود
            {
                checkInDate: { $lt: checkOut },
                checkOutDate: { $gte: checkOut }
            },
            // الحجز الجديد يحتوي على حجز موجود
            {
                checkInDate: { $gte: checkIn },
                checkOutDate: { $lte: checkOut }
            },
            // حجز موجود يحتوي على الحجز الجديد
            {
                checkInDate: { $lte: checkIn },
                checkOutDate: { $gte: checkOut }
            }
        ]
    });

    return {
        isAvailable: conflictingBookings.length === 0,
        conflictingBookings
    };
};

/**
 * @desc    إضافة حجز جديد
 * @route   POST /api/admin/bookings
 * @access  Admin and above
 */
const addBooking = catchAsync(async (req, res) => {
    const {
        customerId,
        roomId,
        checkInDate,
        checkOutDate,
        paymentMethodId,
        totalAmount,
        discount,
        guestInfo,
        notes
    } = req.body;

    // التحقق من وجود العميل
    const customer = await User.findById(customerId);
    if (!customer) {
        throw new AppError('العميل المحدد غير موجود', 404);
    }

    // التحقق من وجود الغرفة
    const room = await Room.findById(roomId).populate('hotel');
    if (!room) {
        throw new AppError('الغرفة المحددة غير موجودة', 404);
    }

    // التحقق من وجود طريقة الدفع
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod) {
        throw new AppError('طريقة الدفع المحددة غير موجودة', 404);
    }

    // حساب عدد الليالي
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (numberOfNights <= 0) {
        throw new AppError('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول', 400);
    }

    // التحقق من توفر الغرفة في الفترة المطلوبة
    const availability = await checkRoomAvailability(roomId, checkInDate, checkOutDate);
    if (!availability.isAvailable) {
        const conflictingDates = availability.conflictingBookings.map(booking => ({
            from: booking.checkInDate.toISOString().split('T')[0],
            to: booking.checkOutDate.toISOString().split('T')[0],
            bookingNumber: booking.bookingNumber
        }));

        throw new AppError(
            `الغرفة محجوزة في الفترات التالية: ${conflictingDates.map(d => `من ${d.from} إلى ${d.to} (حجز رقم: ${d.bookingNumber})`).join(', ')}`,
            400
        );
    }

    // حساب السعر الإجمالي
    const roomTotalPrice = room.price * numberOfNights;
    const finalTotalAmount = totalAmount || (roomTotalPrice - (discount || 0));

    const bookingNumber = await generateBookingNumber();

    // إنشاء بيانات الحجز الجديد
    const newBookingData = {
        bookingNumber,
        customer: customerId,
        hotel: room.hotel._id,
        room: roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights,
        guestInfo: guestInfo || {
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phoneNumber
        },
        guestsCount: {
            adults: 1,
            children: 0,
            infants: 0
        },
        pricing: {
            roomBasePrice: room.price,
            roomTotalPrice,
            servicesTotalPrice: 0,
            subtotal: roomTotalPrice,
            discount: discount || 0,
            totalAmount: finalTotalAmount,
            currency: 'SAR'
        },
        payment: {
            paymentMethod: paymentMethodId,
            status: 'pending',
            paidAmount: 0,
            remainingAmount: finalTotalAmount
        },
        status: 'pending',
        notes: {
            staff: notes || ''
        }
    };
    // إنشاء الحجز الجديد
    const newBooking = new Booking(newBookingData);
    await newBooking.save();
console.log('Booking Number:', newBooking.bookingNumber);

    // تحديث حالة الغرفة إلى محجوزة
    await Room.findByIdAndUpdate(roomId, {
        status: 'booked',
        futureBooking: {
            isBooked: true,
            bookedFrom: checkIn,
            bookedTo: checkOut,
            bookingNote: `حجز رقم: ${newBooking.bookingNumber}`
        }
    });

    // جلب البيانات مع populate
    const populatedBooking = await Booking.findById(newBooking._id)
        .populate('customer', 'fullName email phoneNumber')
        .populate('room', 'numberRoom name price')
        .populate('hotel', 'name')
        .populate('payment.paymentMethod', 'name code');

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إضافة الحجز بنجاح',
        data: { booking: populatedBooking }
    });
});

/**
 * @desc    جلب جميع الحجوزات مع البحث والباجينيشن
 * @route   GET /api/admin/bookings
 * @access  Admin and above
 */
const getAllBookings = catchAsync(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status = '', 
        roomNumber = '',
        customerName = ''
    } = req.query;

    // بناء query للبحث
    let query = {};

    // البحث حسب الحالة
    if (status) {
        query.status = status;
    }

    // البحث المتقدم
    if (search || roomNumber || customerName) {
        const searchConditions = [];

        if (search) {
            searchConditions.push(
                { bookingNumber: { $regex: search, $options: 'i' } }
            );
        }

        if (roomNumber || customerName) {
            // سنحتاج للبحث في الجداول المرتبطة
            const roomQuery = roomNumber ? { numberRoom: { $regex: roomNumber, $options: 'i' } } : {};
            const customerQuery = customerName ? {
                fullName: { $regex: customerName, $options: 'i' }
            } : {};

            if (roomNumber) {
                const rooms = await Room.find(roomQuery).select('_id');
                const roomIds = rooms.map(room => room._id);
                searchConditions.push({ room: { $in: roomIds } });
            }

            if (customerName) {
                const customers = await User.find(customerQuery).select('_id');
                const customerIds = customers.map(customer => customer._id);
                searchConditions.push({ customer: { $in: customerIds } });
            }
        }

        if (searchConditions.length > 0) {
            query.$or = searchConditions;
        }
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        populate: [
            { path: 'customer', select: 'fullName email phoneNumber' },
            { path: 'room', select: 'numberRoom name price' },
            { path: 'hotel', select: 'name' },
            { path: 'payment.paymentMethod', select: 'name code' }
        ],
        sort: { createdAt: -1 }
    };

    const result = await paginate(Booking, query, options);

    // تنسيق البيانات حسب المطلوب
    const formattedBookings = result.data.map(booking => ({
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customer?.fullName || 'غير محدد',
        roomNumber: booking.room ? booking.room.numberRoom : 'غير محدد',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: booking.numberOfNights,
        status: booking.status,
        paymentMethod: booking.payment?.paymentMethod?.name?.ar ||
                      booking.payment?.paymentMethod?.name?.en || 'غير محدد',
        totalAmount: booking.pricing?.totalAmount || 0,
        discount: booking.pricing?.discount || 0,
        createdAt: booking.createdAt
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الحجوزات بنجاح',
        data: {
            count: result.pagination.totalCount,
            bookings: formattedBookings
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب حجز واحد بالمعرف
 * @route   GET /api/admin/bookings/:id
 * @access  Admin and above
 */
const getBookingById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const booking = await Booking.findById(id)
        .populate('customer', 'fullName email phoneNumber avatar')
        .populate('room', 'numberRoom name price type bedsCount images')
        .populate('hotel', 'name')
        .populate('payment.paymentMethod', 'name code');

    if (!booking) {
        throw new AppError('الحجز غير موجود', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الحجز بنجاح',
        data: { booking }
    });
});

/**
 * @desc    تحديث حجز
 * @route   PUT /api/admin/bookings/:id
 * @access  Admin and above
 */
const updateBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        checkInDate,
        checkOutDate,
        paymentMethodId,
        totalAmount,
        discount,
        status,
        guestInfo,
        notes
    } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
        throw new AppError('الحجز غير موجود', 404);
    }

    // التحقق من إمكانية التحديث
    if (booking.status === 'cancelled') {
        throw new AppError('لا يمكن تحديث حجز ملغي', 400);
    }

    // التحقق من توفر الغرفة في حالة تغيير التواريخ
    if (checkInDate || checkOutDate) {
        const newCheckIn = checkInDate || booking.checkInDate;
        const newCheckOut = checkOutDate || booking.checkOutDate;

        const availability = await checkRoomAvailability(booking.room, newCheckIn, newCheckOut, booking._id);
        if (!availability.isAvailable) {
            const conflictingDates = availability.conflictingBookings.map(booking => ({
                from: booking.checkInDate.toISOString().split('T')[0],
                to: booking.checkOutDate.toISOString().split('T')[0],
                bookingNumber: booking.bookingNumber
            }));

            throw new AppError(
                `الغرفة محجوزة في الفترات التالية: ${conflictingDates.map(d => `من ${d.from} إلى ${d.to} (حجز رقم: ${d.bookingNumber})`).join(', ')}`,
                400
            );
        }
    }

    // إعداد بيانات التحديث
    const updateData = {};

    if (checkInDate) updateData.checkInDate = new Date(checkInDate);
    if (checkOutDate) updateData.checkOutDate = new Date(checkOutDate);
    if (status) updateData.status = status;
    if (guestInfo) updateData.guestInfo = { ...booking.guestInfo, ...guestInfo };
    if (notes) updateData['notes.staff'] = notes;

    // تحديث معلومات الدفع
    if (paymentMethodId) {
        const paymentMethod = await PaymentMethod.findById(paymentMethodId);
        if (!paymentMethod) {
            throw new AppError('طريقة الدفع المحددة غير موجودة', 404);
        }
        updateData['payment.paymentMethod'] = paymentMethodId;
    }

    // إعادة حساب السعر إذا تغيرت التواريخ
    if (checkInDate || checkOutDate || totalAmount !== undefined || discount !== undefined) {
        const checkIn = new Date(checkInDate || booking.checkInDate);
        const checkOut = new Date(checkOutDate || booking.checkOutDate);
        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (numberOfNights <= 0) {
            throw new AppError('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول', 400);
        }

        const room = await Room.findById(booking.room);
        const roomTotalPrice = room.price * numberOfNights;
        const finalDiscount = discount !== undefined ? discount : booking.pricing.discount;
        const finalTotalAmount = totalAmount !== undefined ? totalAmount : (roomTotalPrice - finalDiscount);

        updateData.numberOfNights = numberOfNights;
        updateData['pricing.roomTotalPrice'] = roomTotalPrice;
        updateData['pricing.discount'] = finalDiscount;
        updateData['pricing.totalAmount'] = finalTotalAmount;
        updateData['payment.remainingAmount'] = finalTotalAmount - booking.payment.paidAmount;
    }

    // تحديث تاريخ آخر تعديل
    updateData['timestamps.lastModifiedAt'] = new Date();

    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('customer', 'fullName email phoneNumber')
     .populate('room', 'numberRoom name price')
     .populate('hotel', 'name')
     .populate('payment.paymentMethod', 'name code');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث الحجز بنجاح',
        data: { booking: updatedBooking }
    });
});

/**
 * @desc    حذف حجز (تغيير الحالة إلى ملغي)
 * @route   DELETE /api/admin/bookings/:id
 * @access  Admin and above
 */
const deleteBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
        throw new AppError('الحجز غير موجود', 404);
    }

    // التحقق من إمكانية الإلغاء
    if (booking.status === 'cancelled') {
        throw new AppError('الحجز ملغي مسبقاً', 400);
    }

    if (booking.status === 'checked_out') {
        throw new AppError('لا يمكن إلغاء حجز مكتمل', 400);
    }

    // حساب مبلغ الاسترداد
    const refundAmount = booking.calculateRefundAmount();

    // تحديث الحجز
    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        {
            $set: {
                status: 'cancelled',
                'cancellation.isCancelled': true,
                'cancellation.cancelledAt': new Date(),
                'cancellation.cancelledBy': req.decoded?.id,
                'cancellation.reason': reason || 'تم الإلغاء من لوحة التحكم',
                'cancellation.refundAmount': refundAmount,
                'cancellation.refundStatus': refundAmount > 0 ? 'pending' : 'not_required',
                'timestamps.lastModifiedAt': new Date()
            }
        },
        { new: true }
    ).populate('customer', 'fullName email phoneNumber')
     .populate('room', 'numberRoom name')
     .populate('hotel', 'name');

    // تحديث حالة الغرفة إلى متاحة
    await Room.findByIdAndUpdate(booking.room, {
        status: 'available',
        'futureBooking.isBooked': false,
        'futureBooking.bookedFrom': null,
        'futureBooking.bookedTo': null,
        'futureBooking.bookingNote': ''
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم إلغاء الحجز بنجاح',
        data: {
            booking: updatedBooking,
            refundAmount,
            refundStatus: refundAmount > 0 ? 'معلق' : 'غير مطلوب'
        }
    });
});

module.exports = {
    addBooking,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
    checkRoomAvailability
};
