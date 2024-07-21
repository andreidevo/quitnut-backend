'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var TeamSchema = new Schema({

  ownerID: { type: String, required: true},
  publicname: { type: String, unique: true, required: true, lowercase: true},
  typeTeam: { type: String, required: true}, // private / public
  created: { type: Date, default: Date.now },
  priority: { type: Number},
  dontaccept: { type: Boolean, default: false },

  metadata: {
    officialUrl: { type: String},
    imageUrl: { type: String},
    description: { type: String},
    title: { type: String},
  },

  members: [
    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ],

  challenges: [
    { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
  ],

  reportCounts: { type: Number, default: 0}

});


const Team = mongoose.model('Team', TeamSchema, "teams");

module.exports = Team;
