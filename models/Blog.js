'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var BlogSchema = new Schema({
  id: { type: String },
  topic: { type: String },
  content: { type: mongoose.Schema.Types.Mixed },
});

const Blog = mongoose.model('Blog', BlogSchema, "blog");

module.exports = Blog;