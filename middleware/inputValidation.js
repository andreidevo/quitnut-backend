const { body, validationResult } = require('express-validator');

const loginValidation = [
  // body('username').trim().isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
  body('password').isLength({ max: 50 }).withMessage('Password must be less then 50 characters long'),


  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  loginValidation,
};