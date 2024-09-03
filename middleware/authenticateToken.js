
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
    const jwtOk = req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    console.log(jwtOk);

    if (jwtOk){
      req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    } else {
      const result = await refreshUserTokens(req.user._id);
      if (result.status === 200) {
          req.headers.authorization = `Bearer ${result.accessToken}`;  // Optionally set new access token in headers
          req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    
          console.log("DONE");
          next();
      } else {
          res.status(result.status).json({ message: result.error });
      }
    }
  
    next();
  } catch (err) {
    console.log(err);
    if (err.name === 'TokenExpiredError' && req.user && req.user._id) {
      console.log(err.name);

      const result = await refreshUserTokens(req.user._id);
      if (result.status === 200) {
          req.headers.authorization = `Bearer ${result.accessToken}`;  // Optionally set new access token in headers
          req.user = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    
          console.log("DONE");
          next();
      } else {
          res.status(result.status).json({ message: result.error });
      }
    } else {
        res.sendStatus(403);
    }
  }
}

module.exports = {
  verifyJWT,
};

