
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

    console.log(token);
    console.log(process.env.JWT_SECRET);


    if (jtwOk){
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } else {
      req.user = jwt.verify(token, "super-secret-tokenasd2223");
      console.log(req.user);

      const result = await refreshUserTokens(req.user._id);

      console.log("result ok");
      console.log(result.status);

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
    console.log("MMM2");
    console.log(err.name);
    if (err.name === 'TokenExpiredError') {
      console.log("MMM3");

      const decoded = jwt.decode(token);
      console.log(decoded);

      if (decoded && decoded._id) {
          // Now attempt to refresh the token using the user's ID
          const result = await refreshUserTokens(decoded._id);
          if (result.status === 200) {
              // Set the new token in the request header and user object
              req.headers.authorization = `Bearer ${result.accessToken}`;
              req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
              req.newAccessToken = result.accessToken; // Optionally pass new token back in response
              next();
          } else {
              res.status(result.status).json({ message: result.error });
          }
      } else {
          res.status(403).send('Invalid token, unable to refresh');
      }
    } else {
      // For other errors, send a generic 403 response
      res.status(403).send('Invalid token');
    }
    console.log(err);
    console.log("MMM2");

    // console.log(req.user);
    // console.log(req.user._id);

    // if (err.name === 'TokenExpiredError' && req.user && req.user._id) {
    //   console.log(err.name);

    //   const result = await refreshUserTokens(req.user._id);
    //   console.log(result);
    //   if (result.status === 200) {
    //       req.headers.authorization = `Bearer ${result.accessToken}`;  // Optionally set new access token in headers
    //       req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    
    //       console.log("DONE");
    //       next();
    //   } else {
    //       console.log("NOPE");

    //       res.status(result.status).json({ message: result.error });
    //   }
    // } else {
    //     console.log("NOPE2");
    //     res.sendStatus(403);
    // }
  }
}

function appendNewToken(req, res, next) {
  if (req.newAccessToken || req.user._id) {
      try {
        console.log("here");
        const originalJson = res.json;

        res.json = function (data) {
          console.log("check data");
          // console.log(typeof data);
          // console.log(data);
          
          if (req.newAccessToken && typeof data === 'object' && data !== null) {
              data.newAccessToken = req.newAccessToken;  // Append new token
          }

          if (req.user._id !== undefined){
            data.userId = req.user._id;
          }

          originalJson.call(this, data);
        };
      } catch (error) {
        console.log("error");
        console.log(error);
      }
  }
  next();
}

async function checkUserBan(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).send('User not authenticated');
  }

  try {
      // Assuming a function or method to find the user by ID
      const userId = req.user._id;
      const find = await User.findById(userId); // Replace UserModel with your actual user model

      if (!find) {
        return res.status(404).send('User not found');
      }

      console.log(find);

      // Check if the user is banned
      if (find.banned !== undefined && find.banned.status === true) {
        return res.status(500).json({
          message: find.banned.reason,
          info: 'Access restricted'
        });
      }

      next();
  } catch (error) {
      console.error('Error checking user ban status:', error);
      return res.status(500).send('Internal server error');
  }
}

module.exports = {
  verifyJWT,
  appendNewToken,
  checkUserBan
};

