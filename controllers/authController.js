'use strict';

var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
User = mongoose.model('User');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const axios = require('axios');
const appleSignin = require("apple-signin");
const path = require("path");
const NodeRSA = require('node-rsa');
const request = require('request-promise-native');

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
    const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' });
    
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
  } catch (err) {
    res.status(400).send({
      message: err.message
    });
  }
};

async function performLogin(user, req, res) {

  const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223');
  const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' }); // Expires in 7 days

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
  const isLengthValid = username.length <= 30;

  return isValid && isLengthValid;
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
      if (find == null){
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
      
      if (payload["email"] == email){
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


const getApplePublicKey = async () => {
  const url = new URL('https://appleid.apple.com');
  url.pathname = '/auth/keys';

  const data = await request({ url: url.toString(), method: 'GET' });
  const key = JSON.parse(data).keys[0];


  const pubKey = new NodeRSA();
  pubKey.importKey({ n: Buffer.from(key.n, 'base64'), e: Buffer.from(key.e, 'base64') }, 'components-public');
  return pubKey.exportKey(['public']);
};

const verifyIdToken = async (idToken, clientID) => {
  const applePublicKey = await getApplePublicKey();
  console.log("Public");
  console.log(applePublicKey);
  console.log(idToken);
  const jwtClaims = jwt.verify(idToken, applePublicKey, { algorithms: 'RS256' });
  
  if (jwtClaims.iss !== 'https://appleid.apple.com') throw new Error('id token not issued by correct OpenID provider - expected: ' + 'https://appleid.apple.com' + ' | from: ' + jwtClaims.iss);
  if (clientID !== undefined && jwtClaims.aud !== clientID) throw new Error('aud parameter does not include this client - is: ' + jwtClaims.aud + '| expected: ' + clientID);
  if (jwtClaims.exp < (Date.now() / 1000)) throw new Error('id token has expired');

  return jwtClaims;
};

exports.appleCallback = async function(req, res) {
  try {

    if (!req.query.code) return res.sendStatus(500);
    console.log(req.query.code);


    const clientSecret = appleSignin.getClientSecret({
      clientID: process.env.cliendID, 
      teamId: process.env.teamId,
      keyIdentifier: process.env.keyIdentifier, 
      privateKeyPath: "/srv/quitnut-backend/authKey/AuthKey_8AM64B5P6U.p8"
    });
    console.log(clientSecret);
  
    const tokens = await appleSignin.getAuthorizationToken(req.query.code, {
      clientID: process.env.cliendID,
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
      

      const user = await User.findOne({ authProvider: sub });


      
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
        const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' });


        try {
          await User.findByIdAndUpdate(savedUser._id, { refreshToken: refreshToken });
        } catch (error) {
          console.error('Error updating refreshToken:', error);
        }
    
        return res.status(200).json({
          changed: false,
          username: newUserName,
          accessToken: accessToken,
          refreshToken: refreshToken
        });

      } else {

        const accessToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', { expiresIn: '30d' });
        const refreshToken = jwt.sign({ _id: savedUser._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' });
        
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

      
      if (data["email"] != null){
        // email = data["email"];
      }
    
    }
  

    // 1. get sub (USER ID)
    // 2. check in DB?
    // 3. if exits -> get 
    // 4. return tokens

    // 3. if not exists -> create
    // 4. return tokens




  
    res.json({id: data.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token});
    

  } catch (error) {
      console.error("Error verifying Apple token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};