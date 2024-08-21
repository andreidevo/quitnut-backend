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

const tgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000 / 2, // 30 minutes
  max: 50, // limit each IP to 5 create account requests per windowMs
  message:  "Too many accounts created from this IP, please try again after an hour",
  legacyHeaders: false
});

// const IDlimiter = rateLimit({
//   store: new RedisStore({
//       client: redisClient,
//       keyPrefix: 'rateLimit:',
//       expiry: 60 * 15, // 15 minutes
//   }),
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 3, // Limit each instance ID to 100 requests per windowMs
//   keyGenerator: (req, res) => req.instanceId, // Use Instance-ID as the key
//   handler: (req, res, /*next*/) => {
//       res.status(429).send('Too Many Requests');
//   }
// });


module.exports = {
  signUpLimiter, newsletterLimiter, tgLimiter
};