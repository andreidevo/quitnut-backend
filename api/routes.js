'use strict';

const asyncHandler = require('express-async-handler');
const { loginValidation } = require ("../middleware/inputValidation.js")
const { signUpLimiter, newsletterLimiter } = require ("../middleware/rateLimiters.js")
const { verifyJWT } = require ("../middleware/authenticateToken.js")
const validateRegister = require('../dto/user/register.dto.js')
const validateLogin = require('../dto/user/login.dto.js')
const validateRefresh = require('../dto/user/refresh.dto.js')
const validateUsername = require('../dto/user/username.dto.js')
const validateSs = require('../dto/user/setPremium.dto.js')
const validateSetUsername = require('../dto/user/setUsername.dto.js')
const validateGoogleRegisterZodSchema = require('../dto/user/googleRegistration.dto.js')
const validateSetLastStreak = require('../dto/user/setlastStreak.dto.js')
const validateApppleCallbackGet = require('../dto/user/appleCallbackGet.dto.query.js')
const validateApppleCallbackPost = require('../dto/user/appleCallbackPost.dto.js')
const validateSetStartDateZodSchema = require('../dto/user/setStartDate.dto.js')
const validateSendReportZodSchema = require('../dto/user/sendReport.dto.js')
const validatePublicnameCheck = require('../dto/team/publicCheck.dto.js')
const validateCreate = require('../dto/team/create.dto.js')
const validateGetInfo = require('../dto/team/getInfo.dto.js')
const validateExit = require('../dto/team/exit.dto.js');
const validateJoin = require('../dto/team/join.dto.js');
const validateEdit = require('../dto/team/edit.dto.js');
const validateRemove = require('../dto/team/remove.dto.js');
const validateRemoveMember = require('../dto/team/removeMember.dto.js');
const validateAcceptChange = require('../dto/team/acceptChange.dto.js');
const validateReport = require('../dto/team/reportTeam.dto.js');
const validateGetMembers = require('../dto/team/getMembers.dto.js');
const validateChangeStatuses = require('../dto/team/changeStatuses.dto.js');


var authHandlers = require('../controllers/authController.js');
var contentHandlers = require('../controllers/contentController.js');
var communityHandlers = require('../controllers/teamsController.js');

module.exports = function(app) {
  // ------- Auth
  app.route('/api/auth/register').post(validateRegister, asyncHandler(authHandlers.register));
  app.route('/api/auth/login').post(validateLogin, asyncHandler(authHandlers.signIn));
  app.route('/api/auth/refresh').post(validateRefresh, verifyJWT, asyncHandler(authHandlers.refresh));
  app.route('/api/auth/username').post(validateUsername, verifyJWT, asyncHandler(authHandlers.username_check));
  app.route('/api/auth/ss').post(validateSs, verifyJWT, asyncHandler(authHandlers.set_premium));
  app.route('/api/auth/refreshToken').post(verifyJWT, asyncHandler(authHandlers.refreshToken));
  

  app.route('/api/auth/google').post(validateGoogleRegisterZodSchema, asyncHandler(authHandlers.googleRegistration));
  app.route('/api/callback/apple').get(validateApppleCallbackGet, signUpLimiter, asyncHandler(authHandlers.appleCallbackGet));
  app.route('/api/callback/apple').post(validateApppleCallbackPost, signUpLimiter, asyncHandler(authHandlers.appleCallbackPost));

  // ------- User
  app.route('/api/auth/set_username').post(validateSetUsername, verifyJWT, asyncHandler(authHandlers.set_username));
  app.route('/api/auth/set_laststreak').post(validateSetLastStreak, verifyJWT, asyncHandler(authHandlers.set_lastStreak));
  app.route('/api/auth/set_startdate').post(validateSetStartDateZodSchema, verifyJWT, asyncHandler(authHandlers.set_startDate));
  app.route('/api/urs').post(validateSendReportZodSchema, signUpLimiter, asyncHandler(contentHandlers.send_report));
  app.route('/api/urstoken').post(validateSendReportZodSchema, verifyJWT, asyncHandler(contentHandlers.send_report_token));
  app.route('/api/teams/delete').post(verifyJWT, asyncHandler(communityHandlers.deleteAccount));


  // ------- Teams
  app.route('/api/teams/publicname_check').post(validatePublicnameCheck, verifyJWT, asyncHandler(communityHandlers.publicname_check));
  app.route('/api/teams/generate_name').get(verifyJWT, asyncHandler(communityHandlers.generateName));
  app.route('/api/teams/create').post(validateCreate, verifyJWT, asyncHandler(communityHandlers.create));
  app.route('/api/teams/getMyTeams').get(verifyJWT, asyncHandler(communityHandlers.getAllTeams));
  app.route('/api/teams/getPublicTeams').post(verifyJWT, asyncHandler(communityHandlers.getPublicTeams));
  app.route('/api/teams/getinfo').post(validateGetInfo, verifyJWT, asyncHandler(communityHandlers.getCommunityInfo));
  app.route('/api/teams/getinfoByName').post(validateGetInfo, verifyJWT, asyncHandler(communityHandlers.getCommunityInfoTeamName));
  app.route('/api/teams/join').post(validateJoin, verifyJWT, asyncHandler(communityHandlers.joinToTeam));
  app.route('/api/teams/exit').post(validateExit, verifyJWT, asyncHandler(communityHandlers.exitTeam));
  app.route('/api/teams/edit').post(validateEdit, verifyJWT, asyncHandler(communityHandlers.editTeam));
  app.route('/api/teams/remove').post(validateRemove, verifyJWT, asyncHandler(communityHandlers.removeTeam));
  app.route('/api/teams/accept_change').post(validateAcceptChange, verifyJWT, asyncHandler(communityHandlers.accept_change));
  app.route('/api/teams/report_team').post(validateReport, verifyJWT, asyncHandler(communityHandlers.report_team));
  app.route('/api/teams/getMembers').post(validateGetMembers, verifyJWT, asyncHandler(communityHandlers.getMembers));
  app.route('/api/teams/setStatuses/:teamId').post(validateChangeStatuses, verifyJWT, asyncHandler(communityHandlers.changeStatuses));
  app.route('/api/teams/removeMember').post(validateRemoveMember, verifyJWT, asyncHandler(communityHandlers.removeMember));


  
  
  
};