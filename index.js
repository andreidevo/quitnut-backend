'use strict';

const dotenv = require('dotenv');
var express = require('express'),
app = express(),
port = process.env.PORT || 5000,
User = require('./models/User'),
Resource = require('./models/Content'),
bodyParser = require('body-parser'),
jsonwebtoken = require("jsonwebtoken");
const mongoose = require('mongoose');
const helmet = require('helmet');
var https = require("https");
const cors = require('cors');
const cookieParser = require('cookie-parser');

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
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


app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./api/routes');
routes(app);

app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!")
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

console.log('API server started on: ' + port);

module.exports = app;




// const express = require('express');
// const { createProxyMiddleware } = require('http-proxy-middleware');

// const app = express();

// // Your Express.js API routes
// app.get('/api/hello', (req, res) => {
//   res.json({ message: 'Responding from Express.js API!' });
// });

// // Exclude '/api' routes from being proxied to Next.js
// // Proxy all other requests to the Next.js app
// app.use(
//   '/',
//   createProxyMiddleware((pathname, req) => !pathname.match('^/api'), {
//     target: 'http://localhost:3001', // Assuming Next.js runs on port 3001
//     changeOrigin: true,
//     pathRewrite: {
//       '^/api/': '/', // Optional: rewrite path if needed
//     },
//   })
// );

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Express server listening on port ${port}`);
// });
