const userRole = {
    ADMIN: 'ADMIN',                    // مدير النظام - صلاحية كاملة
    RECEPTIONIST: 'RECEPTIONIST',      // موظف استقبال - إدارة الحجوزات اليومية
    CUSTOMER: 'CUSTOMER'               // عميل - إجراء الحجوزات فقط
};

module.exports = userRole;