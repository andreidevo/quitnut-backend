'use strict';

const dotenv = require('dotenv');
var express = require('express'),
app = express(),
port = process.env.PORT || 5001,
User = require('./models/User'),
// Resource = require('./models/Content'),
bodyParser = require('body-parser'),
jsonwebtoken = require("jsonwebtoken");
const mongoose = require('mongoose');
const helmet = require('helmet');
var https = require("https");
const cors = require('cors');
const punycode = require('punycode/');
const cookieParser = require('cookie-parser');

dotenv.config({ path: '.env' });


if (process.env.NODE_ENV === 'production') {
  console.log("Config ok");
  dotenv.config({ path: '.env.production' });
} else {
  console.log("Config dev");
  dotenv.config({ path: '.env.development' });
}



(async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('MongoDB Connected');
    
    // Start the server inside the try block or after it to ensure DB is connected
    app.listen(port, () => {
      console.log(`API server started on: ${port}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
})();

app.set('trust proxy', 2);

// SECURITY
app.use(helmet())
app.disable('x-powered-by')


function originIsAllowed(origin) {
  return true;
}

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Allow all origins or use a specific logic to validate the origin
    if (!origin || originIsAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use((req, res, next) => {
  const instanceId = req.headers['instance-id'];
  req.instanceId = instanceId; // Attach instance ID to the request object
  next();
});

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./api/routes');
routes(app);

app.use((req, res, next) => {
  // console.log(res);
  res.status(404).send("Sorry can't find that!")
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

console.log('API server started on: ' + port);
console.log(process.env.NODE_ENV);

module.exports = app;


