'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var ResourceSchema = new Schema({
  image: { type: String },
  title: { type: String },
  formats: [
    { type: { type: String }, url: { type: String }}
  ],
  tags: { type: String },
  free: { type: Boolean }
});

const Resource = mongoose.model('Resource', ResourceSchema, "resources");

module.exports = Resource;