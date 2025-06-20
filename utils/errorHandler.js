const httpStatusText = require('./httpStatusText');

// Custom Error Class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? httpStatusText.FAIL : httpStatusText.ERROR;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// MongoDB Validation Error Handler
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `بيانات غير صحيحة: ${errors.join('. ')}`;
    return new AppError(message, 400);
};

// MongoDB Duplicate Key Error Handler
const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'قيمة مكررة';
    const message = `هذه القيمة موجودة مسبقاً: ${value}. يرجى استخدام قيمة أخرى!`;
    return new AppError(message, 400);
};

// MongoDB Cast Error Handler
const handleCastErrorDB = (err) => {
    const message = `معرف غير صحيح: ${err.value}`;
    return new AppError(message, 400);
};

// JWT Error Handlers
const handleJWTError = () =>
    new AppError('رمز التوثيق غير صحيح. يرجى تسجيل الدخول مرة أخرى!', 401);

const handleJWTExpiredError = () =>
    new AppError('انتهت صلاحية رمز التوثيق. يرجى تسجيل الدخول مرة أخرى!', 401);

// Send Error in Development
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

// Send Error in Production
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: httpStatusText.ERROR,
            message: 'حدث خطأ ما!'
        });
    }
};

// Global Error Handler Middleware
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || httpStatusText.ERROR;

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific MongoDB errors
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

// Async Error Catcher
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Validation Error Messages in Arabic
const validationMessages = {
    required: 'هذا الحقل مطلوب',
    email: 'يرجى إدخال بريد إلكتروني صحيح',
    minlength: 'يجب أن يكون الحد الأدنى {MINLENGTH} أحرف',
    maxlength: 'يجب أن لا يتجاوز {MAXLENGTH} حرف',
    min: 'يجب أن تكون القيمة أكبر من أو تساوي {MIN}',
    max: 'يجب أن تكون القيمة أقل من أو تساوي {MAX}',
    unique: 'هذه القيمة موجودة مسبقاً',
    enum: 'القيمة المدخلة غير مسموحة',
    match: 'تنسيق البيانات غير صحيح'
};

module.exports = {
    AppError,
    globalErrorHandler,
    catchAsync,
    validationMessages
};
