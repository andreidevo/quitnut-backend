'use strict';

const start = require('./cluster/index.js')
const dotenv = require('dotenv');
var express = require('express'),
app = express(),
port = process.env.PORT || 5001,
User = require('./models/User'),
Team = require('./models/Team'),
Report = require('./models/Report'),
// Resource = require('./models/Content'),
bodyParser = require('body-parser'),
jsonwebtoken = require("jsonwebtoken");
const mongoose = require('mongoose');
const helmet = require('helmet');
var https = require("https");
const cors = require('cors');
const punycode = require('punycode/');
const cookieParser = require('cookie-parser');
var multer = require("multer");
var upload = multer();


dotenv.config({ path: '.env' });


if (process.env.NODE_ENV === 'production') {
  console.log("Config ok");
  dotenv.config({ path: '.env.production' });
} else {
  console.log("Config dev");
  dotenv.config({ path: '.env.development' });
}

app.set('trust proxy', 2);
// SECURITY
app.use(helmet())
app.disable('x-powered-by')

function originIsAllowed(origin) {
  return true;
}

function detailedLogRequests(req, res, next) {
  console.log(`${req.method} ${req.originalUrl} - Query: ${JSON.stringify(req.query)} - Body: ${JSON.stringify(req.body)} - IP: ${req.ip}`);
  console.log(`${req.method} ${req.originalUrl} - Query: ${req.query} - Body: ${req.body} - IP: ${req.ip}`);
  console.log(`${req}`);
  console.log(`${req.body}`);
  console.log(`${req.body.name}`);
  console.log(`${req.body.bucket_name}`);

  next();
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
// app.use(upload.array());

app.use(detailedLogRequests);

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

const isMultiThreading = false; // При false - будет работать в однопоточном режиме. При true - в многопоточном

start(isMultiThreading, () => {
  app.listen(port, async () => {
    try {
      await mongoose.connect(process.env.DB_URI);
      console.log('MongoDB Connected');
    } catch (err) {
      console.error('Failed to connect to MongoDB', err);
    }
  });
  })

module.exports = app;


