'use strict';

var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
User = mongoose.model('User'),
Team = mongoose.model('Team');

const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const axios = require('axios');
const appleSignin = require("apple-signin");
const path = require("path");
const NodeRSA = require('node-rsa');
const request = require('request-promise-native');
const jwkToPem = require('jwk-to-pem');
const querystring = require('querystring');
// const BadWordsNext = require('bad-words-next');
// const en = require('bad-words-next/data/en.json');
// const Filter = require('bad-words');

const TelegramBot = require('node-telegram-bot-api');

const token = '7061820740:AAG-5fpyRDyx__dSSSHTj8UhBs58YatB_Ys';
const bot = new TelegramBot(token);

const filter = require('../utils/censorship/rejexBadwords');

const googleClient = new OAuth2Client(process.env.GoogleID);

exports.text = async function(req, res) {}

exports.register = async function(req, res) {
  try {
    var newUser = new User(req.body);

    const existingUser = await User.findOne({ email: newUser.email });
    
    if (existingUser) {
      const isMatch = await bcrypt.compare(req.body.password, existingUser.hash_password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Authentication failed. Invalid user or password' });
      }

      return performLogin(existingUser, req, res);
    }

    
    newUser.hash_password = bcrypt.hashSync(req.body.password, 10);

    const user = await newUser.save();

    const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
    const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
    
    try {
      await User.findByIdAndUpdate(user._id, { refreshToken: refreshToken });
      // console.log('RefreshToken added/updated successfully.');
    } catch (error) {
      console.error('Error updating refreshToken:', error);
    }

    bot.sendMessage("1979434110", "new user + 1" , { parse_mode: 'HTML' });


    return res.status(200).json({
      accessToken: accessToken,
      refreshToken: refreshToken
    });
  } catch (err) {
    res.status(400).send({
      message: err.message
    });
  }
};

async function performLogin(user, req, res) {

  const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223');
  const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' }); // Expires in 7 days

  try {
    await User.findByIdAndUpdate(user._id, { refreshToken: refreshToken });
    // console.log('RefreshToken added/updated successfully.');
  } catch (error) {
    console.error('Error updating refreshToken:', error);
  }

  return res.status(200).json({
    accessToken: accessToken,
    refreshToken: refreshToken
  });
}

