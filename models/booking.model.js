const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { validationMessages } = require('../utils/errorHandler');

const bookingSchema = new mongoose.Schema({
    // رقم الحجز (فريد)
    bookingNumber: {
        type: String,
        unique: true,
        required: [true, 'رقم الحجز مطلوب'],
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'العميل مطلوب']
    },
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: [true, 'الفندق مطلوب']
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'الغرفة مطلوبة']
    },
    checkInDate: {
        type: Date,
        required: [true, 'تاريخ الوصول مطلوب']
    },
    checkOutDate: {
        type: Date,
        required: [true, 'تاريخ المغادرة مطلوب']
    },
    numberOfNights: {
        type: Number,
        required: [true, 'عدد الليالي مطلوب']
    },
    guestInfo: {
        fullName: { type: String },
        email: { type: String },
        phone: { type: String },
        nationality: { type: String },
        idNumber: { type: String }
    },
    guestsCount: {
        adults: { type: Number, default: 1 },
        children: { type: Number, default: 0 },
        infants: { type: Number, default: 0 }
    },
    pricing: {
        roomBasePrice: { type: Number },
        roomTotalPrice: { type: Number },
        servicesTotalPrice: { type: Number },
        subtotal: { type: Number },
        discount: { type: Number },
        totalAmount: { type: Number },
        currency: { type: String }
    },
    payment: {
        paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
        status: { type: String, default: 'pending' },
        paidAmount: { type: Number, default: 0 },
        remainingAmount: { type: Number },
        notes: { type: String, trim: true }
    },
    status: {
        type: String,
        required: [true, 'حالة الحجز مطلوبة'],
        default: 'pending',
        enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']
    },
    notes: {
        staff: { type: String }
    },
    timestamps: {
        lastModifiedAt: { type: Date },
        bookedAt: { type: Date }
    },
    cancellation: {
        isCancelled: { type: Boolean, default: false },
        cancelledAt: { type: Date },
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        refundAmount: { type: Number },
        refundStatus: { type: String }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// الفهارس
bookingSchema.index({ customer: 1 });
bookingSchema.index({ hotel: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkInDate: 1 });
bookingSchema.index({ checkOutDate: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ 'guestInfo.email': 1 });
bookingSchema.index({ 'guestInfo.phone': 1 });
bookingSchema.index({ 'timestamps.bookedAt': -1 });

// Virtual للحصول على إجمالي عدد النزلاء
bookingSchema.virtual('totalGuests').get(function() {
    return this.guestsCount.adults + this.guestsCount.children + this.guestsCount.infants;
});

// Middleware لحساب عدد الليالي قبل الحفظ
bookingSchema.pre('save', function(next) {
    if (this.checkInDate && this.checkOutDate) {
        const timeDiff = this.checkOutDate.getTime() - this.checkInDate.getTime();
        this.numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    this.timestamps.lastModifiedAt = new Date();
    next();
});

// Middleware لتحديث حالة الغرفة عند تغيير حالة الحجز
bookingSchema.post('save', async function(doc) {
    try {
        const Room = mongoose.model('Room');
        
        // إذا كان الحجز جديد أو تم تغيير حالته
        if (this.isNew || this.isModified('status')) {
            const room = await Room.findById(this.room);
            if (!room) return;
            
            let roomStatus = 'Available';
            let futureBooking = {
                isBooked: false,
                bookedFrom: null,
                bookedTo: null,
                bookingNote: ''
            };
            
            // تحديد حالة الغرفة بناءً على حالة الحجز
            switch (this.status) {
                case 'pending':
                case 'confirmed':
                case 'checked_in':
                    roomStatus = 'Reserved';
                    futureBooking = {
                        isBooked: true,
                        bookedFrom: this.checkInDate,
                        bookedTo: this.checkOutDate,
                        bookingNote: `حجز رقم: ${this.bookingNumber}`
                    };
                    break;
                case 'checked_out':
                case 'cancelled':
                case 'no_show':
                    // التحقق من وجود حجوزات أخرى نشطة للغرفة
                    const activeBookings = await this.constructor.find({
                        room: this.room,
                        status: { $in: ['pending', 'confirmed', 'checked_in'] },
                        _id: { $ne: this._id }
                    }).sort({ checkInDate: 1 });
                    
                    if (activeBookings.length > 0) {
                        const nextBooking = activeBookings[0];
                        roomStatus = 'Reserved';
                        futureBooking = {
                            isBooked: true,
                            bookedFrom: nextBooking.checkInDate,
                            bookedTo: nextBooking.checkOutDate,
                            bookingNote: `حجز رقم: ${nextBooking.bookingNumber}`
                        };
                    }
                    break;
            }
            
            // تحديث الغرفة
            await Room.findByIdAndUpdate(this.room, {
                status: roomStatus,
                futureBooking: futureBooking
            });
        }
    } catch (error) {
        console.error('خطأ في تحديث حالة الغرفة:', error);
    }
});

// Middleware لتوليد رقم حجز فريد (النسخة المحسنة)
bookingSchema.pre('save', async function(next) {
    if (!this.isNew || this.bookingNumber) return next();
    
    if (!this.bookingNumber) {
        try {
            // المحاولة الأولى: النظام الأساسي (التاريخ + تسلسل)
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            
            const lastBooking = await this.constructor.findOne(
                { bookingNumber: new RegExp(`^RES-${year}${month}${day}`) },
                { bookingNumber: 1 },
                { sort: { bookingNumber: -1 } }
            ).maxTimeMS(10000); // زيادة المهلة
            
            let sequence = 1;
            if (lastBooking?.bookingNumber) {
                const lastSeq = parseInt(lastBooking.bookingNumber.slice(-4)) || 0;
                sequence = lastSeq < 9999 ? lastSeq + 1 : 1;
            }
            
            this.bookingNumber = `RES-${year}${month}${day}-${sequence.toString().padStart(4, '0')}`;
            
        } catch (error) {
            console.error('فشل في توليد رقم الحجز بالنظام الأساسي:', error);
            
            // المحاولة الثانية: UUID كاحتياطي
            try {
                this.bookingNumber = `RES-${uuidv4().replace(/-/g, '').substr(0, 8).toUpperCase()}`;
                console.log('تم استخدام النظام الاحتياطي لتوليد الرقم:', this.bookingNumber);
            } catch (fallbackError) {
                console.error('فشل في النظام الاحتياطي:', fallbackError);
                throw new Error('فشل في توليد رقم الحجز');
            }
        }
    }
    next();
});

// Methods المساعدة (تبقى كما هي)
bookingSchema.methods.canBeCancelled = function() {
    const now = new Date();
    const checkIn = new Date(this.checkInDate);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);
    
    return ['pending', 'confirmed'].includes(this.status) && hoursUntilCheckIn > 24;
};

// Method لتحديث حالة الغرفة
bookingSchema.methods.updateRoomStatus = async function() {
    try {
        const Room = mongoose.model('Room');
        const room = await Room.findById(this.room);
        if (!room) return;
        
        let roomStatus = 'Available';
        let futureBooking = {
            isBooked: false,
            bookedFrom: null,
            bookedTo: null,
            bookingNote: ''
        };
        
        // تحديد حالة الغرفة بناءً على حالة الحجز
        switch (this.status) {
            case 'pending':
            case 'confirmed':
            case 'checked_in':
                roomStatus = 'Reserved';
                futureBooking = {
                    isBooked: true,
                    bookedFrom: this.checkInDate,
                    bookedTo: this.checkOutDate,
                    bookingNote: `حجز رقم: ${this.bookingNumber}`
                };
                break;
            case 'checked_out':
            case 'cancelled':
            case 'no_show':
                // التحقق من وجود حجوزات أخرى نشطة للغرفة
                const activeBookings = await this.constructor.find({
                    room: this.room,
                    status: { $in: ['pending', 'confirmed', 'checked_in'] },
                    _id: { $ne: this._id }
                }).sort({ checkInDate: 1 });
                
                if (activeBookings.length > 0) {
                    const nextBooking = activeBookings[0];
                    roomStatus = 'Reserved';
                    futureBooking = {
                        isBooked: true,
                        bookedFrom: nextBooking.checkInDate,
                        bookedTo: nextBooking.checkOutDate,
                        bookingNote: `حجز رقم: ${nextBooking.bookingNumber}`
                    };
                }
                break;
        }
        
        // تحديث الغرفة
        await Room.findByIdAndUpdate(this.room, {
            status: roomStatus,
            futureBooking: futureBooking
        });
        
        console.log(`✅ تم تحديث حالة الغرفة ${room.numberRoom} إلى ${roomStatus}`);
        
    } catch (error) {
        console.error('خطأ في تحديث حالة الغرفة:', error);
    }
};

bookingSchema.methods.calculateRefundAmount = function() {
    const now = new Date();
    const checkIn = new Date(this.checkInDate);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);
    
    if (hoursUntilCheckIn > 48) {
        return this.pricing.totalAmount;
    } else if (hoursUntilCheckIn > 24) {
        return this.pricing.totalAmount * 0.5;
    } else {
        return 0;
    }
};

bookingSchema.methods.getPaymentStatus = function() {
    if (this.payment.paidAmount >= this.pricing.totalAmount) {
        return 'paid_in_full';
    } else if (this.payment.paidAmount > 0) {
        return 'partially_paid';
    } else {
        return 'unpaid';
    }
};

module.exports = mongoose.model('Booking', bookingSchema);