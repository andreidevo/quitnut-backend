'use strict';

const asyncHandler = require('express-async-handler');
var multer = require('multer');
const mime = require('mime-types');

const { loginValidation } = require ("../middleware/inputValidation.js")
const { signUpLimiter, newsletterLimiter, tgLimiter } = require ("../middleware/rateLimiters.js")
const { verifyJWT, appendNewToken, checkUserBan } = require ("../middleware/authenticateToken.js")
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
const uploadImage = require('../dto/team/uploadImage.dto.js');

const { bot, handleInlineButtons } = require('../controllers/telegramBot');

var authHandlers = require('../controllers/authController.js');
var contentHandlers = require('../controllers/contentController.js');
var communityHandlers = require('../controllers/teamsController.js');
var postsHandlers = require('../controllers/postsController.js');
var telegramBot = require('../controllers/telegramBot.js');

module.exports = function(app) {
  // ------- Auth
  app.route('/api/auth/register').post(validateRegister, asyncHandler(authHandlers.register));
  app.route('/api/auth/login').post(validateLogin, asyncHandler(authHandlers.signIn));
  app.route('/api/auth/refresh').post(validateRefresh, verifyJWT, appendNewToken, asyncHandler(authHandlers.refresh));
  app.route('/api/auth/username').post(validateUsername, verifyJWT, appendNewToken, asyncHandler(authHandlers.username_check));
  app.route('/api/auth/ss').post(validateSs, verifyJWT, appendNewToken, asyncHandler(authHandlers.set_premium));
  app.route('/api/auth/refreshToken').post(verifyJWT, appendNewToken, asyncHandler(authHandlers.refreshToken));
  

  app.route('/api/auth/google').post(validateGoogleRegisterZodSchema, asyncHandler(authHandlers.googleRegistration));
  app.route('/api/callback/apple').get(validateApppleCallbackGet, signUpLimiter, asyncHandler(authHandlers.appleCallbackGet));
  app.route('/api/callback/apple').post(validateApppleCallbackPost, signUpLimiter, asyncHandler(authHandlers.appleCallbackPost));

  // ------- User
  app.route('/api/auth/set_username').post(validateSetUsername, verifyJWT, appendNewToken, checkUserBan, asyncHandler(authHandlers.set_username));
  app.route('/api/auth/set_laststreak').post(validateSetLastStreak, verifyJWT, appendNewToken, asyncHandler(authHandlers.set_lastStreak));
  app.route('/api/auth/set_startdate').post(validateSetStartDateZodSchema, verifyJWT, appendNewToken, asyncHandler(authHandlers.set_startDate));
  app.route('/api/urs').post(validateSendReportZodSchema, signUpLimiter, asyncHandler(contentHandlers.send_report));
  app.route('/api/urstoken').post(validateSendReportZodSchema, verifyJWT, appendNewToken, asyncHandler(contentHandlers.send_report_token));
  app.route('/api/teams/delete').post(verifyJWT, appendNewToken, asyncHandler(communityHandlers.deleteAccount));


  // ------- Teams
  app.route('/api/teams/publicname_check').post(validatePublicnameCheck, verifyJWT, appendNewToken, asyncHandler(communityHandlers.publicname_check));
  app.route('/api/teams/generate_name').get(verifyJWT, appendNewToken, asyncHandler(communityHandlers.generateName));
  app.route('/api/teams/create').post(validateCreate, verifyJWT, checkUserBan, appendNewToken, asyncHandler(communityHandlers.create));
  app.route('/api/teams/getMyTeams').get(verifyJWT, appendNewToken, asyncHandler(communityHandlers.getAllTeams));
  app.route('/api/teams/getPublicTeams').post(verifyJWT, asyncHandler(communityHandlers.getPublicTeams));
  app.route('/api/teams/getinfo').post(validateGetInfo, verifyJWT, appendNewToken, asyncHandler(communityHandlers.getCommunityInfo));
  app.route('/api/teams/getinfoByName').post(validateGetInfo, verifyJWT, appendNewToken, asyncHandler(communityHandlers.getCommunityInfoTeamName));
  app.route('/api/teams/join').post(validateJoin, verifyJWT, appendNewToken, asyncHandler(communityHandlers.joinToTeam));
  app.route('/api/teams/exit').post(validateExit, verifyJWT, appendNewToken, asyncHandler(communityHandlers.exitTeam));
  app.route('/api/teams/edit').post(validateEdit, verifyJWT, checkUserBan, appendNewToken, asyncHandler(communityHandlers.editTeam));
  app.route('/api/teams/remove').post(validateRemove, verifyJWT, appendNewToken, asyncHandler(communityHandlers.removeTeam));
  app.route('/api/teams/accept_change').post(validateAcceptChange, verifyJWT, appendNewToken, asyncHandler(communityHandlers.accept_change));
  app.route('/api/teams/report_team').post(validateReport, verifyJWT, checkUserBan, appendNewToken, asyncHandler(communityHandlers.report_team));
  app.route('/api/teams/getMembers').post(validateGetMembers, verifyJWT, appendNewToken, asyncHandler(communityHandlers.getMembers));
  app.route('/api/teams/setStatuses/:teamId').post(validateChangeStatuses, verifyJWT, checkUserBan, appendNewToken, asyncHandler(communityHandlers.changeStatuses));
  app.route('/api/teams/removeMember').post(validateRemoveMember, verifyJWT, checkUserBan, appendNewToken, asyncHandler(communityHandlers.removeMember));



  // POSTS
  app.route('/api/posts/createPost').post(verifyJWT, appendNewToken, checkUserBan, asyncHandler(postsHandlers.createPost));

  // app.route('/api/posts/editPost').post(validateReport, verifyJWT, asyncHandler(postsHandlers.createPost));
  // app.route('/api/posts/closeComments').post(validateReport, verifyJWT, asyncHandler(postsHandlers.createPost));
  // app.route('/api/posts/getPostObject').post(validateReport, verifyJWT, asyncHandler(postsHandlers.createPost));

  app.route('/api/posts/removePost').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.removePost)); 

  app.route('/api/posts/addReactionPost').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.addReactionToPost));
  app.route('/api/posts/removeReactionPost').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.removeReactionFromPost));
  app.route('/api/posts/reportPost').post(verifyJWT, appendNewToken, checkUserBan, asyncHandler(postsHandlers.reportPost));

  app.route('/api/posts/addCommentToPost').post(verifyJWT, appendNewToken, checkUserBan, asyncHandler(postsHandlers.addCommentToPost));
  app.route('/api/posts/removeCommentPost').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.removeCommentFromPost));
  app.route('/api/posts/replyAdd').post(verifyJWT, appendNewToken, checkUserBan, asyncHandler(postsHandlers.addReplyToComment));

  app.route('/api/posts/addReactionToComment').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.addReactionToComment));
  app.route('/api/posts/removeReactionFromComment').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.removeReactionFromComment));

  app.route('/api/posts/getCommentsWithReplies').post(verifyJWT, appendNewToken, asyncHandler(postsHandlers.getCommentsWithReplies));

  app.route('/api/posts/getPosts').get(verifyJWT, appendNewToken, asyncHandler(postsHandlers.getPosts));

  

  // app.route('/api/teams/uploadImg').post(verifyJWT, asyncHandler(communityHandlers.uploadImageToS3));
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',   // JPEG
    'image/jpg',    // JPG (often used interchangeably with 'image/jpeg')
    'image/png',    // PNG
    'image/webp',   // WebP
  ];

  const upload = multer({
    limits: { fileSize: 2 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const mimeType = mime.lookup(file.originalname);
      if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed.'));
      }
    }
  });

  app.route('/api/teams/uploadImg').post(verifyJWT, appendNewToken, checkUserBan, upload.single('file'), asyncHandler(communityHandlers.uploadImageToS3Team));

  app.route('/api/user/uploadImg').post(verifyJWT, appendNewToken, checkUserBan, upload.single('file'), asyncHandler(communityHandlers.uploadImageToS3User));

  app.route('/webhook').post(asyncHandler(telegramBot.handleCommands));

  app.route('/api/posts/getNotifications').get(verifyJWT, appendNewToken, asyncHandler(postsHandlers.getNotifications));

};