exports.signIn = async function(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(401).json({ message: 'Authentication failed. Invalid user or password. user' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.hash_password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed. Invalid user or password. hash' });
    }

    return performLogin(user, req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.refresh = async function(req, res) {
  // console.log(req.body);
  const { accessToken } = req.body;
  // console.log(accessToken);

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || 'super-secret-tokenasd2223');

    // console.log("start search")
    const existingUser = await User.findOne({ _id: decoded._id });
    // console.log("end search")


    if (!existingUser) {
      return res.status(403).json({ message: 'Invalid JWT' });
    }

    const newAccessToken = jwt.sign({ _id: decoded._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '7d' });
    // const newRefreshToken = jwt.sign({ _id: decoded._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // await updateRefreshTokenInDatabase(decoded._id, newRefreshToken);

    const expiresIn = 30 * 24 * 60 * 60 * 1000;
    // const expiresIn = 5 * 1000;

    const accessTokenExpiry = Date.now() + expiresIn;

    const sub_status = existingUser.subscription.status
    var premium = (sub_status === "paid") ? true : false;
    
    // console.log(newAccessToken);
    // console.log(accessTokenExpiry);

    return res.status(200).json({
      accessToken: newAccessToken,
      accessTokenExpiry: accessTokenExpiry,
      // premium: premium
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

async function findRefreshTokenInDatabase(userId) {
  const user = await User.findById(userId);
  return user ? user.refreshToken : null;
}

async function updateRefreshTokenInDatabase(userId, newRefreshToken) {
  await User.findByIdAndUpdate(userId, { refreshToken: newRefreshToken });
}

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);



function validateUsername(username) {
  // Regular expression to check valid characters (letters, numbers, underscores)
  const isValid = /^[a-zA-Z0-9_]+$/.test(username);

  // Check the length of the username
  let isLengthValid = username.length <= 30;
  isLengthValid = username.length > 4;

  // List of prohibited words
  // const badWords = ['dick', 'suck', 'pussy', "fuck", "sex", "porno", "penis", "boobs", "jerking"];

  // // Function to check for bad words
  // const containsBadWords = (username) => {
  //   return badWords.some(badWord => username.toLowerCase().includes(badWord));
  // };

  // Check if username contains any bad words
  // const isContentValid = !containsBadWords(username);
  const isContentValid = !filter(username);

  console.log("is valid??");
  console.log(isContentValid);

  console.log("Checl");
  console.log(isValid);
  console.log(isLengthValid);
  console.log(isContentValid);

  return isValid && isLengthValid && isContentValid;
}


exports.username_check = async function(req, res) {
  // console.log(req.body);
  const { username } = req.body;
  var user = req.user;

  // console.log(req.user);
  console.log(username);


  if (user !== null){
    var valid = validateUsername(username);

    if (valid){
      var find = await User.findOne({ username: username });
      if (find === null){
        return res.status(200).json({
          message: "ok"
        });
      } else {
        return res.status(500).json({
          message: "already exists"
        });
      }
    } else {
      return res.status(500).json({
        message: "not valid"
      });
    }
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.refreshToken = async function(req, res) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "User not authenticated",
      info: {}
    });
  }

  try {

      const savedUser = await User.findById(user._id);

      if (!savedUser) {
        return res.status(404).json({
          message: "User not found",
          info: {}
        });
      }

      // Optional: Verify the existing refreshToken if it is provided in the request and is still valid
      const currentRefreshToken = savedUser.refreshToken; // Assuming refreshToken is stored in the User model
      jwt.verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            message: "Invalid or expired refresh token",
            info: {}
          });
        }

          // Check if the token expires in less than 50 days
        const daysUntilExpiry = (decoded.exp * 1000 - Date.now()) / (24 * 3600 * 1000);
        if (daysUntilExpiry <= 60) {
          // Token is about to expire, issue a new one
          savedUser.refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
        }

        // Generate new accessToken and refreshToken
        const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        
          try {
            await savedUser.save();
            // Return the new tokens
            res.status(200).json({
              message: "Tokens refreshed successfully",
              accessToken: accessToken,
              refreshToken: savedUser.refreshToken
            });
          } catch (saveError) {
            console.error('Error saving the updated user:', saveError);
            return res.status(500).json({
              message: "Failed to update user with new refresh token",
              info: {}
            });
          }
      });
  } catch (error) {
      console.error('Error refreshing token:', error);
      return res.status(500).json({
          message: "Failed to refresh token",
          info: {}
      });
  }
};

