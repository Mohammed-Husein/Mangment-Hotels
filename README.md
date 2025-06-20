# نظام إدارة حجوزات الفنادق 🏨

نظام شامل لإدارة حجوزات الفنادق مع دعم لوحة التحكم وتطبيق الموبايل، مبني باستخدام Node.js و MongoDB.

## 🌟 الميزات الرئيسية

### ✅ نظام إدارة المستخدمين
- **لوحة التحكم**: إدارة كاملة للمستخدمين مع صلاحيات متدرجة
- **تطبيق الموبايل**: تسجيل وإدارة الحسابات للعملاء
- **نظام الأدوار**: مدير، موظف استقبال، عميل
- **المصادقة الآمنة**: JWT مع refresh tokens
- **الباجينيشن والبحث**: عرض 8 مستخدمين بالصفحة مع إمكانية البحث والفلترة

### 🗂️ قاعدة البيانات المتقدمة
- **نماذج شاملة**: مستخدمين، بلدان، محافظات، مناطق، فنادق، غرف، خدمات، حجوزات
- **العلاقات المحكمة**: ربط منطقي بين جميع الكيانات
- **دعم متعدد اللغات**: العربية والإنجليزية
- **التحقق الشامل**: validation متقدم لجميع البيانات

### 🔐 الأمان والحماية
- **تشفير كلمات المرور**: bcrypt مع salt rounds عالي
- **نظام الصلاحيات**: RBAC (Role-Based Access Control)
- **معالجة الأخطاء**: نظام شامل لمعالجة الأخطاء باللغة العربية
- **التحقق من البيانات**: express-validator مع رسائل مخصصة

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js (الإصدار 14 أو أحدث)
- MongoDB (محلي أو Atlas)
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/your-username/hotel-reservations-management.git
cd hotel-reservations-management
```

2. **تثبيت التبعيات**
```bash
npm install
# أو
yarn install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
# قم بتعديل ملف .env حسب بيئتك
```

4. **تشغيل بذور البيانات**
```bash
npm run seed
```

5. **تشغيل الخادم**
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

6. **اختبار النظام**
```bash
npm run test
```

## 📚 التوثيق

### API Documentation
- **الوثائق الكاملة**: [USER_MANAGEMENT_API.md](./USER_MANAGEMENT_API.md)
- **التوابع الجديدة**: [NEW_USER_FUNCTIONS.md](./NEW_USER_FUNCTIONS.md) 🆕
- **نماذج قاعدة البيانات**: [DATABASE_MODELS.md](./DATABASE_MODELS.md)

### الروابط المهمة
- **API الرئيسي**: `http://localhost:5001/api`
- **لوحة التحكم**: `http://localhost:5001/api/admin`
- **تطبيق الموبايل**: `http://localhost:5001/api/mobile`

## 🛠️ هيكل المشروع

```
hotel-reservations-management/
├── controllers/           # منطق التحكم
│   └── user.Controller.js
├── models/               # نماذج قاعدة البيانات
│   ├── user.model.js
│   ├── country.model.js
│   ├── governorate.model.js
│   ├── region.model.js
│   ├── hotel.model.js
│   ├── room.model.js
│   ├── service.model.js
│   ├── booking.model.js
│   └── index.js
├── routes/               # مسارات API
│   ├── admin/
│   │   └── users.route.js
│   ├── mobile/
│   │   └── auth.route.js
│   └── index.js
├── middelWare/           # الوسطاء
│   ├── verifyToken.js
│   ├── allowedTo.js
│   ├── validationSchemma.js
│   └── userValidation.js
├── utils/                # الأدوات المساعدة
│   ├── errorHandler.js
│   ├── pagination.js
│   ├── seedData.js
│   ├── genirate_JWT.js
│   ├── httpStatusText.js
│   └── user-role.js
├── scripts/              # سكريبتات التشغيل
│   └── seedDatabase.js
├── test/                 # الاختبارات
│   └── userAPI.test.js
├── uploads/              # ملفات الرفع
└── index.js              # نقطة البداية
```

## 🔧 الاستخدام

