'use strict';

const asyncHandler = require('express-async-handler');
const { loginValidation } = require ("../middleware/inputValidation.js")
const { signUpLimiter, newsletterLimiter } = require ("../middleware/rateLimiters.js")
const { verifyJWT } = require ("../middleware/authenticateToken.js")

var authHandlers = require('../controllers/authController.js');
var contentHandlers = require('../controllers/contentController.js');
var paymentHandlers = require('../controllers/paymentController.js');

// console.log(authHandlers)
// console.log(contentHandlers)
// console.log(authHandlers.register)
// console.log(authHandlers.signIn)
// console.log(authHandlers.refresh)
// console.log(authHandlers.googleFunction)

// fix

module.exports = function(app) {
  // ------- Auth
  app.route('/apii/auth/register').post(asyncHandler(authHandlers.register));
  app.route('/apii/auth/login').post(asyncHandler(authHandlers.signIn));
  app.route('/apii/auth/refresh').post(asyncHandler(authHandlers.refresh));

  app.route('/apii/auth/google').post(signUpLimiter, asyncHandler(authHandlers.googleFunction));
  app.route('/apii/newsletter').post(newsletterLimiter, asyncHandler(authHandlers.newsletter));
  
  app.route('/apii/auth/set_data').post(verifyJWT, asyncHandler(authHandlers.set_data));

  // ------- Content
  app.route('/apii/content/ideas').get(verifyJWT, asyncHandler(contentHandlers.ideas));
  app.route('/apii/content/getresource').get(verifyJWT, asyncHandler(contentHandlers.getResource));
  app.route('/apii/content/getallresources').get(verifyJWT, asyncHandler(contentHandlers.getAllResources));
  app.route('/apii/content/articlemore').get(verifyJWT, asyncHandler(contentHandlers.articleLoadMore));
  app.route('/apii/blog/blogmore').get(verifyJWT, asyncHandler(contentHandlers.blogLoadMore));
  app.route('/apii/unlock_article').post(verifyJWT, asyncHandler(contentHandlers.unlock_article));
  app.route('/apii/unlock_idea').post(verifyJWT, asyncHandler(contentHandlers.unlock_idea));
  app.route('/apii/content/getallideas').get(verifyJWT, asyncHandler(contentHandlers.getAllIdeas));
  
  // ------- Payments 
  app.route('/apii/payment/checkoutsession').get(verifyJWT, asyncHandler(paymentHandlers.checkout_session));
  app.route('/apii/payment/checkout30credits').get(verifyJWT, asyncHandler(paymentHandlers.checkout_30credits));
  app.route('/apii/payment/checkout100credits').get(verifyJWT, asyncHandler(paymentHandlers.checkout_100credits));
  
  app.route('/apii/payment/verifysession').post(verifyJWT, asyncHandler(paymentHandlers.verify_session));
  app.route('/apii/payment/addcredits').post(verifyJWT, asyncHandler(paymentHandlers.add_credits));

  app.route('/apii/auth/cp').get(verifyJWT, asyncHandler(paymentHandlers.check_premium));
};