exports.set_username = async function(req, res) {
  const { username } = req.body;
  var user = req.user;

  console.log(username);
  console.log(user);


  if (user !== null){

    var find = await User.findOne({ _id: user._id });
    
    if (find.banned.status){
      return res.status(500).json({
        message: "The user has been banned for the following reason: " + find.banned.reason,
      });
    }

    var valid = validateUsername(username);
    console.log(valid);

    if (valid){
      console.log("Valid");
      try {
        const result = await User.findByIdAndUpdate(user._id, { $set: { username: username, usernameChanged: true } }, { new: true, runValidators: true });
        console.log(result);
        bot.sendMessage("1979434110", "set username:" + username, { parse_mode: 'HTML' });
        return res.status(200).json({
          message: "ok"
        });
      } catch (error) {
        console.error('Error updating refreshToken:', error);
        return res.status(500).json({
          message: "already exists"
        });
      }
     
    } else {
      return res.status(500).json({
        message: "not valid username"
      });
    }
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

async function reRankTeamMembers(teamId) {
  console.log("RERANK");

  try {
    // Fetch team with all members' details
    const team = await Team.findById(teamId).populate('members.user');

    if (!team) {
        console.log("Team not found");
        return;
    }

    // Calculate the streak for each member and create a map of userId to streak
    const now = new Date();
    const memberStreaks = team.members.map(member => ({
        userId: member.user._id,
        streak: (now - new Date(member.user.streak.lastReset)) / (1000 * 60) // Minutes since last reset
    }));

    // Sort by streak in descending order
    memberStreaks.sort((a, b) => b.streak - a.streak);

    // Update ranks based on sorted order
    for (let i = 0; i < memberStreaks.length; i++) {
        const memberIndex = team.members.findIndex(member => member.user._id.equals(memberStreaks[i].userId));
        if (memberIndex !== -1) {
            team.members[memberIndex].rank = i + 1; // Update rank
        }
    }

    // Save the updated team
    await team.save();
    console.log("Team members re-ranked successfully.");
  } catch (error) {
      console.error('Error re-ranking team members:', error);
  }
}


exports.set_lastStreak = async function(req, res) {
  const { date } = req.body;
  var user = req.user;

  console.log("NEW STREAK SET");
  console.log(date);


  if (user !== null){
    const lastStreakDate = new Date(date);

    try {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 'streak.lastReset': lastStreakDate }, 
        { new: true } 
      );

      if (updatedUser){
        for (const teamId of updatedUser.communities) {
            await reRankTeamMembers(teamId);
        }
      }

      return res.status(200).json({
        message: "ok"
      });
    } catch (e){
      console.error('Error updating:', error);
      return res.status(500);
    }

    
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.set_startDate = async function(req, res) {
  const { date, t } = req.body;
  var user = req.user;

  console.log(date);


  if (user !== null){
    const startDate = new Date(date);

    try {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 'streak.dateStart': startDate, 'test': t }, 
        { new: true } 
      );

      return res.status(200).json({
        message: "ok"
      });
    } catch (e){
      console.error('Error updating:', error);
      return res.status(500);
    }

    
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.set_premium = async function(req, res) {
  const { ss } = req.body;
  var user = req.user;

  console.log(ss);


  if (user !== null){

    try {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 'subscription.status': (ss) ? "paid" : "null" }, 
        { new: true } 
      );

      return res.status(200).json({
        message: "ok"
      });
    } catch (e){
      console.error('Error updating:', error);
      return res.status(500);
    }

    
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.googleFunction = async function(req, res) {
  try {
      const token = req.body.access_token;
      const email = req.body.email;
      // const checkBox = req.body.checkedBox;

      // console.log("OPA opa");
      // console.log(req.body);
      
      const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (payload["email"] === email){
        var existingUser = await User.findOne({ email: email });
        
        if (!existingUser) {
          let newUser = new User({
            email: email,
            name: payload["given_name"] + " " + payload["family_name"],
            authProvider: "google",
            created: Date.now(),
            accountId: payload["sub"],
            // newsletter: checkBox
          });

          await newUser.save();
          existingUser = newUser;
        }
        
        const accessToken = jwt.sign({ email: email, _id: existingUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', {expiresIn: "30d"});
        
        const expiresIn = 30 * 24 * 60 * 60 * 1000;
        // const expiresIn = 1000 * 10;
        const accessTokenExpiry = Date.now() + expiresIn;

        // const sub_status = existingUser.subscription.status

        return res.json({ 
          success: true, 
          accessToken: accessToken, 
          accessTokenExpiry: accessTokenExpiry, 
          user: payload 
        });
      } else {
        return res.status(400).json({ success: false, message: "Emails not match"});

      }

  } catch (error) {
      console.error("Error verifying Google token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

function generateUsername() {
  const adjectives = ["fighter", "soldier", "warrior", "ranger", "legend"];
  const number = Math.floor(Math.random() * 100000);
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  return `${adjective}_${number}`;
}

async function findUniqueUsername() {
  let username = generateUsername();
  let userExists = true;
  let attempts = 0;
  
  while (userExists && attempts < 150) { 
    console.log("attempt:" + attempts);

    let user = await User.findOne({ username: username });
    if (!user) {
      userExists = false; 
    } else {
      username = generateUsername(); 
      attempts++;
    }
  }

  if (attempts >= 50) {
    throw new Error('Failed to generate a unique username after multiple attempts.');
  }

  console.log(username);

  return username; // Return the unique username
}

const getApplePublicKey = async (kid) => {
  const url = 'https://appleid.apple.com/auth/keys';  // Simplified URL setup
  const response = await request({ url: url, json: true });  // Using json: true to automatically parse JSON
  const keys = response.keys;

  const matchingKey = keys.find(key => key.kid === kid);  // Find the key with the matching kid
  if (!matchingKey) {
    throw new Error('No matching key found.');
  }

  return jwkToPem(matchingKey);  // Convert JWK to PEM using jwk-to-pem
};

const verifyIdToken = async (idToken) => {
  const decodedToken = jwt.decode(idToken, { complete: true });
  if (!decodedToken) {
    throw new Error('Unable to decode token');
  }

  const kid = decodedToken.header.kid;
  const applePublicKey = await getApplePublicKey(kid);

  // Now verify the token with the correct public key
  const jwtClaims = jwt.verify(idToken, applePublicKey, { algorithms: ['RS256'] });

  // Additional checks as before
  if (jwtClaims.iss !== 'https://appleid.apple.com') {
    throw new Error('id token not issued by correct OpenID provider - expected: https://appleid.apple.com | from: ' + jwtClaims.iss);
  }
  // More validation checks can be done here
  return jwtClaims;
};

exports.appleCallbackGet = async function(req, res) {

  const { token, code, useBundleId } = req.query;

  console.log(token);
  console.log(code);
  console.log(useBundleId);

  try {
    if (useBundleId === null){
      useBundleId = "true";
    }

    if (!code) return res.sendStatus(500);

    const clientSecret = appleSignin.getClientSecret({
      clientID: (useBundleId === "false") ? process.env.cliendIDAndroid : process.env.cliendID, 
      teamId: process.env.teamId,
      keyIdentifier: (useBundleId === "false") ? process.env.keyIdentifier : process.env.keyIdentifier, 
      privateKeyPath: (useBundleId === "false") ? "/srv/quitnut-backend/authKey/AuthKey_8AM64B5P6U.p8" : "/srv/quitnut-backend/authKey/AuthKey_8AM64B5P6U.p8",
      
    });
    console.log(clientSecret);
  
    const tokens = await appleSignin.getAuthorizationToken(code, {
      clientID: (useBundleId === "false") ? process.env.cliendIDAndroid : process.env.cliendID,
      clientSecret: clientSecret,
      redirectUri: "https://quitnut.app/api/callback/apple"
    });

    console.log(tokens);

  
    if (!tokens.id_token) return res.sendStatus(500);
    console.log(tokens.id_token);
    
    const data = await verifyIdToken(tokens.id_token);
    
    if (data["sub"] != null){
      // email + email_verified
      var sub = data["sub"];

      const user = await User.findOne({ authId: sub });
      
      if (!user){
        // create new account 
        var newUserName = await findUniqueUsername();
        
        var newUser = new User({
          authProvider: "apple",
          email: (data["email"] != null) ? data["email"] : null,
          authId: sub,
          username: newUserName,
        });

        const savedUser = await newUser.save();

        const accessToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });

        try {
          await User.findByIdAndUpdate(savedUser._id, { refreshToken: refreshToken });
        } catch (error) {
          console.error('Error updating refreshToken:', error);
        }

        bot.sendMessage("1979434110", "new apple user + 1" + username, { parse_mode: 'HTML' });
    
        return res.status(200).json({
          changed: false,
          username: newUserName,
          accessToken: accessToken,
          refreshToken: refreshToken
        });

      } else {

        const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
        
        if (user.usernameChanged){
          return res.status(200).json({
            changed: true,
            username: user.username,
            accessToken: accessToken,
            refreshToken: refreshToken
          });
        } else {
          return res.status(200).json({
            changed: false,
            username: user.username,
            accessToken: accessToken,
            refreshToken: refreshToken
          });
        }
      }

    }

    return res.json({id: data.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token});
    

  } catch (error) {
      console.error("Error verifying Apple token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// exports.appleCallbackGetAndroid = async function(req, res) {

//   const { token, code, clientType } = req.query;

//   console.log(token);
//   console.log(code);
//   console.log(clientType);

//   try {

//     if (!code) return res.sendStatus(500);

//     const clientSecret = appleSignin.getClientSecret({
//       clientID: process.env.cliendIDAndroid, 
//       teamId: process.env.teamId,
//       keyIdentifier: process.env.keyIdentifier, 
//       privateKeyPath: "/srv/quitnut-backend/authKey/AuthKey_8AM64B5P6U.p8"
//     });
//     console.log(clientSecret);
  
//     const tokens = await appleSignin.getAuthorizationToken(code, {
//       clientID: process.env.cliendIDAndroid,
//       clientSecret: clientSecret,
//       redirectUri: "https://quitnut.app/api/callback/apple"
//     });

//     console.log(tokens);

  
//     if (!tokens.id_token) return res.sendStatus(500);
//     console.log(tokens.id_token);
    
//     const data = await verifyIdToken(tokens.id_token);
    
//     if (data["sub"] != null){
//       // email + email_verified
//       var sub = data["sub"];

//       const user = await User.findOne({ authId: sub });
      
//       if (!user){
//         // create new account 
//         var newUserName = await findUniqueUsername();
        
//         var newUser = new User({
//           authProvider: "apple",
//           email: (data["email"] != null) ? data["email"] : null,
//           authId: sub,
//           username: newUserName,
//         });

//         const savedUser = await newUser.save();

//         const accessToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
//         const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });

//         try {
//           await User.findByIdAndUpdate(savedUser._id, { refreshToken: refreshToken });
//         } catch (error) {
//           console.error('Error updating refreshToken:', error);
//         }
    
//         return res.status(200).json({
//           changed: false,
//           username: newUserName,
//           accessToken: accessToken,
//           refreshToken: refreshToken
//         });

//       } else {

//         const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
//         const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
        
//         if (user.usernameChanged){
//           return res.status(200).json({
//             changed: true,
//             username: user.username,
//             accessToken: accessToken,
//             refreshToken: refreshToken
//           });
//         } else {
//           return res.status(200).json({
//             changed: false,
//             username: user.username,
//             accessToken: accessToken,
//             refreshToken: refreshToken
//           });
//         }
//       }

//     }

//     return res.json({id: data.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token});
    

//   } catch (error) {
//       console.error("Error verifying Apple token: ", error);
//       return res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

exports.appleCallbackPost = async function(req, res) {

  const code = req.body.code
  const id_token = req.body.id_token

  const queryString = querystring.stringify(req.body);

  const deepLink = `intent://callback?${queryString}#Intent;package=com.stopporn.quitaddiction;scheme=signinwithapple;end`;

  return res.redirect(deepLink);


  console.log(code);
  console.log(id_token);

  try {

    // if (!code) return res.sendStatus(500);

    // const clientSecret = appleSignin.getClientSecret({
    //   clientID: process.env.cliendID, 
    //   teamId: process.env.teamId,
    //   keyIdentifier: process.env.keyIdentifier, 
    //   privateKeyPath: "/srv/quitnut-backend/authKey/AuthKey_8AM64B5P6U.p8"
    // });
    // console.log(clientSecret);
  
    // const tokens = await appleSignin.getAuthorizationToken(code, {
    //   clientID: process.env.cliendID,
    //   clientSecret: clientSecret,
    //   redirectUri: "https://quitnut.app/api/callback/apple"
    // });

    // console.log(tokens);

  
    if (!id_token) return res.sendStatus(500);
    console.log(id_token);
    
    const data = await verifyIdToken(id_token);
    
    if (data["sub"] != null){
      // email + email_verified
      var sub = data["sub"];

      const user = await User.findOne({ authId: sub });
      
      if (!user){
        // create new account 
        var newUserName = await findUniqueUsername();
        
        var newUser = new User({
          authProvider: "apple",
          email: (data["email"] != null) ? data["email"] : null,
          authId: sub,
          username: newUserName,
        });

        const savedUser = await newUser.save();

        const accessToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });

        try {
          await User.findByIdAndUpdate(savedUser._id, { refreshToken: refreshToken });
        } catch (error) {
          console.error('Error updating refreshToken:', error);
        }

        const queryString = querystring.stringify({
          changed: false,
          username: newUserName,
          accessToken: accessToken,
          refreshToken: refreshToken
        });

        const deepLink = `intent://callback?${queryString}#Intent;package=com.stopporn.quitaddiction;scheme=signinwithapple;end`;
        
        return res.redirect(deepLink);
    
        // return res.status(200).json({
        //   changed: false,
        //   username: newUserName,
        //   accessToken: accessToken,
        //   refreshToken: refreshToken
        // });

      } else {

        const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
        
        if (user.usernameChanged){

          const queryString = querystring.stringify({
            changed: true,
            username: user.username,
            accessToken: accessToken,
            refreshToken: refreshToken
          });
  
          const deepLink = `intent://callback?${queryString}#Intent;package=com.stopporn.quitaddiction;scheme=signinwithapple;end`;
          
          return res.redirect(deepLink);

          // return res.status(200).json({
          //   changed: true,
          //   username: user.username,
          //   accessToken: accessToken,
          //   refreshToken: refreshToken
          // });
        } else {
          const queryString = querystring.stringify({
            changed: false,
            username: user.username,
            accessToken: accessToken,
            refreshToken: refreshToken
          });
  
          const deepLink = `intent://callback?${queryString}#Intent;package=com.stopporn.quitaddiction;scheme=signinwithapple;end`;
          
          return res.redirect(deepLink);
          // return res.status(200).json({
          //   changed: false,
          //   username: user.username,
          //   accessToken: accessToken,
          //   refreshToken: refreshToken
          // });
        }
      }

    }

    return res.json({id: data.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token});
    

  } catch (error) {
      console.error("Error verifying Apple token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


async function verifyGoogle(idToken, platform) {
  console.log(googleClient)

  const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: (platform === "android") ? process.env.GoogleID : process.env.IosID, 
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];
  return payload; // this includes user's information and can be used to check or create accounts
}

exports.googleRegistration = async function(req, res) {
  console.log("start");

  try {
    const { token, platform } = req.body;
    console.log(token);

    if (platform == null){
      platform = "android";
    }


    const data = await verifyGoogle(token, platform);
    if (data) {

      if (data["sub"] != null){
        var sub = data["sub"];

        const user = await User.findOne({ authId: sub });
        
        if (!user){
          // create new account 
          var newUserName = await findUniqueUsername();
          
          var newUser = new User({
            authProvider: "google",
            email: (data["email"] != null) ? data["email"] : null,
            email_verified: (data["email_verified"] != null) ? data["email_verified"] : false,
            authId: sub,
            name: (data["name"] != null) ? data["name"] : null,
            username: newUserName,
          });

          const savedUser = await newUser.save();

          const accessToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
          const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });

          try {
            await User.findByIdAndUpdate(savedUser._id, { refreshToken: refreshToken });
          } catch (error) {
            console.error('Error updating refreshToken:', error);
          }

          bot.sendMessage("1979434110", "new google user + 1" + newUserName, { parse_mode: 'HTML' });
      
          return res.status(200).json({
            changed: false,
            username: newUserName,
            accessToken: accessToken,
            refreshToken: refreshToken
          });

        } else {

          const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
          const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '180d' });
          
          if (user.usernameChanged){
            return res.status(200).json({
              changed: true,
              username: user.username,
              accessToken: accessToken,
              refreshToken: refreshToken
            });
          } else {
            return res.status(200).json({
              changed: false,
              username: user.username,
              accessToken: accessToken,
              refreshToken: refreshToken
            });
          }
        }


        return res.json({
          id: data.sub, 
          accessToken: tokens.access_token, 
          refreshToken: tokens.refresh_token
      });
        
      } else {
        return res.status(500).json({ status: 'error', message: 'no id' });
      }

      return res.json({ status: 'success', user: user });
    } else {
      return res.status(500).json({ status: 'error', message: 'Unauthorized' });
    }

    

  } catch (error) {
    console.error("Error verifying Apple token: ", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }

};