const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { validationSchemma } = require('../middelWare/validationSchemma');
const { body } = require("express-validator");
const verifyToken = require('../middelWare/verifyToken');
const userRole = require("../utils/user-role");
const allowedTo = require('../middelWare/allowedTo');
// تعريف مسارات Courses
router
  .route("/")
  .get(verifyToken,courseController.getAllCourses) // الحصول على جميع الكورسات
  .post(validationSchemma, verifyToken , allowedTo(userRole.ADMIN ), courseController.createCourse); // إنشاء كورس جديد

router
  .route("/:id")
  .get(courseController.getCourseById) // الحصول على كورس محدد
  .patch(validationSchemma, courseController.updateCourse) // تحديث كورس
  .delete(verifyToken , allowedTo(userRole.ADMIN , userRole.MANAGER),courseController.deleteCourse); // حذف كورس

module.exports = router;