const { validationResult } = require("express-validator");
const Course = require("../models/course.model");
const httpStatusText= require("../utils/httpStatusText");
// Middleware للتحقق من الأخطاء
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const getAllCourses = async (req, res) => {
  try {
    const query = req.query;
    const limit = query.limit || 10;
    const page = query.page || 1;
    const skip = (page - 1) * limit;
    const courses = await Course.find({} ,{}).limit(limit).skip(skip);
    res.status(200).json({
      status: httpStatusText.SUCCESS,
      count: courses.length, 
      data: {
        courses
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error",
      message: "Error fetching courses",
      error: error.message 
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({      status: httpStatusText.FAILE,
      data: {
        course:"course not founded"
      } });
    }

    res.json({      status: httpStatusText.SUCCESS,
data:{course}});
  } catch (error) {
  
      return res.status(400).json({
      status: httpStatusText.Error,
      data:null , 
      message:error.message,
      code :400,
    });

  }
};

const createCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({status:httpStatusText.FAILE , data:errors.array()  });
  }

  try {
    const newCourse = new Course(req.body);
    await newCourse.save();
    res.status(201).json({status:httpStatusText.SUCCESS , data:{course:newCourse}  });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating course", 
      error: error.message 
    });
  }
};

const updateCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({status:httpStatusText.Error , message:errors.message  });
  }

  try {
    const updatedCourse = await Course.updateOne(
      {_id:req.params.id},
      { $set: req.body },
      { new: true } // لإرجاع الوثيقة بعد التحديث
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({status:httpStatusText.SUCCESS , data:{course:updatedCourse} });
  } catch (error) {
    res.status(500).json({ 
      message: "Error updating course", 
      error: error.message 
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const result = await Course.deleteOne({_id:req.params.id});

    if (!result) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      status: httpStatusText.SUCCESS,
      data: null
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error deleting course",
      error: error.message 
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  validate
};