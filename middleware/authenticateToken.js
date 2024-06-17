const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {


  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(401);
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.log("not ok token");
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("not ok token: " + err);
      return res.sendStatus(403); 
    }
    req.user = decoded;
    next();
  });
};

module.exports = {
  verifyJWT,
};

