# اختبار إصلاحات الغرف

## المشاكل التي تم إصلاحها:

### 1. مشكلة الوصف
- ✅ تم إضافة حقل `description` إلى نموذج الغرفة
- ✅ تم تحديث validation للتحقق من الوصف
- ✅ تم تحديث دالة `updateRoom` للتعامل مع الوصف بشكل صحيح

### 2. مشكلة الصور في التحديث
- ✅ تم إصلاح استخدام `images` بدلاً من `roomImages` في التحديث
- ✅ تم إضافة حذف الصور القديمة عند التحديث
- ✅ تم التأكد من أن نوع الطلب POST للتحديث

### 3. مشكلة السعر
- ✅ تم إضافة validation للسعر في إضافة وتحديث الغرف

### 4. إضافة ميزة حذف صور معينة
- ✅ تم إضافة حقل `deleteImages` اختياري
- ✅ يقبل مصفوفة من مسارات الصور المراد حذفها
- ✅ يحذف الصور من النظام ومن قاعدة البيانات
- ✅ يحافظ على الصور الأخرى الموجودة

## الاختبارات المطلوبة:

### اختبار إضافة غرفة:
```
POST /api/admin/rooms
Content-Type: multipart/form-data

Body:
- nameAr: "غرفة فاخرة"
- nameEn: "Luxury Room"
- hotelId: "valid_hotel_id"
- type: "suite"
- price: 150
- description: "غرفة فاخرة مع إطلالة رائعة"
- bedsCount: 2
- roomImages: [file1.jpg, file2.jpg]
```

### اختبار تحديث غرفة:
```
POST /api/admin/rooms/{room_id}
Content-Type: multipart/form-data

Body:
- description: "وصف محدث للغرفة"
- price: 200
- roomImages: [new_file1.jpg]
- deleteImages: ["uploads/rooms/old_image1.jpg", "uploads/rooms/old_image2.jpg"]
```

### اختبار حذف صور معينة فقط (بدون إضافة جديدة):
```
POST /api/admin/rooms/{room_id}
Content-Type: multipart/form-data

Body:
- deleteImages: ["uploads/rooms/image_to_delete.jpg"]
```

### اختبار جلب غرفة:
```
GET /api/admin/rooms/{room_id}
```

يجب أن تعيد:
- الوصف
- الصور الجديدة
- السعر المحدث

## ملاحظات:
- تأكد من أن الصور القديمة يتم حذفها من النظام
- تأكد من أن الوصف يظهر في جميع استجابات API
- تأكد من أن التحديث يعمل مع form-data

## كيفية استخدام deleteImages:

### 1. إرسال كـ JSON string:
```
deleteImages: '["uploads/rooms/image1.jpg", "uploads/rooms/image2.jpg"]'
```

### 2. إرسال كـ array (إذا كان الـ client يدعم ذلك):
```
deleteImages: ["uploads/rooms/image1.jpg", "uploads/rooms/image2.jpg"]
```

### 3. سيناريوهات الاستخدام:
- **حذف صور معينة + إضافة جديدة**: سيتم حذف المحددة وإضافة الجديدة
- **حذف صور معينة فقط**: سيتم حذف المحددة والاحتفاظ بالباقي
- **إضافة صور جديدة فقط**: سيتم إضافة الجديدة للموجودة
- **عدم إرسال deleteImages**: لن يتم حذف أي صور موجودة

### 4. مسارات الصور:
- يجب أن تكون مسارات الصور كاملة مثل: `uploads/rooms/room-123456789.jpg`
- يمكن الحصول على المسارات من استجابة GetRoomById
