'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var BannedSchema = new Schema({
  email: { type: String, default: "" },
  reason: { type: String, default: ""},
  created: { type: Date, default: Date.now },
});


const Banned = mongoose.model('Banned', BannedSchema, "banned");

module.exports = Banned;
