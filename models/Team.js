'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

const teamMemberSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true }
});

const statusThresholdSchema = new Schema({
  statusName: { type: String, required: true },  // e.g., "Golden", "Diamond"
  minStreakDays: { type: Number, required: true },  // Minimum streak days to achieve the status
  maxRecipients: { type: Number, required: true }  // Maximum number of users who can hold this status
});

teamMemberSchema.index({ rank: 1 });

var TeamSchema = new Schema({

  ownerID: { type: Schema.Types.ObjectId, ref: 'User' },
  publicname: { type: String, unique: true, required: true},
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

  imageUploadCount: { type: Number, default: 0 },
  imageLastUploadDate: { type: Date },

  members: [teamMemberSchema],
  membersCount: { type: Number,  default: 0},

  statuses: {
    type: [statusThresholdSchema],
    default: [
      { statusName: 'Bronze', minStreakDays: 1, maxRecipients: 50 },
      { statusName: 'Silver', minStreakDays: 3, maxRecipients: 30 },
      { statusName: 'Golden', minStreakDays: 7, maxRecipients: 20 },
      { statusName: 'Diamond', minStreakDays: 14, maxRecipients: 10 },
      { statusName: 'Legendary', minStreakDays: 30, maxRecipients: 2 }
    ]
  },

  challenges: [
    { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
  ],

  reportCounts: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true }
  }],

});

TeamSchema.index({ membersCount: 1 });

const Team = mongoose.model('Team', TeamSchema, "teams");

module.exports = Team;
