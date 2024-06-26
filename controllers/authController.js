'use strict';

var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
User = mongoose.model('User');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const Newsletter = require('../models/Newsletter');


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

    const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223');
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
      const checkBox = req.body.checkedBox;

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
            newsletter: checkBox
          });

          await newUser.save();
          existingUser = newUser;
        }
        
        const accessToken = jwt.sign({ email: email, _id: existingUser._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223', {expiresIn: "7d"});
        
        const expiresIn = 30 * 24 * 60 * 60 * 1000;
        // const expiresIn = 1000 * 10;
        const accessTokenExpiry = Date.now() + expiresIn;

        const sub_status = existingUser.subscription.status
        var premium = (sub_status === "paid") ? true : false;

        // get a user from db?

        return res.json({ 
          success: true, 
          accessToken: accessToken, 
          accessTokenExpiry: accessTokenExpiry, 
          // premium: premium, 
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

exports.newsletter = async function(req, res) {
  try {
      const email = req.body.email;
      
      const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  
      if (emailRegex.test(email)) {
        console.log(email);
        const exists = await Newsletter.findOne({ email: email });
        console.log(exists);
        
        if (!exists) {
          const subscriber = new Newsletter({
            email: email
          });
          console.log("added");
          
          await subscriber.save();
          return res.json({ 
            success: true
          });
        } else {
          // If exists, do nothing
          res.status(409).send('Subscriber already exists.');
        }


      } else {
        return res.status(400).json({ success: false, message: "Emails not match"});
      }
  } catch (error) {
      console.error("Error verifying Google token: ", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.set_data = async function(req, res) {
  const id = req.user._id;
  const checkboxValue = req.body.checkbox

  const user = await User.findById(id);
  
  if (!user){
    return res.status(401).send(false);
  }

  user.newsletter = String(checkboxValue);
  await user.save();

  return res.status(200).send(true);
};

// exports.googleRedirect = async function(req, res) {
//   const client = new OAuth2Client(
//     process.env.GOOGLE_CLIENT_ID,
//     process.env.GOOGLE_CLIENT_SECRET,
//     process.env.GOOGLE_REDIRECT_URI
//   );

//   try {
//     const {tokens} = await client.getToken(req.query.code);
//     client.setCredentials(tokens);
  
//     const oauth2Client = google.oauth2({
//       auth: client,
//       version: 'v2'
//     });

//     const userInfo = await oauth2Client.userinfo.get();

//     const userEmail = userInfo.data.email;
//     const userName = userInfo.data.name;

//     const user = await User.findOne({ email: userEmail });

//     if (user){
//       const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223');
//       const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' });

//       await updateRefreshTokenInDatabase(user._id, refreshToken);

//       res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: 'strict' });
//       res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict'});

//       res.redirect('http://localhost:3000/studies');
//     } else {
//       var newUser = new User({
//         email: userEmail,
//         name: userName,
//         authProvider: "google"
//       });

//       const user = await newUser.save();
//       const accessToken = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET || 'super-secret-tokenasd2223');
//       const refreshToken = jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET || 'super-secret-tokenasd2223', { expiresIn: '60d' });
      
//       await updateRefreshTokenInDatabase(user._id, refreshToken);

//       res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: 'strict' });
//       res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict'});
//       res.redirect('http://localhost:3000/studies');

//       // res.json({
//       //   accessToken: accessToken,
//       //   refreshToken: refreshToken,
//       // });
//     }

//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error}' + error });
//   }
// };