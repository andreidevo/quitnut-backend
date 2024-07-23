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
  app.route('/api/auth/ss').post(verifyJWT, asyncHandler(authHandlers.set_premium));

  app.route('/api/auth/google').post(asyncHandler(authHandlers.googleRegistration));
  app.route('/api/callback/apple').get(signUpLimiter, asyncHandler(authHandlers.appleCallbackGet));
  // app.route('/api/callback/appleandroid').get(signUpLimiter, asyncHandler(authHandlers.appleCallbackGetAndroid));
  app.route('/api/callback/apple').post(signUpLimiter, asyncHandler(authHandlers.appleCallbackPost));

  // ------- User
  app.route('/api/auth/set_username').post(verifyJWT, asyncHandler(authHandlers.set_username));
  app.route('/api/auth/set_laststreak').post(verifyJWT, asyncHandler(authHandlers.set_lastStreak));
  app.route('/api/auth/set_startdate').post(verifyJWT, asyncHandler(authHandlers.set_startDate));
  app.route('/api/urs').post(signUpLimiter, asyncHandler(contentHandlers.send_report));


  // ------- Teams
  app.route('/api/teams/publicname_check').post(verifyJWT, asyncHandler(communityHandlers.publicname_check));
  app.route('/api/teams/generate_name').get(verifyJWT, asyncHandler(communityHandlers.generateName));
  app.route('/api/teams/create').post(verifyJWT, asyncHandler(communityHandlers.create));
  app.route('/api/teams/getMyTeams').get(verifyJWT, asyncHandler(communityHandlers.getAllTeams));
  app.route('/api/teams/getPublicTeams').get(verifyJWT, asyncHandler(communityHandlers.getPublicTeams));
  app.route('/api/teams/getinfo').post(verifyJWT, asyncHandler(communityHandlers.getCommunityInfo));
  app.route('/api/teams/join').post(verifyJWT, asyncHandler(communityHandlers.joinToTeam));
  app.route('/api/teams/exit').post(verifyJWT, asyncHandler(communityHandlers.exitTeam));
  app.route('/api/teams/edit').post(verifyJWT, asyncHandler(communityHandlers.editTeam));
  app.route('/api/teams/remove').post(verifyJWT, asyncHandler(communityHandlers.removeTeam));
  app.route('/api/teams/accept_change').post(verifyJWT, asyncHandler(communityHandlers.accept_change));
  app.route('/api/teams/report_team').post(verifyJWT, asyncHandler(communityHandlers.report_team));
  app.route('/api/teams/getMembers').post(verifyJWT, asyncHandler(communityHandlers.getMembers));
  app.route('/api/teams/setStatuses/:teamId').post(verifyJWT, asyncHandler(communityHandlers.changeStatuses));

  
  
};