const express = require('express');
const router = express.Router();
const multer = require('multer');
const diskStorge = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        const fileName = `user-${Date.now()}.${ext}`
        cb(null, fileName);
    }

});
const filefilter = function (req, file, cb) {
    const fileType = file.mimetype.split('/')[0];
    if(fileType == 'image'){
       return cb(null, true);
    }else{
       return cb( new Error('File type must be an image'), false)
    }
}

const upload = multer({ storage: diskStorge , fileFilter: filefilter});
const userController = require('../controllers/user.Controller');
const verifyToken = require('../middelWare/verifyToken');
router.route('/').get(verifyToken, userController.getAllUers);
 
router.route('/register').post(upload.single('avatar'),userController.register);

router.route('/login').post( userController.login);
module.exports = router;