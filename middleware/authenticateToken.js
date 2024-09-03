
var mongoose = require('mongoose'),
User = mongoose.model('User');

const jwt = require('jsonwebtoken');
const { refreshUserTokens } = require('../controllers/authController');


async function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.sendStatus(401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
      return res.sendStatus(401);
  }

  try {
    console.log("CHECK TOKEN");
    var jtwOk = false;

    try {
      jtwOk = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e){ }

    console.log(jtwOk);

    if (jtwOk){
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } else {
      req.user = jwt.verify(token, "super-secret-tokenasd2223");
      console.log(req.user);

      const result = await refreshUserTokens(req.user._id);

      // console.log(result);

      if (result.status === 200) {
          req.headers.authorization = `Bearer ${result.accessToken}`;  // Optionally set new access token in headers
          req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
          req.newAccessToken = result.accessToken;
          console.log("DONE");
      } else {
          console.log("MMM");
          res.status(result.status).json({ message: result.error });
      }
    }
  
    next();
  } catch (err) {
    console.log(err);
    console.log("MMM2");

    if (err.name === 'TokenExpiredError' && req.user && req.user._id) {
      console.log(err.name);

      const result = await refreshUserTokens(req.user._id);
      console.log(result);
      if (result.status === 200) {
          req.headers.authorization = `Bearer ${result.accessToken}`;  // Optionally set new access token in headers
          req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    
          console.log("DONE");
          next();
      } else {
          console.log("NOPE");

          res.status(result.status).json({ message: result.error });
      }
    } else {
        console.log("NOPE2");
        res.sendStatus(403);
    }
  }
}

function appendNewToken(req, res, next) {
  if (req.newAccessToken) {
      console.log("ADD TOKEN");
      console.log(req.newAccessToken)
      // Modify the response to include the new token

      try {
        console.log("here");
        const originalJson = res.json;

        res.json = function (data) {
          console.log("wtf");
          console.log(typeof data);
          console.log(data);

          console.log("1");
          console.log(req.newAccessToken);
          
          if (req.newAccessToken && typeof data === 'object' && data !== null) {
            console.log("wtf2222awfaefaef2");
              data.newAccessToken = res.newAccessToken;  // Append new token
              console.log("wtf22222");
              console.log("Modified data with newAccessToken:", data);

          }
          originalJson.call(this, data);


        };
      } catch (error) {
        console.log("error");
        console.log(error);
      }

      
      // const originalSend = res.send;
      // res.send = function (body) {
      //     console.log(typeof body);
      //     console.log(body);
      //     if (typeof body === 'object') {
      //         body.newAccessToken = req.newAccessToken; // Append new token to the response body
      //     }
      //     return originalSend.call(this, body);
      // }
  }
  next();
}

module.exports = {
  verifyJWT,
  appendNewToken
};

