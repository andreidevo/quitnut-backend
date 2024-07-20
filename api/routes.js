'use strict';

const asyncHandler = require('express-async-handler');
const { loginValidation } = require ("../middleware/inputValidation.js")
const { signUpLimiter, newsletterLimiter } = require ("../middleware/rateLimiters.js")
const { verifyJWT } = require ("../middleware/authenticateToken.js")

var authHandlers = require('../controllers/authController.js');
var contentHandlers = require('../controllers/contentController.js');
var communityHandlers = require('../controllers/teamsController.js');

module.exports = function(app) {
  // ------- Auth
  app.route('/api/auth/register').post(asyncHandler(authHandlers.register));
  app.route('/api/auth/login').post(asyncHandler(authHandlers.signIn));
  app.route('/api/auth/refresh').post(verifyJWT, asyncHandler(authHandlers.refresh));
  app.route('/api/auth/username').post(verifyJWT, asyncHandler(authHandlers.username_check));

  app.route('/api/auth/google').post(signUpLimiter, asyncHandler(authHandlers.googleFunction));
  app.route('/api/callback/apple').get(signUpLimiter, asyncHandler(authHandlers.appleCallback));

  // ------- User
  app.route('/api/auth/set_username').post(verifyJWT, asyncHandler(authHandlers.set_username));
  app.route('/api/auth/set_laststreak').post(verifyJWT, asyncHandler(authHandlers.set_lastStreak));
  app.route('/api/auth/set_startdate').post(verifyJWT, asyncHandler(authHandlers.set_startDate));

  app.route('/api/urs').post(signUpLimiter, asyncHandler(contentHandlers.send_report));


  // ------- Teams
  app.route('/api/teams/publicname_check').post(verifyJWT, asyncHandler(communityHandlers.publicname_check));
  app.route('/api/teams/generate_name').get(verifyJWT, asyncHandler(communityHandlers.generateName));
  app.route('/api/teams/create').post(verifyJWT, asyncHandler(communityHandlers.create));


};