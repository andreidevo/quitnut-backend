'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var NewsletterSchema = new Schema({
  id: { type: String },
  email: { type: String }
});

const Newsletter = mongoose.model('Newsletter', NewsletterSchema, "newsletter");

module.exports = Newsletter;