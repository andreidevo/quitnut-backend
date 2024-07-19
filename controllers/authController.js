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
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    // console.log("start search")
    const existingUser = await User.findOne({ _id: decoded._id });
    // console.log("end search")


    if (!existingUser) {
      return res.status(403).json({ message: 'Invalid JWT' });
    }

    const newAccessToken = jwt.sign({ _id: decoded._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

exports.appleCallback = async function(req, res) {
  try {


    if (!req.query.code) return res.sendStatus(500);

    // console.log(req.body);

    // const { code, id_token } = req.body;

    console.log(req.query.code);
    
    const clientSecret = appleSignin.getClientSecret({
      clientID: "com.alphalab.quitx.service",
      teamId: "U63UN3D8HG",
      keyIdentifier: "8AM64B5P6U", 
      privateKeyPath: path.join(__dirname, "../AuthKey_8AM64B5P6U.p8")
    });
    console.log(clientSecret);
  
    const tokens = await appleSignin.getAuthorizationToken(req.query.code, {
      clientID: "com.alphalab.quitx.service",
      clientSecret: clientSecret,
      redirectUri: "https://quitnut.app/api/callback/apple"
    });

    console.log(tokens);

  
    if (!tokens.id_token) return res.sendStatus(500);

    console.log(tokens.id_token);
    
    const data = await appleSignin.verifyIdToken(tokens.id_token);

    console.log(data);
  
    res.json({id: data.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token});

    // try {
    //   const applePublicKey = await axios.get(`https://appleid.apple.com/auth/keys`);
    //   const decoded = jwt.verify(id_token, applePublicKey.data, { algorithms: ['RS256'] });
  
    //   // Code to handle user authentication and retrieval using the decoded information
    //   console.log(decoded);


    //   // res.redirect('/');
    //   return res.status(200).json({ success: true });
    // } catch (error) {
    //   console.error('Error:', error.message);
    //   return res.status(500).json({ success: false});
    // }

  } catch (error) {
      console.error("Error verifying Apple token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};