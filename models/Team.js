'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

const teamMemberSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true }
});


teamMemberSchema.index({ rank: 1 });

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

  members: [teamMemberSchema],

  challenges: [
    { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
  ],

  reportCounts: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true }
  }]

});


const Team = mongoose.model('Team', TeamSchema, "teams");

module.exports = Team;
