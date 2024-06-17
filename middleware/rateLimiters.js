const rateLimit = require('express-rate-limit');

const signUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 7, // limit each IP to 5 create account requests per windowMs
  message:  "Too many accounts created from this IP, please try again after an hour",
  legacyHeaders: false
});


const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 6, // limit each IP to 5 create account requests per windowMs
  message:
    "Too many requests sent from this IP, please try again after an hour"
});


module.exports = {
  signUpLimiter, newsletterLimiter
};