# Hotel Management System API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
معظم الـ endpoints تتطلب token في الـ header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## بيانات تسجيل الدخول للتجربة

### الموظف (SuperAdmin)
- **Email:** `admin@hotel.com`
- **Password:** `Admin123456`

### العميل
- **Email:** `customer@example.com`
- **Password:** `Customer123`

---

## 1. Authentication Endpoints

### 1.1 Employee Login
```http
POST /admin/employees/login
Content-Type: application/json

{
  "email": "admin@hotel.com",
  "password": "Admin123456"
}
```

### 1.2 Customer Register
```http
POST /mobile/auth/register
Content-Type: application/json

{
  "firstName": "أحمد",
  "lastName": "محمد",
  "password": "Customer123",
  "confirmPassword": "Customer123",
  "alternatePhoneNumber": "+966512345678",
  "regionId": "REGION_ID_HERE",
  "countryId": "COUNTRY_ID_HERE",
  "cityId": "CITY_ID_HERE",
  "detailedAddress": "شارع الملك فهد، الرياض"
}
```

### 1.3 Customer Login
```http
POST /mobile/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "Customer123"
}
```

### 1.4 Get Customer Profile
```http
GET /mobile/auth/profile
Authorization: Bearer TOKEN
```

### 1.5 Update Customer Password
```http
PUT /mobile/auth/update-password
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "currentPassword": "Customer123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

---

## 2. Admin - Users Management

### 2.1 Get All Users
```http
GET /admin/users?page=1&limit=10&search=محمد&sortBy=createdAt&sortOrder=desc&status=Active&countryId=COUNTRY_ID
Authorization: Bearer TOKEN
```

**Query Parameters:**
- `page` (optional): رقم الصفحة (افتراضي: 1)
- `limit` (optional): عدد العناصر (افتراضي: 10، أقصى: 100)
- `search` (optional): البحث في الاسم والبريد الإلكتروني
- `sortBy` (optional): ترتيب حسب (firstName, lastName, email, createdAt, updatedAt)
- `sortOrder` (optional): اتجاه الترتيب (asc, desc)
- `status` (optional): حالة العميل (Active, Inactive, Suspended)
- `countryId` (optional): فلترة حسب البلد

### 2.2 Get User By ID
```http
GET /admin/users/USER_ID
Authorization: Bearer TOKEN
```

### 2.3 Update User
```http
PUT /admin/users/USER_ID
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "firstName": "أحمد المحدث",
  "lastName": "محمد",
  "status": "Active",
  "countryId": "COUNTRY_ID",
  "cityId": "CITY_ID",
  "regionId": "REGION_ID"
}
```

### 2.4 Delete User
```http
DELETE /admin/users/USER_ID
Authorization: Bearer TOKEN
```

---

## 3. Admin - Employees Management

### 3.1 Get All Employees
```http
GET /admin/employees?page=1&limit=10&search=أحمد&role=Admin&status=Active&countryId=COUNTRY_ID
Authorization: Bearer TOKEN
```

**Query Parameters:**
- `page`, `limit`, `search`: نفس المعاملات السابقة
- `role` (optional): الدور (SuperAdmin, Admin, Manager, Receptionist, Supervisor)
- `status` (optional): الحالة (Active, Inactive, Suspended)
- `countryId` (optional): فلترة حسب البلد

### 3.2 Get All Employee Names
```http
GET /admin/employees/names?role=Admin&status=Active
Authorization: Bearer TOKEN
```

### 3.3 Get Employee By ID
```http
GET /admin/employees/EMPLOYEE_ID
Authorization: Bearer TOKEN
```

### 3.4 Add Employee
```http
POST /admin/employees
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "fullName": "سارة أحمد الموظفة",
  "email": "sara@hotel.com",
  "phoneNumber": "+966501234568",
  "password": "Employee123",
  "role": "Admin",
  "countryId": "COUNTRY_ID",
  "permissions": ["users", "employees"]
}
```

**Available Roles:**
- `SuperAdmin`: مدير عام
- `Admin`: مدير
- `Manager`: مدير قسم
- `Receptionist`: موظف استقبال
- `Supervisor`: مشرف

### 3.5 Update Employee
```http
PUT /admin/employees/EMPLOYEE_ID
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "fullName": "سارة أحمد المحدثة",
  "phoneNumber": "+966501234569",
  "role": "Manager",
  "status": "Active",
  "permissions": ["users", "employees", "reports"]
}
```

### 3.6 Delete Employee
```http
DELETE /admin/employees/EMPLOYEE_ID
Authorization: Bearer TOKEN
```

---

## 4. Admin - Countries Management

### 4.1 Get All Countries
```http
GET /admin/countries?page=1&limit=10&search=السعودية&sortBy=name.ar&sortOrder=asc&isActive=true
Authorization: Bearer TOKEN
```

### 4.2 Get All Country Names
```http
GET /admin/countries/names?isActive=true
Authorization: Bearer TOKEN
```

### 4.3 Get Country By ID
```http
GET /admin/countries/COUNTRY_ID
Authorization: Bearer TOKEN
```

### 4.4 Add Country
```http
POST /admin/countries
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": {
    "ar": "دولة الإمارات العربية المتحدة",
    "en": "United Arab Emirates"
  },
  "code": "AE",
  "phoneCode": "+971",
  "currency": {
    "code": "AED",
    "name": {
      "ar": "درهم إماراتي",
      "en": "UAE Dirham"
    },
    "symbol": "د.إ"
  }
}
```

### 4.5 Update Country
```http
PUT /admin/countries/COUNTRY_ID
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": {
    "ar": "المملكة العربية السعودية المحدثة",
    "en": "Saudi Arabia Updated"
  },
  "phoneCode": "+966",
  "currency": {
    "symbol": "ر.س"
  },
  "isActive": true
}
```

### 4.6 Delete Country
```http
DELETE /admin/countries/COUNTRY_ID
Authorization: Bearer TOKEN
```

---

## 5. Admin - Governorates Management

### 5.1 Get All Governorates
```http
GET /admin/governorates?page=1&limit=10&search=الرياض&countryId=COUNTRY_ID&isActive=true
Authorization: Bearer TOKEN
```

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "count": 1,
    "cities": [
      {
        "id": "governorate_id",
        "name": "الرياض",
        "country": "المملكة العربية السعودية",
        "numberOfRegions": 5
      }
    ]
  }
}
```

