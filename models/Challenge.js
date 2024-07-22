'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var ChallengeSchema = new Schema({

  ownerID: { type: Schema.Types.ObjectId, ref: 'User' },
  created: { type: Date, default: Date.now },
  priority: { type: Number, lowercase: true},

  metadata: {
    officialUrl: { type: String},
    imageUrl: { type: String},
    description: { type: String},
    title: { type: String},
  },

});


const Challenge = mongoose.model('Challenge', ChallengeSchema, "challenges");

module.exports = Challenge;
