const jwt = require('jsonwebtoken');
User = mongoose.model('User');

const verifyJWT = (req, res, next) => {


  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(401);
  }

  // console.log("AUTH ");
  // console.log(authHeader);

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.log("not ok token");
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super-secret-tokenasd2223', async  (err, decoded) => {
    if (err) {
      console.log("not ok token: " + err);
      return res.sendStatus(403); 
    }
    req.user = decoded;

    if (req.user && req.user._id) {  // Assuming `req.user` is populated from authentication middleware
        try {
          await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
          next();  // Continue to the next middleware or request handler
        } catch (error) {
          console.error('Failed to update last active time:', error);
          next();  // Continue processing even if the update fails
        }
    } else {
      next();  // If no user is found in request, just continue
    }
  });
};

module.exports = {
  verifyJWT,
};

