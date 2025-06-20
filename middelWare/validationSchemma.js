const { body } = require('express-validator');

const validationSchemma = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ gt: 0 }).withMessage('Price must be greater than 0')
];

module.exports = { validationSchemma };