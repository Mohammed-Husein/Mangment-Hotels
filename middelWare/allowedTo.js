
module.exports = (...roles) => {
  return (req, res, next) => {
    // التحقق من وجود decoded object و role
    if (!req.decoded || !req.decoded.role) {
      return res.status(403).json({
        status: 'fail',
        message: 'لم يتم توفير معلومات الصلاحية'
      });
    }

    // التحقق من نوع المستخدم (موظف أم مستخدم عادي)
    const userType = req.decoded['user-type'] || 'User';

    // إذا كان المطلوب صلاحيات موظف ولكن المستخدم عادي
    const employeeRoles = ['SuperAdmin', 'Admin', 'Manager', 'Receptionist', 'Supervisor', 'Worker'];
    const isEmployeeRole = roles.some(role => employeeRoles.includes(role));

    if (isEmployeeRole && userType !== 'Employee') {
      console.error(`محاولة وصول من مستخدم عادي إلى منطقة الموظفين: ${req.decoded.email}`);
      return res.status(403).json({
        status: 'fail',
        message: 'هذه المنطقة مخصصة للموظفين فقط'
      });
    }

    // التحقق من أن الدور مسموح به
    if (!roles.includes(req.decoded.role)) {
      console.error(`محاولة وصول غير مصرح بها من دور: ${req.decoded.role}, نوع المستخدم: ${userType}`);
      return res.status(403).json({
        status: 'fail',
        message: 'غير مصرح لك بالوصول إلى هذه العملية'
      });
    }

    // إذا كان الدور مسموحاً به، انتقل إلى Middleware التالي
    next();
  };
};