### 5.2 Get All Governorate Names
```http
GET /admin/governorates/names?countryId=COUNTRY_ID&isActive=true
Authorization: Bearer TOKEN
```

### 5.3 Get Governorate By ID
```http
GET /admin/governorates/GOVERNORATE_ID
Authorization: Bearer TOKEN
```

### 5.4 Upsert Governorate (Add)
```http
POST /admin/governorates/upsert
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": {
    "ar": "مكة المكرمة",
    "en": "Makkah"
  },
  "countryId": "COUNTRY_ID"
}
```

### 5.5 Upsert Governorate (Update)
```http
POST /admin/governorates/upsert
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "id": "GOVERNORATE_ID",
  "name": {
    "ar": "الرياض المحدثة",
    "en": "Riyadh Updated"
  },
  "countryId": "COUNTRY_ID"
}
```

### 5.6 Delete Governorate
```http
DELETE /admin/governorates/GOVERNORATE_ID
Authorization: Bearer TOKEN
```

---

## 6. Admin - Regions Management

### 6.1 Get All Regions
```http
GET /admin/regions?page=1&limit=10&search=وسط&governorateId=GOVERNORATE_ID&countryId=COUNTRY_ID&isActive=true
Authorization: Bearer TOKEN
```

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "count": 1,
    "regions": [
      {
        "id": "region_id",
        "name": "وسط الرياض",
        "cityName": "الرياض",
        "countryName": "المملكة العربية السعودية"
      }
    ]
  }
}
```

### 6.2 Get All Region Names
```http
GET /admin/regions/names?governorateId=GOVERNORATE_ID&countryId=COUNTRY_ID&isActive=true
Authorization: Bearer TOKEN
```

**Response includes:**
- Region ID and name
- Governorate ID and name
- Country ID and name

### 6.3 Get Cities by Country
```http
GET /admin/regions/cities?countryId=COUNTRY_ID&isActive=true
Authorization: Bearer TOKEN
```

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "count": 3,
    "cities": [
      {
        "id": "city_id",
        "name": "الرياض"
      }
    ],
    "country": {
      "id": "country_id",
      "name": "المملكة العربية السعودية"
    }
  }
}
```

### 6.4 Get Region By ID
```http
GET /admin/regions/REGION_ID
Authorization: Bearer TOKEN
```

### 6.5 Add Region
```http
POST /admin/regions
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": {
    "ar": "شمال الرياض",
    "en": "North Riyadh"
  },
  "governorateId": "GOVERNORATE_ID",
  "countryId": "COUNTRY_ID"
}
```

### 6.6 Update Region
```http
PUT /admin/regions/REGION_ID
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": {
    "ar": "وسط الرياض المحدث",
    "en": "Central Riyadh Updated"
  },
  "governorateId": "GOVERNORATE_ID",
  "countryId": "COUNTRY_ID"
}
```

### 6.7 Delete Region
```http
DELETE /admin/regions/REGION_ID
Authorization: Bearer TOKEN
```

---

## 7. System Information

### 7.1 Get API Info
```http
GET /
```

**Response:**
```json
{
  "status": "success",
  "message": "Hotel Management System API",
  "version": "1.0.0",
  "endpoints": {
    "admin": {
      "users": "/api/admin/users",
      "employees": "/api/admin/employees",
      "countries": "/api/admin/countries",
      "governorates": "/api/admin/governorates",
      "regions": "/api/admin/regions"
    },
    "mobile": {
      "auth": "/api/mobile/auth"
    }
  }
}
```

---

## Error Responses

جميع الـ endpoints ترجع أخطاء بالتنسيق التالي:

```json
{
  "status": "fail",
  "message": "رسالة الخطأ",
  "errors": [
    {
      "field": "email",
      "message": "البريد الإلكتروني مطلوب",
      "value": ""
    }
  ]
}
```

### HTTP Status Codes
- `200`: نجح الطلب
- `201`: تم إنشاء المورد بنجاح
- `400`: خطأ في البيانات المرسلة
- `401`: غير مصرح (token غير صحيح)
- `403`: ممنوع (لا توجد صلاحية)
- `404`: المورد غير موجود
- `500`: خطأ في الخادم

---

## Notes

1. **Pagination**: جميع endpoints الـ GET التي ترجع قوائم تدعم الـ pagination
2. **Search**: البحث يتم في الحقول النصية الرئيسية
3. **Sorting**: يمكن الترتيب حسب معظم الحقول
4. **Filtering**: فلترة حسب الحالة والبلد والأدوار
5. **Validation**: جميع البيانات المرسلة يتم التحقق منها
6. **Security**: الـ endpoints الإدارية محمية بـ tokens والصلاحيات

---

## تشغيل البذور

لإنشاء البيانات الأساسية:
```bash
node seed.js create
```

لحذف جميع البيانات:
```bash
node seed.js clear
```

لإعادة تعيين البيانات:
```bash
node seed.js reset
```

لعرض الإحصائيات:
```bash
node seed.js stats
```
