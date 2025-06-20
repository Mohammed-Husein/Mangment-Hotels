const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
        return res.status(401).json({
            status: 'fail',
            message: 'رمز الوصول مطلوب'
        });
    }

    const token = authHeader.split(' ')[1]; // تصحيح الخطأ في split
    if (!token) {
        return res.status(401).json({
            status: 'fail',
            message: 'رمز الوصول غير صحيح'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.decoded = decoded;

        // إضافة معلومات إضافية للطلب
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            userType: decoded['user-type'] || 'User' // افتراضياً مستخدم عادي
        };

        console.log('Token verified for:', {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            userType: decoded['user-type']
        });

        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        return res.status(401).json({
            status: 'fail',
            message: 'رمز الوصول غير صحيح أو منتهي الصلاحية'
        });
    }
};

module.exports = verifyToken;