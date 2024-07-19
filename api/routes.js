'use strict';

const asyncHandler = require('express-async-handler');
const { loginValidation } = require ("../middleware/inputValidation.js")
const { signUpLimiter, newsletterLimiter } = require ("../middleware/rateLimiters.js")
const { verifyJWT } = require ("../middleware/authenticateToken.js")

var authHandlers = require('../controllers/authController.js');
var contentHandlers = require('../controllers/contentController.js');

module.exports = function(app) {
  // ------- Sending Reports
  app.route('/api/urs').post(signUpLimiter, asyncHandler(contentHandlers.send_report));

  // ------- Auth
  app.route('/api/auth/register').post(asyncHandler(authHandlers.register));
  app.route('/api/auth/login').post(asyncHandler(authHandlers.signIn));
  app.route('/api/auth/refresh').post(asyncHandler(authHandlers.refresh));

  app.route('/api/auth/google').post(signUpLimiter, asyncHandler(authHandlers.googleFunction));
  app.route('/api/callback/apple').get(signUpLimiter, asyncHandler(authHandlers.appleCallback));

};