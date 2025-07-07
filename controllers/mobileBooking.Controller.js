const { Booking, User, Room, PaymentMethod } = require('../models');
const { catchAsync, AppError } = require('../utils/errorHandler');
const httpStatusText = require('../utils/httpStatusText');
const { paginate ,generateBookingNumber} = require('../utils/pagination');

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
 * @desc    إيجاد أقرب تاريخ متاح للحجز
 */
const findNextAvailableDate = async (roomId, requestedCheckIn, requestedCheckOut) => {
    const checkIn = new Date(requestedCheckIn);
    const checkOut = new Date(requestedCheckOut);
    const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));

    // جلب جميع الحجوزات المستقبلية للغرفة
    const futureBookings = await Booking.find({
        room: roomId,
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        checkOutDate: { $gte: new Date() }
    }).sort({ checkInDate: 1 });

    if (futureBookings.length === 0) {
        return checkIn; // الغرفة متاحة من التاريخ المطلوب
    }

    // البحث عن أول فترة متاحة
    let currentDate = new Date(Math.max(checkIn.getTime(), new Date().getTime()));

    for (let booking of futureBookings) {
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);

        // التحقق من وجود فجوة كافية قبل هذا الحجز
        const daysBetween = Math.ceil((bookingStart.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));

        if (daysBetween >= numberOfNights) {
            return currentDate;
        }

        // الانتقال إلى ما بعد هذا الحجز
        currentDate = new Date(bookingEnd.getTime());
    }

    // إذا لم نجد فترة متاحة، نعيد التاريخ بعد آخر حجز
    return currentDate;
};

/**
 * @desc    حجز غرفة (للموبايل)
 * @route   POST /api/mobile/bookings
 * @access  Customer
 */
const bookRoom = catchAsync(async (req, res) => {
    const {
        roomId,
        checkInDate,
        checkOutDate,
        paymentMethodId,
        totalAmount,
        discount,
        guestInfo,
        notes
    } = req.body;

    const customerId = req.decoded.id; // من التوكن

    // التحقق من وجود العميل
    const customer = await User.findById(customerId);
    if (!customer) {
        throw new AppError('العميل غير موجود', 404);
    }

    // التحقق من وجود الغرفة
    const room = await Room.findById(roomId).populate('hotel');
    if (!room) {
        throw new AppError('الغرفة المحددة غير موجودة', 404);
    }

    // التحقق من توفر الغرفة في الفترة المطلوبة
    const availability = await checkRoomAvailability(roomId, checkInDate, checkOutDate);
    if (!availability.isAvailable) {
        // إيجاد أقرب تاريخ متاح
        const nextAvailableDate = await findNextAvailableDate(roomId, checkInDate, checkOutDate);
        const nextAvailableDateStr = nextAvailableDate.toISOString().split('T')[0];

        const conflictingDates = availability.conflictingBookings.map(booking => ({
            from: booking.checkInDate.toISOString().split('T')[0],
            to: booking.checkOutDate.toISOString().split('T')[0],
            bookingNumber: booking.bookingNumber
        }));

        throw new AppError(
            `الغرفة محجوزة في الفترات التالية: ${conflictingDates.map(d => `من ${d.from} إلى ${d.to}`).join(', ')}. يمكنك حجز الغرفة من بعد تاريخ ${nextAvailableDateStr}`,
            400
        );
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
            customer: notes || ''
        }
    };

    // إنشاء الحجز الجديد
    const newBooking = new Booking(newBookingData);
    await newBooking.save();

    // تحديث حالة الغرفة إلى محجوزة
    await Room.findByIdAndUpdate(roomId, {
        status: 'Reserved',
        futureBooking: {
            isBooked: true,
            bookedFrom: checkIn,
            bookedTo: checkOut,
            bookingNote: `حجز رقم: ${newBooking.bookingNumber}`
        }
    });

    // جلب البيانات مع populate
    const populatedBooking = await Booking.findById(newBooking._id)
        .populate('room', 'numberRoom name price type images')
        .populate('hotel', 'name')
        .populate('payment.paymentMethod', 'name code');

    res.status(201).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حجز الغرفة بنجاح',
        data: { booking: populatedBooking }
    });
});

/**
 * @desc    إلغاء حجز
 * @route   PUT /api/mobile/bookings/:id/cancel
 * @access  Customer
 */
const cancelBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const customerId = req.decoded.id;

    const booking = await Booking.findOne({ _id: id, customer: customerId });
    if (!booking) {
        throw new AppError('الحجز غير موجود أو لا تملك صلاحية للوصول إليه', 404);
    }

    // التحقق من إمكانية الإلغاء
    if (!booking.canBeCancelled()) {
        throw new AppError('لا يمكن إلغاء هذا الحجز في الوقت الحالي', 400);
    }

    // حساب مبلغ الاسترداد
    const refundAmount = booking.calculateRefundAmount();

    // تحديث الحجز
    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        {
            $set: {
                status: 'ملغي',
                'cancellation.isCancelled': true,
                'cancellation.cancelledAt': new Date(),
                'cancellation.cancelledBy': customerId,
                'cancellation.reason': reason || 'تم الإلغاء من قبل العميل',
                'cancellation.refundAmount': refundAmount,
                'cancellation.refundStatus': refundAmount > 0 ? 'معلق' : 'غير مطلوب',
                'timestamps.lastModifiedAt': new Date()
            }
        },
        { new: true }
    ).populate('room', 'numberRoom name price type images')
     .populate('hotel', 'name')
     .populate('payment.paymentMethod', 'name code');

    // تحديث حالة الغرفة إلى متاحة
    await Room.findByIdAndUpdate(booking.room, {
        status: 'متاحة',
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

/**
 * @desc    جلب جميع حجوزات المستخدم
 * @route   GET /api/mobile/bookings/my-bookings
 * @access  Customer
 */
const getAllBookingsByUserId = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status = '' } = req.query;
    const customerId = req.decoded.id;

    // بناء query للبحث
    let query = { customer: customerId };

    // البحث حسب الحالة
    if (status) {
        query.status = status;
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        populate: [
            { path: 'room', select: 'numberRoom name price type images bedsCount' },
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
        room: {
            id: booking.room?._id,
            number: booking.room?.numberRoom,
            name: booking.room?.name,
            type: booking.room?.type,
            price: booking.room?.price,
            images: booking.room?.images || [],
            bedsCount: booking.room?.bedsCount
        },
        hotel: {
            id: booking.hotel?._id,
            name: booking.hotel?.name
        },
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: booking.numberOfNights,
        status: booking.status,
        paymentMethod: booking.payment?.paymentMethod?.name || 'غير محدد',
        totalAmount: booking.pricing?.totalAmount || 0,
        discount: booking.pricing?.discount || 0,
        paidAmount: booking.payment?.paidAmount || 0,
        remainingAmount: booking.payment?.remainingAmount || 0,
        canBeCancelled: booking.canBeCancelled(),
        createdAt: booking.createdAt
    }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب حجوزاتك بنجاح',
        data: {
            count: result.pagination.totalCount,
            bookings: formattedBookings
        },
        pagination: result.pagination
    });
});

/**
 * @desc    جلب حجز واحد بالمعرف
 * @route   GET /api/mobile/bookings/:id
 * @access  Customer
 */
const getBookingById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const customerId = req.decoded.id;

    const booking = await Booking.findOne({ _id: id, customer: customerId })
        .populate('room', 'numberRoom name price type images bedsCount')
        .populate('hotel', 'name')
        .populate('payment.paymentMethod', 'name code');

    if (!booking) {
        throw new AppError('الحجز غير موجود أو لا تملك صلاحية للوصول إليه', 404);
    }

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم جلب الحجز بنجاح',
        data: { booking }
    });
});

/**
 * @desc    تعديل حجز
 * @route   PUT /api/mobile/bookings/:id
 * @access  Customer
 */
const updateBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        checkInDate,
        checkOutDate,
        paymentMethodId,
        guestInfo,
        notes
    } = req.body;
    const customerId = req.decoded.id;

    const booking = await Booking.findOne({ _id: id, customer: customerId });
    if (!booking) {
        throw new AppError('الحجز غير موجود أو لا تملك صلاحية للوصول إليه', 404);
    }

    // التحقق من إمكانية التحديث
    if (booking.status === 'cancelled') {
        throw new AppError('لا يمكن تحديث حجز ملغي', 400);
    }

    if (booking.status === 'checked_out') {
        throw new AppError('لا يمكن تحديث حجز مكتمل', 400);
    }

    // إعداد بيانات التحديث
    const updateData = {};

    if (checkInDate) updateData.checkInDate = new Date(checkInDate);
    if (checkOutDate) updateData.checkOutDate = new Date(checkOutDate);
    if (guestInfo) updateData.guestInfo = { ...booking.guestInfo, ...guestInfo };
    if (notes) updateData['notes.customer'] = notes;

    // تحديث معلومات الدفع
    if (paymentMethodId) {
        const paymentMethod = await PaymentMethod.findById(paymentMethodId);
        if (!paymentMethod) {
            throw new AppError('طريقة الدفع المحددة غير موجودة', 404);
        }
        updateData['payment.paymentMethod'] = paymentMethodId;
    }

    // التحقق من توفر الغرفة في حالة تغيير التواريخ
    if (checkInDate || checkOutDate) {
        const newCheckIn = checkInDate || booking.checkInDate;
        const newCheckOut = checkOutDate || booking.checkOutDate;

        const availability = await checkRoomAvailability(booking.room, newCheckIn, newCheckOut, booking._id);
        if (!availability.isAvailable) {
            // إيجاد أقرب تاريخ متاح
            const nextAvailableDate = await findNextAvailableDate(booking.room, newCheckIn, newCheckOut);
            const nextAvailableDateStr = nextAvailableDate.toISOString().split('T')[0];

            const conflictingDates = availability.conflictingBookings.map(booking => ({
                from: booking.checkInDate.toISOString().split('T')[0],
                to: booking.checkOutDate.toISOString().split('T')[0],
                bookingNumber: booking.bookingNumber
            }));

            throw new AppError(
                `الغرفة محجوزة في الفترات التالية: ${conflictingDates.map(d => `من ${d.from} إلى ${d.to}`).join(', ')}. يمكنك تعديل حجزك ليبدأ من بعد تاريخ ${nextAvailableDateStr}`,
                400
            );
        }
    }

    // إعادة حساب السعر إذا تغيرت التواريخ
    if (checkInDate || checkOutDate) {
        const checkIn = new Date(checkInDate || booking.checkInDate);
        const checkOut = new Date(checkOutDate || booking.checkOutDate);
        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (numberOfNights <= 0) {
            throw new AppError('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول', 400);
        }

        const room = await Room.findById(booking.room);
        const roomTotalPrice = room.price * numberOfNights;
        const finalTotalAmount = roomTotalPrice - booking.pricing.discount;

        updateData.numberOfNights = numberOfNights;
        updateData['pricing.roomTotalPrice'] = roomTotalPrice;
        updateData['pricing.totalAmount'] = finalTotalAmount;
        updateData['payment.remainingAmount'] = finalTotalAmount - booking.payment.paidAmount;

        // تحديث تواريخ الحجز في الغرفة
        await Room.findByIdAndUpdate(booking.room, {
            'futureBooking.bookedFrom': checkIn,
            'futureBooking.bookedTo': checkOut
        });
    }

    // تحديث تاريخ آخر تعديل
    updateData['timestamps.lastModifiedAt'] = new Date();

    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('room', 'numberRoom name price type images bedsCount')
     .populate('hotel', 'name')
     .populate('payment.paymentMethod', 'name code');

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم تحديث الحجز بنجاح',
        data: { booking: updatedBooking }
    });
});

/**
 * @desc    حذف حجز
 * @route   DELETE /api/mobile/bookings/:id
 * @access  Customer
 */
const deleteBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const customerId = req.decoded.id;

    const booking = await Booking.findOne({ _id: id, customer: customerId });
    if (!booking) {
        throw new AppError('الحجز غير موجود أو لا تملك صلاحية للوصول إليه', 404);
    }

    // التحقق من إمكانية الحذف
    if (!booking.canBeCancelled()) {
        throw new AppError('لا يمكن حذف هذا الحجز في الوقت الحالي', 400);
    }

    // حساب مبلغ الاسترداد
    const refundAmount = booking.calculateRefundAmount();

    // تحديث الحجز
    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        {
            $set: {
                status: 'ملغي',
                'cancellation.isCancelled': true,
                'cancellation.cancelledAt': new Date(),
                'cancellation.cancelledBy': customerId,
                'cancellation.reason': reason || 'تم الحذف من قبل العميل',
                'cancellation.refundAmount': refundAmount,
                'cancellation.refundStatus': refundAmount > 0 ? 'معلق' : 'غير مطلوب',
                'timestamps.lastModifiedAt': new Date()
            }
        },
        { new: true }
    ).populate('room', 'numberRoom name price type images')
     .populate('hotel', 'name');

    // تحديث حالة الغرفة إلى متاحة
    await Room.findByIdAndUpdate(booking.room, {
        status: 'Available',
        'futureBooking.isBooked': false,
        'futureBooking.bookedFrom': null,
        'futureBooking.bookedTo': null,
        'futureBooking.bookingNote': ''
    });

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'تم حذف الحجز بنجاح',
        data: {
            booking: updatedBooking,
            refundAmount,
            refundStatus: refundAmount > 0 ? 'معلق' : 'غير مطلوب'
        }
    });
});

module.exports = {
    bookRoom,
    cancelBooking,
    getAllBookingsByUserId,
    getBookingById,
    updateBooking,
    deleteBooking
};
