'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var ReportSchema = new Schema({
  ownerID: { type: String, default: "" },
  data: { type: String, default: ""},
  created: { type: Date, default: Date.now },
  uuid: { type: String, default: "" },
});


const Report = mongoose.model('Report', ReportSchema, "report");

module.exports = Report;