### بيانات المدير الافتراضي
```
البريد الإلكتروني: admin@hotel.com
كلمة المرور: admin123456
```

### أمثلة على الاستخدام

#### تسجيل مستخدم جديد (موبايل)
```javascript
POST /api/mobile/auth/register
{
  "fullName": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "+966501234567",
  "password": "Password123",
  "preferredLanguage": "ar"
}
```

#### جلب المستخدمين مع الباجينيشن (لوحة التحكم)
```javascript
GET /api/admin/users?page=1&limit=8&sortBy=fullName&sortOrder=asc&search=أحمد&isActive=true
Authorization: Bearer {access_token}
```

#### جلب أسماء المستخدمين فقط 🆕
```javascript
GET /api/admin/users/names?role=CUSTOMER&isActive=true
Authorization: Bearer {access_token}
```

#### حظر مستخدم مع السبب 🆕
```javascript
PUT /api/admin/users/{userId}/change-status
Authorization: Bearer {access_token}
{
  "isActive": false,
  "reason": "مخالفة شروط الاستخدام"
}
```

#### تحديث الملف الشخصي (موبايل)
```javascript
PUT /api/mobile/auth/profile
Authorization: Bearer {access_token}
{
  "fullName": "أحمد محمد المحدث",
  "phone": "+966509876543"
}
```

## 🧪 الاختبارات

### تشغيل الاختبارات
```bash
# اختبار نظام المستخدمين الأساسي
npm run test:users

# اختبار التوابع الجديدة 🆕
npm run test:new

# جميع الاختبارات
npm run test:all
```

### الاختبارات المتاحة
#### الاختبارات الأساسية
- ✅ تسجيل دخول المدير
- ✅ تسجيل مستخدم جديد
- ✅ جلب المستخدمين مع الباجينيشن
- ✅ إضافة مستخدم من لوحة التحكم
- ✅ تحديث الملف الشخصي
- ✅ تحديث رمز الوصول
- ✅ الحصول على الملف الشخصي

#### الاختبارات الجديدة 🆕
- ✅ اختبار GetUserById
- ✅ اختبار UpdateUser المحسن
- ✅ اختبار GetAllUserNames مع الفلاتر
- ✅ اختبار ChangeStatus (حظر/إلغاء حظر)

## 📊 الميزات المطبقة

### ✅ نظام المستخدمين (مكتمل)
- [x] getAllUsers - جلب جميع المستخدمين مع الباجينيشن
- [x] addUser - إضافة مستخدم من لوحة التحكم
- [x] register - تسجيل مستخدم من الموبايل
- [x] login - تسجيل الدخول مع JWT
- [x] refreshToken - تحديث رمز الوصول
- [x] getUser - جلب مستخدم واحد
- [x] **getUserById** - جلب مستخدم بالمعرف مع تفاصيل إضافية 🆕
- [x] updateUser - تحديث بيانات المستخدم
- [x] **updateUserData** - تحديث محسن مع التحقق من التكرار 🆕
- [x] **getAllUserNames** - جلب أسماء المستخدمين مع الفلاتر 🆕
- [x] updatePassword - تحديث كلمة المرور
- [x] **changeUserStatus** - تغيير حالة المستخدم مع السبب 🆕
- [x] deleteUser - حذف المستخدم
- [x] logout - تسجيل الخروج

### 🔄 الميزات القادمة
- [ ] نظام إدارة الفنادق
- [ ] نظام إدارة الغرف
- [ ] نظام الحجوزات
- [ ] نظام الخدمات الإضافية
- [ ] نظام الفواتير والدفع
- [ ] نظام التقارير والإحصائيات

## 🤝 المساهمة

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى البranch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة ISC - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 التواصل

- **المطور**: فريق إدارة الفنادق
- **البريد الإلكتروني**: support@hotel-system.com
- **الموقع**: [https://hotel-system.com](https://hotel-system.com)

## 🙏 شكر وتقدير

شكر خاص لجميع المساهمين والمطورين الذين ساعدوا في بناء هذا النظام.

---

**ملاحظة**: هذا المشروع في مرحلة التطوير النشط. الميزات الجديدة تُضاف باستمرار.
